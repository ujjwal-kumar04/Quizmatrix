import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatRelativeTime } from '../utils/helpers';

const PublishedExams = () => {
  const { api } = useAuth();
  const [publishedExams, setPublishedExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPublishedExams();
  }, []);

  const fetchPublishedExams = async () => {
    try {
      setLoading(true);
     
      const response = await api.get('/exams/teacher');
      const allExams = response.data.exams || [];
      
      
      const onlyPublished = allExams.filter(
        (exam) => (exam.status || '').toLowerCase() === 'published'
      );
      
      setPublishedExams(onlyPublished);
    } catch (error) {
      console.error('Error fetching published exams:', error);
      toast.error('Failed to load published exams.');
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
    toast.success('Exam key copied!');
  };

  
  const filteredExams = publishedExams.filter((exam) =>
    exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-slate-800">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white"> Published Exams</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Exams that you have published are listed here. You can view their details and results.
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search published exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* List */}
        {filteredExams.length === 0 ? (
          <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-2xl text-center py-12 px-4">
            <p className="text-gray-500 dark:text-gray-400">कोई भी पब्लिश्ड एग्जाम नहीं मिला।</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExams.map((exam) => (
              <div key={exam._id} className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    
                    <div className="flex items-start gap-3 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex-1">{exam.title}</h3>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-400">
                        Live
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">{exam.subject}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <span>Key:</span>
                        <span className="font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-gray-800 dark:text-gray-200">
                          {exam.examKey}
                        </span>
                        <button onClick={() => copyExamKey(exam.examKey)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-gray-600">
                          📋
                        </button>
                      </div>
                      <span>👥 {exam.participantCount || 0} Students</span>
                      <span>📊 {exam.averageScore ? `${parseFloat(exam.averageScore).toFixed(2)}%` : 'N/A'} Avg</span>
                      <span>🕒 Published: {formatRelativeTime(exam.createdAt)}</span>
                    </div>

                  </div>

                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 border-gray-100 dark:border-slate-800 pt-2 lg:pt-0">
                    <Link 
                      to={`/results/${exam._id}`} 
                      className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 border border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                    >
                      View Results →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishedExams;