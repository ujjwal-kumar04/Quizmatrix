const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = require('express').Router();
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: 'No token provided' });
    const token = auth.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const u = user.toObject();
  delete u.password;
  return u;
};

const buildUserProfileStats = async (userId) => {
  const Forum = require('../models/Forum');

  const [forums, totalReplies, likesAgg] = await Promise.all([
    Forum.find({ author: userId }).select('likes replies'),
    Forum.aggregate([
      { $match: { author: userId } },
      { $project: { replyCount: { $size: { $ifNull: ['$replies', []] } } } },
      { $group: { _id: null, totalReplies: { $sum: '$replyCount' } } },
    ]),
    Forum.aggregate([
      { $match: { author: userId } },
      { $project: { likeCount: { $size: { $ifNull: ['$likes', []] } } } },
      { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } },
    ]),
  ]);

  return {
    totalPosts: forums.length,
    totalLikes: likesAgg[0]?.totalLikes || 0,
    totalReplies: totalReplies[0]?.totalReplies || 0,
  };
};

// Register - create user directly (no OTP)
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      rollNumber,
      class: className,
      semester,
      college,
      branch,
      stream,
      section,
    } = req.body;

    const normalizedName = normalizeText(name);
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const normalizedRole = role || 'student';
    const normalizedCollege = normalizeText(college);
    const normalizedBranch = normalizeText(branch || stream);
    const normalizedClassName = normalizeText(className);
    const normalizedSection = normalizeText(section || normalizedClassName);

    // Basic validation
    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Invalid email address',
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }

    // Common validation
    if (!normalizedCollege) {
      return res.status(400).json({
        message: 'College is required',
      });
    }

    if (!normalizedBranch) {
      return res.status(400).json({
        message: 'Branch/Stream is required',
      });
    }

    // Student validation
    if (normalizedRole === 'student') {
      if (!normalizedSection) {
        return res.status(400).json({
          message: 'Section is required for students',
        });
      }

      if (!normalizeText(rollNumber)) {
        return res.status(400).json({
          message: 'Roll number is required',
        });
      }

      if (!normalizeText(semester)) {
        return res.status(400).json({
          message: 'Semester is required',
        });
      }
    }

    // Check existing user
    const existing = await User.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(400).json({
        message: 'Email already registered',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      department: normalizeText(department),
      college: normalizedCollege,
      branch: normalizedBranch,
      section: normalizedSection || undefined,
      rollNumber: normalizeText(rollNumber),
      className: normalizedClassName || normalizedSection || undefined,
      semester: normalizeText(semester),
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.error('Register error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email already exists',
      });
    }

    return res.status(500).json({
      message: 'Registration failed',
    });
  }
});

// NOTE: OTP confirmation and email verification endpoints removed — registration is immediate.

router.get('/user/:id', async (req, res) => {
  try {
    const Forum = require('../models/Forum');
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [forums, stats] = await Promise.all([
      Forum.find({ author: user._id })
        .sort({ createdAt: -1 })
        .populate([
          { path: 'author', select: 'name email role profileImage department rollNumber className semester college branch section' },
          { path: 'replies.user', select: 'name email role profileImage department rollNumber className semester college branch section' },
        ]),
      buildUserProfileStats(user._id),
    ]);

    return res.json({
      user: sanitizeUser(user),
      forums,
      stats,
    });
  } catch (error) {
    console.error('User profile error:', error);
    return res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials',
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid credentials',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// Resend verification endpoint removed (OTP flow disabled)

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('Me error', error);
    return res.status(500).json({ message: 'Could not fetch user' });
  }
});

// Set role
router.post('/set-role', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const allowed = ['role', 'department', 'rollNumber', 'class', 'semester', 'college', 'branch', 'section', 'stream'];
    const payload = {};
    Object.keys(updates).forEach((k) => {
      const key = k === 'class' ? 'className' : k === 'stream' ? 'branch' : k;
      if (allowed.includes(k)) payload[key] = updates[k];
    });
    if (payload.className && !payload.section) {
      payload.section = payload.className;
    }
    if (payload.section && !payload.className) {
      payload.className = payload.section;
    }
    const user = await User.findByIdAndUpdate(req.userId, payload, { new: true });
    return res.json({ message: 'Role updated', user: sanitizeUser(user) });
  } catch (error) {
    console.error('Set role error', error);
    return res.status(500).json({ message: 'Could not set role' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const forbidden = ['password', 'email'];
    forbidden.forEach(f => delete updates[f]);
    if (updates.stream && !updates.branch) {
      updates.branch = updates.stream;
      delete updates.stream;
    }
    if (updates.class) {
      updates.className = updates.class;
      delete updates.class;
    }
    if (updates.section && !updates.className) {
      updates.className = updates.section;
    }
    if (updates.className && !updates.section) {
      updates.section = updates.className;
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    return res.json({ message: 'Profile updated', user: sanitizeUser(user) });
  } catch (error) {
    console.error('Profile update error', error);
    return res.status(500).json({ message: 'Could not update profile' });
  }
});



const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'limit' }], 
  },
});

const upload = multer({ storage: storage });


router.post('/upload-profile-picture', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageUrl = req.file.path; 

    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: imageUrl }, 
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Profile picture updated on Cloudinary successfully',
      user: sanitizeUser(user),
      imageUrl
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return res.status(500).json({ message: error.message || 'Failed to upload profile picture' });
  }
});

module.exports = router;
