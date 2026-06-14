const express = require('express');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const requireAuth = require('../utils/requireAuth');

const router = express.Router();

const compareResultsForRank = (a, b) => {
  const percentageDiff = Number(b.percentage || 0) - Number(a.percentage || 0);
  if (percentageDiff !== 0) return percentageDiff;

  const marksDiff = Number(b.obtainedMarks || 0) - Number(a.obtainedMarks || 0);
  if (marksDiff !== 0) return marksDiff;

  const timeDiff = Number(a.timeTaken || 0) - Number(b.timeTaken || 0);
  if (timeDiff !== 0) return timeDiff;

  return new Date(a.submittedAt || a.createdAt || 0) - new Date(b.submittedAt || b.createdAt || 0);
};

const buildResult = (result) => ({
  _id: result._id,
  exam: result.exam,
  student: result.student,
  answers: result.answers,
  obtainedMarks: result.obtainedMarks,
  totalMarks: result.totalMarks,
  percentage: result.percentage,
  timeTaken: result.timeTaken,
  setNumber: result.setNumber,
  questionOrder: result.questionOrder,
  submittedAt: result.submittedAt,
  createdAt: result.createdAt,
  updatedAt: result.updatedAt,
});

router.post('/submit', requireAuth, async (req, res) => {
  try {
    const { examId, answers = [], timeTaken = 0, setNumber = 1, questionOrder = [] } = req.body;
    if (!examId) {
      return res.status(400).json({ message: 'Exam ID is required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const score = answers.reduce((sum, answer) => {
      const question = exam.questions.id(answer.questionId);
      if (!question) return sum;

      const selectedOption = question.options[answer.selectedOption];
      const expectedIndex = selectedOption?.originalIndex;
      const actualCorrectIndex = question.options.find((option) => option.isCorrect)?.originalIndex;

      const matches = answer.originalOptionIndex !== null && answer.originalOptionIndex !== undefined
        ? Number(answer.originalOptionIndex) === Number(actualCorrectIndex)
        : Number(expectedIndex) === Number(actualCorrectIndex);

      return matches ? sum + Number(question.marks || 1) : sum;
    }, 0);

    const totalMarks = exam.totalMarks || exam.questions.reduce((sum, question) => sum + Number(question.marks || 1), 0);
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    const result = await Result.findOneAndUpdate(
      { exam: examId, student: req.userId },
      {
        exam: examId,
        student: req.userId,
        answers,
        obtainedMarks: score,
        totalMarks,
        percentage,
        timeTaken,
        setNumber,
        questionOrder,
        submittedAt: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('exam').populate('student', 'name email rollNumber role');

    return res.json(buildResult(result));
  } catch (error) {
    console.error('Submit result error:', error);
    return res.status(500).json({ message: 'Failed to submit exam' });
  }
});

router.get('/my-results', requireAuth, async (req, res) => {
  try {
    const results = await Result.find({ student: req.userId })
      .populate('exam')
      .sort({ submittedAt: -1 });

    return res.json(results.map(buildResult));
  } catch (error) {
    console.error('My results error:', error);
    return res.status(500).json({ message: 'Failed to fetch results' });
  }
});

router.get('/student/summary', requireAuth, async (req, res) => {
  try {
    const results = await Result.find({ student: req.userId }).select('percentage');
    const totalExamsTaken = results.length;
    const averageScore = totalExamsTaken > 0
      ? results.reduce((sum, result) => sum + Number(result.percentage || 0), 0) / totalExamsTaken
      : 0;

    return res.json({
      totalExamsTaken,
      averageScore: Number(averageScore.toFixed(1)),
    });
  } catch (error) {
    console.error('Student summary error:', error);
    return res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

router.get('/exam/:examId', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const results = await Result.find({ exam: req.params.examId })
      .populate('student', 'name email rollNumber role')
      .sort({ percentage: -1, obtainedMarks: -1, timeTaken: 1, submittedAt: 1 });

    const rankedResults = [...results].sort(compareResultsForRank).map((result, index) => ({
      ...buildResult(result),
      rank: index + 1,
    }));

    return res.json({ exam, results: rankedResults });
  } catch (error) {
    console.error('Exam results error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam results' });
  }
});

router.get('/my-result/:examId', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const result = await Result.findOne({ exam: req.params.examId, student: req.userId })
      .populate('student', 'name email rollNumber role');

    return res.json({ exam, results: result ? [buildResult(result)] : [] });
  } catch (error) {
    console.error('My exam result error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam result' });
  }
});

// router.get('/detailed/:resultId', requireAuth, async (req, res) => {
//   try {
//     const result = await Result.findById(req.params.resultId)
//       .populate('exam')
//       .populate('student', 'name email rollNumber role');

//     if (!result) {
//       return res.status(404).json({ message: 'Result not found' });
//     }

//     const examResults = await Result.find({ exam: result.exam._id })
//       .select('_id percentage submittedAt')
//       .sort({ percentage: -1, submittedAt: 1 });

//     const rank = examResults.findIndex((item) => String(item._id) === String(result._id)) + 1;

//     const finalResult = {
//   ...buildResult(result),
//   rank: rank > 0 ? rank : null,
// };

// console.log(
//   JSON.stringify(finalResult, null, 2)
// );

// return res.json({
//   result: finalResult,
// });
//     return res.json({
//       result: {
//         ...buildResult(result),
//         rank: rank > 0 ? rank : null,
//       },
//     });
//   } catch (error) {
//     console.error('Detailed result error:', error);
//     return res.status(500).json({ message: 'Failed to fetch detailed result' });
//   }
// });
router.get('/detailed/:resultId', requireAuth, async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId)
      .populate('exam')
      .populate('student', 'name email rollNumber role');

    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    const examResults = await Result.find({
      exam: result.exam._id,
    })
      .select('_id percentage obtainedMarks timeTaken submittedAt createdAt')
      .sort({ percentage: -1, obtainedMarks: -1, timeTaken: 1, submittedAt: 1 });

    const rank =
      [...examResults].sort(compareResultsForRank).findIndex(
        (item) => String(item._id) === String(result._id)
      ) + 1;

    // Build detailed answers
    const detailedAnswers = result.answers.map((answer) => {
      const question = result.exam.questions.find(
        (q) => String(q._id) === String(answer.questionId)
      );

      if (!question) {
        return {
          question: 'Question Not Found',
          options: [],
          selectedOption: answer.selectedOption,
          isCorrect: false,
          marks: 0,
          maxMarks: 0,
        };
      }

      const correctOptionIndex = question.options.findIndex(
        (option) => option.isCorrect
      );

      const isCorrect =
        answer.selectedOption === correctOptionIndex;

      return {
        questionId: answer.questionId,
        question: question.question,
        options: question.options,
        selectedOption: answer.selectedOption,
        isCorrect,
        marks: isCorrect ? question.marks : 0,
        maxMarks: question.marks,
      };
    });

    return res.json({
      result: {
        ...result.toObject(),
        answers: detailedAnswers,
        rank: rank > 0 ? rank : null,
      },
    });
  } catch (error) {
    console.error('Detailed result error:', error);
    return res.status(500).json({
      message: 'Failed to fetch detailed result',
    });
  }
});

module.exports = router;
