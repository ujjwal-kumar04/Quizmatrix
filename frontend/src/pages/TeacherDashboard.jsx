import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatRelativeTime, getExamStatus } from '../utils/helpers';

const TeacherDashboard = () => {
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAttempts: 0,
    averageScore: 0,
  });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningExam, setAssigningExam] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get('/exams/teacher');
      const fetchedExams = response.data.exams || [];
      setExams(fetchedExams);

      const apiStats = response.data.stats || {};
      setStats({
        totalStudents: apiStats.totalStudents || 0,
        totalAttempts: apiStats.totalAttempts || fetchedExams.reduce((sum, exam) => sum + (exam.participantCount || 0), 0),
        averageScore: apiStats.averageScore || 0,
      });
    } catch (error) {
      toast.error('Failed to fetch exams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyExamKey = (examKey) => {
    const tempInput = document.createElement('input');
    tempInput.value = examKey;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    toast.success('Exam key copied to clipboard!');
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningExam(null);
    setSelectedOptions([]);
  };

  if (loading) {
    return <Loading />;
  }

  const totalExams = exams.length;
  const draftCount = exams.filter((exam) => (exam.status || '').toLowerCase() === 'draft').length;
  const publishedCount = exams.filter((exam) => (exam.status || '').toLowerCase() === 'published').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <div className="flex min-h-screen">
       

        {/* Main Content */}
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}</h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage exams, study materials, papers, and student access.</p>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Exams</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalExams}</p>
            </div>
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Draft Exams</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{draftCount}</p>
            </div>
            <button
  onClick={() => navigate('/published-exams')}
  className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-left w-full hover:border-blue-500 transition-all cursor-pointer"
>
  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Published Exams</p>
  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{publishedCount}</p>
</button>
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalStudents}</p>
            </div>
            <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Attempts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalAttempts}</p>
            </div>
          </div>

          {/* Grid Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <button
              onClick={() => navigate('/create-exam')}
              className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">➕</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Create Exam</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create or publish an exam</p>
                </div>
              </div>
            </button>

            {/* Added: Upload Study Material Quick Button */}
            <button
              onClick={() => navigate('/study-materials')}
              className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Study Material</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload study documents</p>
                </div>
              </div>
            </button>

            {/* Added: Previous Year Paper Quick Button */}
            <button
              onClick={() => navigate('/previous-papers')}
              className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Previous Papers</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Upload past year papers</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/drafts')}
              className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Draft Exams</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Continue editing drafts</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/results')}
              className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Results & Analytics</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">View performance data</p>
                </div>
              </div>
            </button>
          </div>

          {/* Recent Exams List */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Recent Exams</h2>
              <Link to="/create-exam" className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 active:bg-blue-800 transition-all text-center touch-manipulation">Create New Exam</Link>
            </div>

            {exams.length === 0 ? (
              <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-center py-8 sm:py-12 px-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">No exams yet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Create your first exam to get started</p>
                <Link to="/create-exam" className="inline-block px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 active:bg-blue-800 transition-all touch-manipulation">Create Your First Exam</Link>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {exams.slice(0, 6).map((exam) => {
                  const statusInfo = getExamStatus(exam);
                  return (
                    <div key={exam._id} className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 sm:gap-3 mb-2">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex-1">{exam.title}</h3>
                            <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${statusInfo.color}`}>{statusInfo.status}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-primary-500 dark:text-primary-400 mb-2 sm:mb-3">{exam.subject}</p>
                          <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-6 gap-y-1 sm:gap-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span>Key:</span>
                              <span className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">{exam.examKey}</span>
                              <button onClick={() => copyExamKey(exam.examKey)} className="p-0.5 sm:p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-all touch-manipulation">
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                            <span className="text-[10px] sm:text-sm">👥 {exam.participantCount || 0} participants</span>
                            <span className="text-[10px] sm:text-sm">📊 {exam.averageScore ? `${parseFloat(exam.averageScore).toFixed(2)}%` : 'N/A'} avg</span>
                            <span className="hidden sm:inline text-[10px] sm:text-sm">🕒 {formatRelativeTime(exam.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/results/${exam._id}`} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 active:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 whitespace-nowrap text-center sm:text-left border border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all touch-manipulation">View Results →</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;