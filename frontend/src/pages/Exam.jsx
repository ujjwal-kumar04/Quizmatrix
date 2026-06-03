import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatRelativeTime, getExamStatus } from '../utils/helpers';

const Exams = () => {
  const { user, api } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/exams/teacher');
      const fetchedExams = response.data.exams || [];
      setExams(fetchedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
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


  const filteredExams = exams.filter((exam) => {
    const matchesTitle = exam.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = exam.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTitle || matchesSubject;
  });

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">All Exams</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage, monitor, and view results for all your created examinations.
            </p>
          </div>
          <Link 
            to="/create-exam" 
            className="px-5 py-2.5 text-sm sm:text-base bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all text-center shadow-sm"
          >
            ➕ Create New Exam
          </Link>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search exams by title or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Exams Content List */}
        {filteredExams.length === 0 ? (
          <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-2xl text-center py-12 px-4 shadow-sm">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {searchTerm ? 'No matching exams found' : 'No exams available'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {searchTerm ? 'Try adjusting your search keywords' : 'Get started by creating your very first exam.'}
            </p>
            {!searchTerm && (
              <Link 
                to="/create-exam" 
                className="inline-block px-5 py-2.5 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
              >
                Create Your First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredExams.map((exam) => {
              const statusInfo = getExamStatus(exam);
              return (
                <div 
                  key={exam._id} 
                  className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      
                      {/* Title & Status */}
                      <div className="flex items-start gap-2 sm:gap-3 mb-1.5">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {exam.title}
                        </h3>
                        <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${statusInfo.color}`}>
                          {statusInfo.status}
                        </span>
                      </div>

                      {/* Subject */}
                      <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">
                        {exam.subject}
                      </p>
                      
                      {/* Meta Information Grid */}
                      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {/* Exam Key Copy Element */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">Key:</span>
                          <span className="font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] sm:text-xs text-gray-800 dark:text-gray-200 font-semibold">
                            {exam.examKey}
                          </span>
                          <button 
                            onClick={() => copyExamKey(exam.examKey)} 
                            title="Copy Key"
                            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:scale-95 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>

                        {/* Participants Count */}
                        <span className="flex items-center gap-1">
                          👥 {exam.participantCount || 0} students
                        </span>

                        {/* Average Score */}
                        <span className="flex items-center gap-1">
                          📊 {exam.averageScore ? `${parseFloat(exam.averageScore).toFixed(2)}%` : 'N/A'} avg
                        </span>

                        {/* Created Relative Time */}
                        <span className="hidden sm:inline flex items-center gap-1">
                          🕒 {formatRelativeTime(exam.createdAt)}
                        </span>
                      </div>

                    </div>

                    {/* Action Buttons */}
                    <div className="flex lg:self-center flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-slate-800 w-full lg:w-auto justify-end">
                      <Link 
                        to={`/results/${exam._id}`} 
                        className="w-full lg:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/30 text-center transition-all"
                      >
                        View Results →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default Exams;