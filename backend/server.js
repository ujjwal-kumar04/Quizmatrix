const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();


const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
};

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    
  }
};

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use("/api/contact", require("./routes/contact"));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/results', require('./routes/results'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/forums', require('./routes/forums'));
app.use('/api/study-materials', require('./routes/studyMaterials'));
app.use('/api/previous-papers', require('./routes/previousPapers'));
app.use('/api/ai-interviews', require('./routes/aiInterviews'));
app.use('/api/protected', require('./routes/protected'));

app.get('/', (req, res) => res.json({ message: 'McqQuiz API is running' }));

const PORT = parseInt(process.env.PORT, 10) || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
