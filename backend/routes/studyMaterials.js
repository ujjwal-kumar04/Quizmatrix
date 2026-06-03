const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const StudyMaterial = require('../models/StudyMaterial');
const Notification = require('../models/Notification');
const User = require('../models/User');
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
    folder: 'study_materials', 
    resource_type: 'auto',      
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

const populateTeacher = { path: 'teacher', select: 'name email role profileImage department rollNumber className semester college branch section' };

const buildMaterial = (material) => material;

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildStudentMaterialFilter = (user) => {
  const college = normalizeText(user.college);
  const stream = normalizeText(user.branch);
  const section = normalizeText(user.section || user.className);

  const streamRegex = new RegExp(`^${escapeRegex(stream)}$`, 'i');
  const sectionRegex = new RegExp(`^${escapeRegex(section)}$`, 'i');
  const collegeRegex = new RegExp(`^${escapeRegex(college)}$`, 'i');

  return {
    isPublished: true,
    targetStream: streamRegex,
    $and: [
      {
        $or: [
          { targetCollegeScope: 'all' },
          { targetCollegeScope: 'self', targetCollegeName: collegeRegex },
        ],
      },
      {
        $or: [
          { targetSection: '' },
          { targetSection: { $exists: false } },
          { targetSection: sectionRegex },
        ],
      },
    ],
  };
};

const matchesAudience = (material, user) => {
  const userCollege = normalizeText(user.college).toLowerCase();
  const userStream = normalizeText(user.branch).toLowerCase();
  const userSection = normalizeText(user.section || user.className).toLowerCase();

  const materialStream = normalizeText(material.targetStream).toLowerCase();
  const materialSection = normalizeText(material.targetSection).toLowerCase();
  const materialCollege = normalizeText(material.targetCollegeName).toLowerCase();

  if (!userCollege || !userStream || !userSection) return false;
  if (userStream !== materialStream) return false;
  if (material.targetCollegeScope === 'self' && userCollege !== materialCollege) return false;
  if (materialSection && userSection !== materialSection) return false;

  return true;
};

const notifyStudents = async ({ title, message, type = 'study-material', metadata = {}, target }) => {
  const students = await User.find({ role: 'student' }).select('_id college branch section className');
  if (students.length === 0) return;

  const targetUsers = target
    ? students.filter((student) => matchesAudience(target, student))
    : students;

  if (targetUsers.length === 0) return;

  await Notification.insertMany(
    targetUsers.map((student) => ({
      user: student._id,
      title,
      message,
      type,
      metadata,
    }))
  );
};

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = req.file.path; 
    return res.json({ success: true, fileUrl });
  } catch (error) {
    console.error('Upload study material file error:', error);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    let query = { isPublished: true };
    if (req.user.role === 'student') {
      if (!req.user.college || !req.user.branch || !(req.user.section || req.user.className)) {
        return res.status(400).json({
          message: 'Please complete your profile with college, stream and section to view study materials.',
        });
      }
      query = buildStudentMaterialFilter(req.user);
    }

    const materials = await StudyMaterial.find(query)
      .sort({ createdAt: -1 })
      .populate(populateTeacher);

    return res.json(materials.map(buildMaterial));
  } catch (error) {
    console.error('Fetch study materials error:', error);
    return res.status(500).json({ message: 'Failed to fetch study materials' });
  }
});

router.get('/teacher', requireAuth, async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ teacher: req.userId })
      .sort({ createdAt: -1 })
      .populate(populateTeacher);

    return res.json(materials.map(buildMaterial));
  } catch (error) {
    console.error('Fetch teacher study materials error:', error);
    return res.status(500).json({ message: 'Failed to fetch teacher study materials' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can upload study materials' });
    }

    const {
      title,
      description = '',
      subject,
      type = 'notes',
      fileUrl = '',
      content = '',
      tags = [],
      targetCollegeScope = 'self',
      targetStream,
      targetSection = '',
    } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ message: 'Title and subject are required' });
    }

    const normalizedCollegeScope = targetCollegeScope === 'all' ? 'all' : 'self';
    const normalizedTargetStream = normalizeText(targetStream);
    const normalizedTargetSection = normalizeText(targetSection);
    const teacherCollege = normalizeText(req.user.college);

    if (!normalizedTargetStream) {
      return res.status(400).json({ message: 'Target stream is required' });
    }

    if (normalizedCollegeScope === 'self' && !teacherCollege) {
      return res.status(400).json({ message: 'Please update your profile with college before uploading for your college' });
    }

    const material = await StudyMaterial.create({
      title: String(title).trim(),
      description: String(description).trim(),
      subject: String(subject).trim(),
      type: String(type).trim(),
      fileUrl: String(fileUrl).trim(),
      content: String(content).trim(),
      tags: normalizeTags(tags),
      targetCollegeScope: normalizedCollegeScope,
      targetCollegeName: normalizedCollegeScope === 'self' ? teacherCollege : '',
      targetStream: normalizedTargetStream,
      targetSection: normalizedTargetSection,
      teacher: req.userId,
    });

    await notifyStudents({
      title: 'New study material uploaded',
      message: `${req.user?.name || 'A teacher'} uploaded a new study material: ${material.title}`,
      type: 'study-material',
      metadata: { materialId: material._id, subject: material.subject },
      target: material,
    });

    const populated = await StudyMaterial.findById(material._id).populate(populateTeacher);
    return res.status(201).json({ success: true, material: populated });
  } catch (error) {
    console.error('Create study material error:', error);
    return res.status(500).json({ message: 'Failed to create material' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const material = await StudyMaterial.findOne({ _id: req.params.id, teacher: req.userId });
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    const { title, description, subject, type, fileUrl, content, tags, targetCollegeScope, targetStream, targetSection } = req.body;
    if (title !== undefined) material.title = String(title).trim();
    if (description !== undefined) material.description = String(description).trim();
    if (subject !== undefined) material.subject = String(subject).trim();
    if (type !== undefined) material.type = String(type).trim();
    if (fileUrl !== undefined) material.fileUrl = String(fileUrl).trim();
    if (content !== undefined) material.content = String(content).trim();
    if (tags !== undefined) material.tags = normalizeTags(tags);
    if (targetCollegeScope !== undefined) {
      const normalizedCollegeScope = String(targetCollegeScope).trim() === 'all' ? 'all' : 'self';
      material.targetCollegeScope = normalizedCollegeScope;
      material.targetCollegeName = normalizedCollegeScope === 'self' ? normalizeText(req.user.college) : '';
    }
    if (targetStream !== undefined) {
      const normalizedTargetStream = normalizeText(targetStream);
      if (!normalizedTargetStream) {
        return res.status(400).json({ message: 'Target stream is required' });
      }
      material.targetStream = normalizedTargetStream;
    }
    if (targetSection !== undefined) {
      material.targetSection = normalizeText(targetSection);
    }

    await material.save();

    const populated = await StudyMaterial.findById(material._id).populate(populateTeacher);
    return res.json({ success: true, material: populated });
  } catch (error) {
    console.error('Update study material error:', error);
    return res.status(500).json({ message: 'Failed to update material' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const material = await StudyMaterial.findOneAndDelete({ _id: req.params.id, teacher: req.userId });
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    return res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete study material error:', error);
    return res.status(500).json({ message: 'Failed to delete material' });
  }
});

router.get('/download/:id', requireAuth, async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id).populate(populateTeacher);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (req.user.role === 'student' && !matchesAudience(material, req.user)) {
      return res.status(403).json({ message: 'You are not allowed to access this material' });
    }

    if (!material.fileUrl) {
      return res.status(404).json({ message: 'File not available', fileNotAvailable: true });
    }

    return res.redirect(material.fileUrl);
  } catch (error) {
    console.error('Download study material error:', error);
    return res.status(500).json({ message: 'Failed to download file' });
  }
});

module.exports = router;