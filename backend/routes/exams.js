const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Notification = require('../models/Notification');
const User = require('../models/User');
const requireAuth = require('../utils/requireAuth');

const router = express.Router();

const generateUniqueExamKey = async () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = crypto.randomBytes(3).toString('hex').toUpperCase();
    const existing = await Exam.findOne({ examKey: candidate }).select('_id');
    if (!existing) return candidate;
  }

  throw new Error('Could not generate a unique exam key');
};

const {
  normalizeText,
  normalizeArrayValues,
  sanitizeQuestionType,
  normalizeQuestion,
  validateQuestions,
  parseAllowedStudentIds,
  buildAudiencePayload,
  hasAudienceRestrictions,
  isAudienceMatch,
  isPublishedExam,
  canTeacherManageExam,
  canStudentAccessExam,
  getStudentQuestionSet,
} = require('../utils/examHelpers');

const buildExamResponse = (exam) => ({
  _id: exam._id,
  title: exam.title,
  subject: exam.subject,
  description: exam.description,
  instructions: exam.instructions || '',
  duration: exam.duration,
  passingMarks: exam.passingMarks || 0,
  startTime: exam.startTime,
  endTime: exam.endTime,
  examKey: exam.examKey,
  totalMarks: exam.totalMarks,
  isActive: exam.isActive,
  status: exam.status || (exam.isActive ? 'published' : 'draft'),
  publishedAt: exam.publishedAt || null,
  allowedColleges: exam.allowedColleges || [],
  allowedBranches: exam.allowedBranches || [],
  allowedSections: exam.allowedSections || [],
  allowedStudents: exam.allowedStudents || [],
  participantCount: exam.participantCount || 0,
  averageScore: exam.averageScore || 0,
  createdAt: exam.createdAt,
  updatedAt: exam.updatedAt,
});

const notifyStudents = async ({ title, message, type = 'exam', metadata = {}, targetExam = null }) => {
  const students = await User.find({ role: 'student' }).select('_id');
  if (students.length === 0) return;

  let filteredStudents = students;
  if (targetExam) {
    const detailedStudents = await User.find({ role: 'student' }).select('_id college branch section className department');
    filteredStudents = detailedStudents.filter((student) => isAudienceMatch(targetExam, student));
  }

  if (filteredStudents.length === 0) return;

  const notifications = filteredStudents.map((student) => ({
    user: student._id,
    title,
    message,
    type,
    metadata,
  }));

  await Notification.insertMany(notifications);
};

const attachStats = async (examDocs) => {
  const examIds = examDocs.map((exam) => exam._id);
  const results = await Result.find({ exam: { $in: examIds } }).select('exam percentage student');

  const statsMap = new Map();
  for (const exam of examDocs) {
    statsMap.set(String(exam._id), { participantCount: 0, averageScore: 0 });
  }

  for (const result of results) {
    const key = String(result.exam);
    const current = statsMap.get(key) || { participantCount: 0, averageScore: 0 };
    current.participantCount += 1;
    current.averageScore += Number(result.percentage || 0);
    statsMap.set(key, current);
  }

  return examDocs.map((exam) => {
    const stats = statsMap.get(String(exam._id)) || { participantCount: 0, averageScore: 0 };
    const averageScore = stats.participantCount > 0 ? stats.averageScore / stats.participantCount : 0;
    return {
      ...buildExamResponse(exam),
      participantCount: stats.participantCount,
      averageScore: Number(averageScore.toFixed(2)),
    };
  });
};

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create exams' });
    }

    const {
      title,
      subject,
      description,
      instructions,
      duration,
      passingMarks,
      startTime,
      endTime,
      questions,
      status,
      allowedColleges,
      allowedBranches,
      allowedSections,
      allowedStudents,
    } = req.body;

    const nextStatus = normalizeText(status) === 'published' ? 'published' : 'draft';

    // If publishing, require full exam fields and validate questions.
    if (nextStatus === 'published') {
      if (!title || !subject || !duration || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required exam fields' });
      }

      const questionError = validateQuestions(questions);
      if (questionError) {
        return res.status(400).json({ message: questionError });
      }
    }

    let start = null;
    let end = null;
    if (startTime || endTime) {
      start = new Date(startTime);
      end = new Date(endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        return res.status(400).json({ message: 'Invalid exam start/end time' });
      }
    }

    const normalizedQuestions = Array.isArray(questions) ? questions.map((question) => normalizeQuestion(question)) : [];
    const totalMarks = normalizedQuestions.reduce((sum, question) => sum + Number(question.marks || 1), 0);
    const examKey = await generateUniqueExamKey();
    // Support simple audienceMode flags: 'college'|'branch'|'section'|'individual' or explicit arrays
    let finalAllowedColleges = allowedColleges;
    let finalAllowedBranches = allowedBranches;
    let finalAllowedSections = allowedSections;
    let finalAllowedStudents = allowedStudents;

    const mode = String(req.body.audienceMode || '').trim();
    if (mode === 'college') {
      finalAllowedColleges = [String(req.user.college || '')].filter(Boolean);
      finalAllowedBranches = [];
      finalAllowedSections = [];
      finalAllowedStudents = [];
    } else if (mode === 'branch') {
      finalAllowedBranches = [String(req.user.branch || req.user.department || '')].filter(Boolean);
      finalAllowedColleges = [String(req.user.college || '')].filter(Boolean);
      finalAllowedSections = [];
      finalAllowedStudents = [];
    } else if (mode === 'section') {
      const sectionVal = String(req.body.section || req.user.section || req.user.className || '');
      finalAllowedSections = [sectionVal].filter(Boolean);
      finalAllowedBranches = [String(req.user.branch || req.user.department || '')].filter(Boolean);
      finalAllowedColleges = [String(req.user.college || '')].filter(Boolean);
      finalAllowedStudents = [];
    }

    const audience = buildAudiencePayload({ allowedColleges: finalAllowedColleges, allowedBranches: finalAllowedBranches, allowedSections: finalAllowedSections, allowedStudents: finalAllowedStudents });

    if (nextStatus === 'published' && audience.allowedStudents.length === 0) {
      return res.status(400).json({ message: 'Assign at least one student before publishing exam' });
    }

    const exam = await Exam.create({
      title: String(title).trim(),
      subject: String(subject).trim(),
      description: String(description || '').trim(),
      instructions: String(instructions || '').trim(),
      duration: Number(duration),
      passingMarks: Number(passingMarks || 0),
      startTime: start,
      endTime: end,
      teacher: req.userId,
      examKey,
      questions: normalizedQuestions,
      totalMarks,
      isActive: true,
      status: nextStatus,
      publishedAt: nextStatus === 'published' ? new Date() : null,
      ...audience,
    });

    if (nextStatus === 'published') {
      await notifyStudents({
        title: 'New exam available',
        message: `${req.user?.name || 'A teacher'} published a new exam: ${exam.title}`,
        type: 'exam',
        metadata: { examId: exam._id, examKey: exam.examKey },
        targetExam: exam,
      });
    }

    return res.status(201).json({
      message: nextStatus === 'published' ? 'Exam published successfully' : 'Exam saved as draft',
      exam: buildExamResponse(exam),
    });
  } catch (error) {
    console.error('Create exam error:', error);
    return res.status(500).json({ message: 'Failed to create exam' });
  }
});

router.put('/:examId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can update exams' });

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (!canTeacherManageExam(exam, req.userId)) return res.status(403).json({ message: 'You are not allowed to edit this exam' });

    const {
      title,
      subject,
      description,
      instructions,
      duration,
      passingMarks,
      startTime,
      endTime,
      questions,
      status,
      allowedColleges,
      allowedBranches,
      allowedSections,
      allowedStudents,
    } = req.body;

    const nextStatus = normalizeText(status) === 'published' ? 'published' : 'draft';

    // If publishing, require full fields and valid questions
    if (nextStatus === 'published') {
      if (!title || !subject || !duration || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required exam fields for publishing' });
      }
      const questionError = validateQuestions(questions);
      if (questionError) return res.status(400).json({ message: questionError });
    }

    // Update fields if provided
    if (title !== undefined) exam.title = String(title || '').trim();
    if (subject !== undefined) exam.subject = String(subject || '').trim();
    if (description !== undefined) exam.description = String(description || '').trim();
    if (instructions !== undefined) exam.instructions = String(instructions || '').trim();
    if (duration !== undefined) exam.duration = Number(duration);
    if (passingMarks !== undefined) exam.passingMarks = Number(passingMarks || 0);
    if (startTime) exam.startTime = new Date(startTime);
    if (endTime) exam.endTime = new Date(endTime);

    if (Array.isArray(questions)) {
      exam.questions = questions.map((q) => normalizeQuestion(q));
      exam.totalMarks = exam.questions.reduce((s, q) => s + Number(q.marks || 1), 0);
    }

    // audience mode handling
    let finalAllowedColleges = allowedColleges;
    let finalAllowedBranches = allowedBranches;
    let finalAllowedSections = allowedSections;
    let finalAllowedStudents = allowedStudents;
    const mode = String(req.body.audienceMode || '').trim();
    if (mode === 'college') {
      finalAllowedColleges = [String(req.user.college || '')].filter(Boolean);
      finalAllowedBranches = [];
      finalAllowedSections = [];
      finalAllowedStudents = [];
    } else if (mode === 'branch') {
      finalAllowedBranches = [String(req.user.branch || req.user.department || '')].filter(Boolean);
      finalAllowedColleges = [String(req.user.college || '')].filter(Boolean);
      finalAllowedSections = [];
      finalAllowedStudents = [];
    } else if (mode === 'section') {
      const sectionVal = String(req.body.section || req.user.section || req.user.className || '');
      finalAllowedSections = [sectionVal].filter(Boolean);
      finalAllowedBranches = [String(req.user.branch || req.user.department || '')].filter(Boolean);
      finalAllowedColleges = [String(req.user.college || '')].filter(Boolean);
      finalAllowedStudents = [];
    }

    const audience = buildAudiencePayload({ allowedColleges: finalAllowedColleges, allowedBranches: finalAllowedBranches, allowedSections: finalAllowedSections, allowedStudents: finalAllowedStudents });
    exam.allowedColleges = audience.allowedColleges;
    exam.allowedBranches = audience.allowedBranches;
    exam.allowedSections = audience.allowedSections;
    exam.allowedStudents = audience.allowedStudents;

    if (nextStatus === 'published' && exam.allowedStudents.length === 0) {
      return res.status(400).json({ message: 'Assign at least one student before publishing exam' });
    }

    // status / publish handling
    if (exam.status !== 'published' && nextStatus === 'published') {
      exam.status = 'published';
      exam.isActive = true;
      exam.publishedAt = new Date();
      // notify students about newly published exam
      await notifyStudents({
        title: 'New exam available',
        message: `${req.user?.name || 'A teacher'} published exam: ${exam.title}`,
        type: 'exam',
        metadata: { examId: exam._id, examKey: exam.examKey },
        targetExam: exam,
      });
    } else {
      exam.status = nextStatus;
      if (nextStatus !== 'published') exam.publishedAt = null;
    }

    await exam.save();
    return res.json({ message: 'Exam updated', exam: buildExamResponse(exam) });
  } catch (error) {
    console.error('Update exam error:', error);
    return res.status(500).json({ message: 'Failed to update exam' });
  }
});

router.get('/teacher', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access teacher exams' });
    }

    const exams = await Exam.find({ teacher: req.userId }).sort({ createdAt: -1 });
    const examsWithStats = await attachStats(exams);

    const totalStudents = await User.countDocuments({
      role: 'student',
      college: req.user.college,
      branch: req.user.branch,
    });

    const totalAttempts = examsWithStats.reduce((sum, exam) => sum + Number(exam.participantCount || 0), 0);
    const scoredExams = examsWithStats.filter((exam) => Number(exam.participantCount || 0) > 0);
    const averageScore = scoredExams.length > 0
      ? scoredExams.reduce((sum, exam) => sum + Number(exam.averageScore || 0), 0) / scoredExams.length
      : 0;

    return res.json({
      exams: examsWithStats,
      stats: {
        totalStudents,
        totalAttempts,
        averageScore: Number(averageScore.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Teacher exams error:', error);
    return res.status(500).json({ message: 'Failed to fetch teacher exams' });
  }
});

router.get('/teacher/drafts', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access drafts' });
    }

    const drafts = await Exam.find({
      teacher: req.userId,
      $or: [{ status: 'draft' }, { status: { $exists: false } }],
    }).sort({ updatedAt: -1 });

    return res.json({ drafts: drafts.map(buildExamResponse) });
  } catch (error) {
    console.error('Teacher draft exams error:', error);
    return res.status(500).json({ message: 'Failed to fetch draft exams' });
  }
});

router.get('/students', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access students list' });
    }

    const {
      query = '',
      section = '',
      college = '',
      branch = '',
      semester = '',
      limit = 200,
      ids = '',
    } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const baseQuery = { role: 'student' };

    if (college) {
      baseQuery.college = new RegExp(`^${String(college).trim()}$`, 'i');
    }

    if (branch) {
      baseQuery.branch = new RegExp(`^${String(branch).trim()}$`, 'i');
    }

    if (semester) {
      baseQuery.semester = new RegExp(`^${String(semester).trim()}$`, 'i');
    }

    // If specific ids provided, return those students (scoped to teacher college/branch)
    if (ids) {
      const idList = String(ids).split(',').map((s) => s.trim()).filter(Boolean).filter((s) => mongoose.Types.ObjectId.isValid(s));
      if (idList.length === 0) return res.json({ students: [] });
      const students = await User.find({ _id: { $in: idList }, role: 'student' })
        .select('_id name email rollNumber college branch semester section className')
        .sort({ name: 1 });
      return res.json({ students });
    }

    if (section) {
      baseQuery.$or = [
        { section: new RegExp(`^${String(section).trim()}$`, 'i') },
        { className: new RegExp(`^${String(section).trim()}$`, 'i') },
      ];
    }

    if (query) {
      const search = new RegExp(String(query).trim(), 'i');
      baseQuery.$and = [{
        $or: [
          { name: search },
          { email: search },
          { rollNumber: search },
        ],
      }];
    }

    const students = await User.find(baseQuery)
      .select('_id name email rollNumber college branch semester section className')
      .sort({ name: 1 })
      .limit(safeLimit);

    return res.json({ students });
  } catch (error) {
    console.error('Students list error:', error);
    return res.status(500).json({ message: 'Failed to fetch students list' });
  }
});


router.get('/students/filters', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can access student filters' });
    }

    const { college = '', branch = '', semester = '' } = req.query;

    

    const collegeQuery = {
      role: 'student',
      college: { $nin: [null, ''] }
    };

    const colleges = await User.distinct('college', collegeQuery);

    const branchQuery = {
      role: 'student',
      branch: { $nin: [null, ''] }
    };

    if (college) {
      branchQuery.college = new RegExp(`^${String(college).trim()}$`, 'i');
    }

    const branches = await User.distinct('branch', branchQuery);

    const semesterQuery = {
      role: 'student',
      semester: { $nin: [null, ''] }
    };

    if (college) {
      semesterQuery.college = new RegExp(`^${String(college).trim()}$`, 'i');
    }

    if (branch) {
      semesterQuery.branch = new RegExp(`^${String(branch).trim()}$`, 'i');
    }

    const semesters = await User.distinct('semester', semesterQuery);

    const sectionQuery = {
      role: 'student'
    };

    if (college) {
      sectionQuery.college = new RegExp(`^${String(college).trim()}$`, 'i');
    }

    if (branch) {
      sectionQuery.branch = new RegExp(`^${String(branch).trim()}$`, 'i');
    }

    if (semester) {
      sectionQuery.semester = new RegExp(`^${String(semester).trim()}$`, 'i');
    }

  

    const sections = await User.distinct('section', sectionQuery);
    const classNames = await User.distinct('className', sectionQuery);


    const mergedSections = Array.from(
      new Set(
        [...sections, ...classNames]
          .filter(Boolean)
          .map((value) => String(value).trim())
      )
    );


    const response = {
      colleges: colleges.sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      branches: branches.sort((a, b) =>
        String(a).localeCompare(String(b))
      ),
      semesters: semesters.sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      ),
      sections: mergedSections.sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      ),
    };


    return res.json(response);

  } catch (error) {
    console.error('Student filters error:', error);
    return res.status(500).json({
      message: 'Failed to fetch student filters'
    });
  }
});
router.get('/available', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.json([]);
    }

    if (!req.user.college || !req.user.branch || !(req.user.section || req.user.className)) {
      return res.status(400).json({
        message: 'Please complete your profile with college, stream and section to view exams.',
      });
    }

    const now = new Date();
    const exams = await Exam.find({
      isActive: true,
      $or: [{ status: 'published' }, { status: { $exists: false } }],
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).sort({ startTime: -1 });

    const visibleExams = exams.filter((exam) => isAudienceMatch(exam, req.user));

    const examsWithStats = await attachStats(visibleExams);
    return res.json(examsWithStats);
  } catch (error) {
    console.error('Available exams error:', error);
    return res.status(500).json({ message: 'Failed to fetch available exams' });
  }
});

router.post('/join', requireAuth, async (req, res) => {
  try {
    const { examKey } = req.body;
    if (!examKey) {
      return res.status(400).json({ message: 'Exam key is required' });
    }

    const exam = await Exam.findOne({ examKey: String(examKey).trim().toUpperCase() });
    if (!exam) {
      return res.status(404).json({ message: 'Invalid exam key' });
    }

    if (req.user.role === 'teacher') {
      if (!canTeacherManageExam(exam, req.userId)) {
        return res.status(403).json({ message: 'You are not allowed to access this exam' });
      }

      return res.json({ examId: exam._id, examKey: exam.examKey });
    }

    if (!canStudentAccessExam(exam, req.user)) {
      return res.status(403).json({ message: 'You are not allowed to access this exam' });
    }

    return res.json({ examId: exam._id, examKey: exam.examKey });
  } catch (error) {
    console.error('Join exam error:', error);
    return res.status(500).json({ message: 'Failed to join exam' });
  }
});

router.get('/:examId/questions', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (req.user.role === 'teacher') {
      if (!canTeacherManageExam(exam, req.userId)) {
        return res.status(403).json({ message: 'You are not allowed to access this exam' });
      }
    } else if (!canStudentAccessExam(exam, req.user)) {
      return res.status(403).json({ message: 'You are not allowed to access this exam' });
    }

    // For students, return a deterministic per-student randomized set
    if (req.user.role !== 'teacher') {
      const setData = getStudentQuestionSet(exam, req.user._id);
      return res.json({
        _id: exam._id,
        title: exam.title,
        subject: exam.subject,
        description: exam.description,
        instructions: exam.instructions || '',
        duration: exam.duration,
        passingMarks: exam.passingMarks || 0,
        startTime: exam.startTime,
        endTime: exam.endTime,
        examKey: exam.examKey,
        totalMarks: exam.totalMarks,
        questions: setData.questions,
        setNumber: setData.setNumber,
      });
    }

    // Teacher view: include correctness flags and original option order info
    const questions = exam.questions.map((question) => ({
      _id: question._id,
      type: question.type || 'single_correct',
      question: question.question,
      marks: question.marks,
      timePerQuestion: question.timePerQuestion,
      shortAnswer: question.shortAnswer || '',
      options: question.options.map((option) => ({
        text: option.text,
        originalIndex: option.originalIndex,
        isCorrect: Boolean(option.isCorrect),
      })),
    }));

    return res.json({
      _id: exam._id,
      title: exam.title,
      subject: exam.subject,
      description: exam.description,
      instructions: exam.instructions || '',
      duration: exam.duration,
      passingMarks: exam.passingMarks || 0,
      startTime: exam.startTime,
      endTime: exam.endTime,
      examKey: exam.examKey,
      totalMarks: exam.totalMarks,
      questions,
      setNumber: 1,
    });
  } catch (error) {
    console.error('Fetch exam questions error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam questions' });
  }
});

router.post('/:examId/publish', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can publish exams' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!canTeacherManageExam(exam, req.userId)) {
      return res.status(403).json({ message: 'You are not allowed to publish this exam' });
    }

    if (!Array.isArray(exam.allowedStudents) || exam.allowedStudents.length === 0) {
      return res.status(400).json({ message: 'Assign students before publishing this exam' });
    }

    exam.status = 'published';
    exam.isActive = true;
    exam.publishedAt = new Date();
    await exam.save();

    await notifyStudents({
      title: 'New exam available',
      message: `${req.user?.name || 'A teacher'} published exam: ${exam.title}`,
      type: 'exam',
      metadata: { examId: exam._id, examKey: exam.examKey },
      targetExam: exam,
    });

    return res.json({ message: 'Exam published successfully', exam: buildExamResponse(exam) });
  } catch (error) {
    console.error('Publish exam error:', error);
    return res.status(500).json({ message: 'Failed to publish exam' });
  }
});

router.post('/:examId/assign', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can assign exams' });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!canTeacherManageExam(exam, req.userId)) {
      return res.status(403).json({ message: 'You are not allowed to assign this exam' });
    }

    const requestedIds = parseAllowedStudentIds(req.body?.studentIds || []);
    const selectedCollege = String(req.body?.college || '').trim();
    const selectedBranch = String(req.body?.branch || '').trim();
    const selectedSemester = String(req.body?.semester || '').trim();
    const selectedSections = Array.isArray(req.body?.sections)
      ? req.body.sections.map((section) => String(section || '').trim()).filter(Boolean)
      : String(req.body?.section || '').trim()
        ? [String(req.body.section).trim()]
        : [];

    if (requestedIds.length === 0) {
      return res.status(400).json({ message: 'At least one valid student ID is required' });
    }

    const studentQuery = {
      _id: { $in: requestedIds },
      role: 'student',
    };

    if (selectedCollege) {
      studentQuery.college = new RegExp(`^${selectedCollege}$`, 'i');
    }
    if (selectedBranch) {
      studentQuery.branch = new RegExp(`^${selectedBranch}$`, 'i');
    }
    if (selectedSemester) {
      studentQuery.semester = new RegExp(`^${selectedSemester}$`, 'i');
    }
    if (selectedSections.length > 0) {
      studentQuery.$or = selectedSections.flatMap((section) => ([
        { section: new RegExp(`^${section}$`, 'i') },
        { className: new RegExp(`^${section}$`, 'i') },
      ]));
    }

    const allowedStudents = await User.find(studentQuery).select('_id');

    if (allowedStudents.length === 0) {
      return res.status(400).json({ message: 'No eligible students found for assignment' });
    }

    const merged = new Set([...(exam.allowedStudents || []).map((id) => String(id))]);
    allowedStudents.forEach((student) => merged.add(String(student._id)));
    exam.allowedStudents = Array.from(merged).map((id) => new mongoose.Types.ObjectId(id));

    if (selectedCollege) {
      exam.allowedColleges = [selectedCollege];
    }
    if (selectedBranch) {
      exam.allowedBranches = [selectedBranch];
    }
    if (selectedSections.length > 0) {
      exam.allowedSections = Array.from(new Set([...(exam.allowedSections || []).map((value) => String(value)), ...selectedSections]));
    }

    await exam.save();

    await Notification.insertMany(
      allowedStudents.map((student) => ({
        user: student._id,
        title: 'Exam assigned to you',
        message: `${req.user?.name || 'Your teacher'} assigned exam: ${exam.title}`,
        type: 'exam',
        metadata: { examId: exam._id, examKey: exam.examKey },
      }))
    );

    return res.json({
      message: 'Students assigned successfully',
      assignedCount: allowedStudents.length,
      exam: buildExamResponse(exam),
    });
  } catch (error) {
    console.error('Assign exam error:', error);
    return res.status(500).json({ message: 'Failed to assign students to exam' });
  }
});

router.post('/:examId/duplicate', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can duplicate exams' });
    }

    const sourceExam = await Exam.findById(req.params.examId);
    if (!sourceExam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!canTeacherManageExam(sourceExam, req.userId)) {
      return res.status(403).json({ message: 'You are not allowed to duplicate this exam' });
    }

    const duplicatedExam = await Exam.create({
      title: `${sourceExam.title} (Copy)`,
      subject: sourceExam.subject,
      description: sourceExam.description,
      instructions: sourceExam.instructions,
      duration: sourceExam.duration,
      passingMarks: sourceExam.passingMarks,
      startTime: sourceExam.startTime,
      endTime: sourceExam.endTime,
      teacher: req.userId,
      examKey: await generateUniqueExamKey(),
      questions: sourceExam.questions,
      totalMarks: sourceExam.totalMarks,
      isActive: sourceExam.isActive,
      status: 'draft',
      publishedAt: null,
      allowedColleges: sourceExam.allowedColleges || [],
      allowedBranches: sourceExam.allowedBranches || [],
      allowedSections: sourceExam.allowedSections || [],
      allowedStudents: sourceExam.allowedStudents || [],
    });

    return res.status(201).json({
      message: 'Exam duplicated successfully',
      exam: buildExamResponse(duplicatedExam),
    });
  } catch (error) {
    console.error('Duplicate exam error:', error);
    return res.status(500).json({ message: 'Failed to duplicate exam' });
  }
});

// Delete an exam (teacher only)
router.delete('/:examId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can delete exams' });
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (!canTeacherManageExam(exam, req.userId)) return res.status(403).json({ message: 'You are not allowed to delete this exam' });

    await Exam.deleteOne({ _id: exam._id });
    // Optionally remove related results/notifications
    await Result.deleteMany({ exam: exam._id });
    await Notification.deleteMany({ 'metadata.examId': exam._id });

    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    return res.status(500).json({ message: 'Failed to delete exam' });
  }
});

router.get('/:examId', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (req.user.role === 'teacher') {
      if (!canTeacherManageExam(exam, req.userId)) {
        return res.status(403).json({ message: 'You are not allowed to view this exam' });
      }
    } else if (!canStudentAccessExam(exam, req.user)) {
      return res.status(403).json({ message: 'You are not allowed to view this exam' });
    }

    return res.json(buildExamResponse(exam));
  } catch (error) {
    console.error('Fetch exam error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam' });
  }
});

module.exports = router;
