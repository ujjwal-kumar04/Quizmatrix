const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const PreviousPaper = require('../models/PreviousPaper');
const requireAuth = require('../utils/requireAuth');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'previous_papers', 
    resource_type: 'raw',     
    public_id: (req, file) => {

      const safeName = file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.[^/.]+$/, ""); 
      return `${Date.now()}-${safeName}`;
    }
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1 * 1024 * 1024 }, 
});

const populateTeacher = { path: 'teacher', select: 'name email role profileImage department rollNumber class semester' };

const buildPaper = (paper) => paper;


router.get('/filters', requireAuth, async (req, res) => {
  try {
    const [countries, states, colleges, branches, semesters, subjects, years] = await Promise.all([
      PreviousPaper.distinct('country', { isPublished: true }),
      PreviousPaper.distinct('state', { isPublished: true }),
      PreviousPaper.distinct('college', { isPublished: true }),
      PreviousPaper.distinct('branch', { isPublished: true }),
      PreviousPaper.distinct('semester', { isPublished: true }),
      PreviousPaper.distinct('subject', { isPublished: true }),
      PreviousPaper.distinct('year', { isPublished: true }),
    ]);

    const sortStrings = (arr) => arr.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));

    return res.json({
      countries: sortStrings(countries),
      states: sortStrings(states),
      colleges: sortStrings(colleges),
      branches: sortStrings(branches),
      semesters: sortStrings(semesters),
      subjects: sortStrings(subjects),
      years: sortStrings(years),
    });
  } catch (error) {
    console.error('Fetch previous paper filters error:', error);
    return res.status(500).json({ message: 'Failed to fetch filter options' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { country, state, college, branch, semester, subject, year, search } = req.query;
    const filter = { isPublished: true };

    if (country) filter.country = country;
    if (state) filter.state = state;
    if (college) filter.college = college;
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (subject) filter.subject = subject;
    if (year) filter.year = year;

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { title: regex },
        { subject: regex },
      ];
    }

    const papers = await PreviousPaper.find(filter)
      .sort({ createdAt: -1 })
      .populate(populateTeacher);

    return res.json(papers.map(buildPaper));
  } catch (error) {
    console.error('Fetch previous papers error:', error);
    return res.status(500).json({ message: 'Failed to fetch papers' });
  }
});


router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can upload papers' });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    const { title, subject, year, country, state, college, branch, semester } = req.body;

    if (!title || !subject || !year || !country || !state || !college || !branch || !semester) {
      return res.status(400).json({ message: 'All paper fields are required' });
    }

    const paper = await PreviousPaper.create({
      title: String(title).trim(),
      subject: String(subject).trim(),
      year: String(year).trim(),
      country: String(country).trim(),
      state: String(state).trim(),
      college: String(college).trim(),
      branch: String(branch).trim(),
      semester: String(semester).trim(),
      fileUrl: req.file.path, 
      teacher: req.userId,
    });

    return res.status(201).json({ success: true, paper: await PreviousPaper.findById(paper._id).populate(populateTeacher) });
  } catch (error) {
    console.error('Upload previous paper error:', error);
    return res.status(500).json({ message: 'Failed to upload paper' });
  }
});


router.get('/download/:id', requireAuth, async (req, res) => {
  try {
    const paper = await PreviousPaper.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({ message: 'Previous paper not found' });
    }

    if (!paper.fileUrl) {
      return res.status(404).json({ message: 'File not available', fileNotAvailable: true });
    }

    एं
    paper.downloadCount += 1;
    await paper.save();

    return res.redirect(paper.fileUrl);
  } catch (error) {
    console.error('Download previous paper error:', error);
    return res.status(500).json({ message: 'Failed to download file' });
  }
});


router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can delete papers' });
    }

    const paper = await PreviousPaper.findOne({ _id: req.params.id, teacher: req.userId });
    if (!paper) {
      return res.status(404).json({ message: 'Previous paper not found' });
    }

    await PreviousPaper.findByIdAndDelete(paper._id);

    return res.json({ success: true, message: 'Paper deleted successfully' });
  } catch (error) {
    console.error('Delete previous paper error:', error);
    return res.status(500).json({ message: 'Failed to delete paper' });
  }
});

module.exports = router;