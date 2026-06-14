const mongoose = require('mongoose');

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeArrayValues = (values = []) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

const sanitizeQuestionType = (type) => {
  const normalized = normalizeText(type);
  if (normalized === 'mcq') return 'single_correct';
  const allowed = new Set(['single_correct', 'multiple_correct', 'true_false', 'short_answer', 'descriptive']);
  return allowed.has(normalized) ? normalized : 'single_correct';
};

const normalizeQuestion = (question = {}) => {
  const type = sanitizeQuestionType(question.type);
  const normalizedOptions = Array.isArray(question.options)
    ? question.options.map((option, index) => ({
      text: String(option?.text || '').trim(),
      isCorrect: Boolean(option?.isCorrect),
      originalIndex: Number.isInteger(option?.originalIndex) ? option.originalIndex : index,
    })).filter((option) => option.text)
    : [];

  return {
    type,
    question: String(question.question || '').trim(),
    options: normalizedOptions,
    shortAnswer: String(question.shortAnswer || '').trim(),
    descriptiveAnswer: String(question.descriptiveAnswer || '').trim(),
    marks: Number(question.marks || 1),
    timePerQuestion: Number(question.timePerQuestion || 60),
  };
};

const validateQuestions = (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'At least one question is required';
  }

  for (const question of questions) {
    if (!String(question.question || '').trim()) {
      return 'Each question must include question text';
    }

    const type = sanitizeQuestionType(question.type);
    if (['single_correct', 'multiple_correct', 'true_false'].includes(type)) {
      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length < 2) {
        return 'Objective questions must have at least 2 options';
      }
      const correctCount = options.filter((option) => option && option.isCorrect).length;
      if (type === 'single_correct' || type === 'true_false') {
        if (correctCount !== 1) {
          return 'Single-correct/true-false questions must have exactly one correct option';
        }
      } else if (type === 'multiple_correct' && correctCount < 1) {
        return 'Multiple-correct questions must have at least one correct option';
      }
    }
  }

  return null;
};

const parseAllowedStudentIds = (studentIds = []) => {
  const ids = Array.isArray(studentIds) ? studentIds : [];
  return ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
};

const buildAudiencePayload = (payload = {}) => ({
  allowedColleges: normalizeArrayValues(payload.allowedColleges),
  allowedBranches: normalizeArrayValues(payload.allowedBranches),
  allowedSections: normalizeArrayValues(payload.allowedSections),
  allowedStudents: parseAllowedStudentIds(payload.allowedStudents),
});

const hasAudienceRestrictions = (exam) => (
  (exam.allowedColleges || []).length > 0
  || (exam.allowedBranches || []).length > 0
  || (exam.allowedSections || []).length > 0
  || (exam.allowedStudents || []).length > 0
);

const isAudienceMatch = (exam, student) => {
  const allowedStudents = (exam.allowedStudents || []).map((item) => String(item));
  const allowedColleges = (exam.allowedColleges || []).map((item) => normalizeText(item));
  const allowedBranches = (exam.allowedBranches || []).map((item) => normalizeText(item));
  const allowedSections = (exam.allowedSections || []).map((item) => normalizeText(item));

  const studentId = String(student?._id || '');
  const studentCollege = normalizeText(student?.college);
  const studentBranch = normalizeText(student?.branch || student?.department);
  const studentSection = normalizeText(student?.section || student?.className);

  if (allowedStudents.length > 0 && allowedStudents.includes(studentId)) {
    return true;
  }

  const profileMatch = (
    (allowedColleges.length === 0 || allowedColleges.includes(studentCollege))
    && (allowedBranches.length === 0 || allowedBranches.includes(studentBranch))
    && (allowedSections.length === 0 || allowedSections.includes(studentSection))
  );

  if (allowedStudents.length === 0 && (allowedColleges.length > 0 || allowedBranches.length > 0 || allowedSections.length > 0)) {
    return profileMatch;
  }

  if (allowedStudents.length > 0 && (allowedColleges.length > 0 || allowedBranches.length > 0 || allowedSections.length > 0)) {
    return profileMatch;
  }

  return !hasAudienceRestrictions(exam);
};

const isPublishedExam = (exam) => {
  if (!exam) return false;
  if (!exam.status) return Boolean(exam.isActive);
  return exam.status === 'published';
};

// Deterministic seeded RNG and shuffle to produce per-student question sets
const seedFromString = (str) => {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(String(str || '')).digest('hex');
  // use first 8 chars as hex number
  return parseInt(hash.slice(0, 8), 16) >>> 0;
};

const mulberry32 = (seed) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const shuffleWithSeed = (array, seed) => {
  const arr = Array.isArray(array) ? array.slice() : [];
  const rand = mulberry32(Number(seed) >>> 0);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};

const getStudentQuestionSet = (exam, studentId) => {
  const base = String(studentId || '') + '::' + String(exam?._id || '');
  const seed = seedFromString(base);
  const shuffledQuestions = shuffleWithSeed(exam.questions || [], seed);
  // shuffle options per question as well deterministically
  const questions = shuffledQuestions.map((q, idx) => {
    const optionSeed = seedFromString(base + '::' + idx);
    const shuffledOptions = shuffleWithSeed(q.options || [], optionSeed).map((opt) => ({
      text: String(opt.text || ''),
      originalIndex: Number.isInteger(opt.originalIndex) ? opt.originalIndex : 0,
    }));

    return {
      _id: q._id,
      type: q.type || 'single_correct',
      question: q.question,
      marks: q.marks,
      timePerQuestion: q.timePerQuestion,
      shortAnswer: q.shortAnswer || '',
      options: shuffledOptions,
    };
  });

  // setNumber deterministic but human-friendly
  const setNumber = (seed % 1000) + 1;
  return { questions, setNumber };
};

const canTeacherManageExam = (exam, userId) => String(exam.teacher) === String(userId);

const canStudentAccessExam = (exam, user) => {
  if (!user) return false;
  if (user.role !== 'student') return false;

  if (!isPublishedExam(exam) || !exam.isActive) {
    return false;
  }

  const now = new Date();
  if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
    return false;
  }

  if (!user.college || !user.branch || !(user.section || user.className)) {
    return false;
  }

  return isAudienceMatch(exam, user);
};

module.exports = {
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
};
