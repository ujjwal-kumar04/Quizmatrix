
import { Link, useNavigate, useParams } from "react-router-dom";
import questions from "../../data/questions.json";

const CategoryPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  const topics = [
    ...new Set(
      questions
        .filter((q) => q.category.toLowerCase() === category)
        .map((q) => q.topic)
    ),
  ];

  const getTopicQuestions = (topic) => {
    return questions.filter(
      (q) => q.category.toLowerCase() === category && q.topic === topic
    );
  };

  const startTest = (topic) => {
    const topicQuestions = getTopicQuestions(topic);

    navigate(
      `/mock-test/${category}/${topic
        .toLowerCase()
        .replace(/\s+/g, "-")}/test`,
      { state: { questions: topicQuestions } }
    );
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-[#0f172a] dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_36%)] p-4 sm:p-6 lg:p-8 text-secondary-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white capitalize">
            {category.replace(/-/g, " ")} Topics
          </h1>

          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Select a topic to start a practice session or a timed test.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {topics.map((topic, index) => {
            const topicQuestions = getTopicQuestions(topic);
            const questionCount = topicQuestions.length;
            const topicSlug = topic.toLowerCase().replace(/\s+/g, "-");

            return (
             <div
  key={topic}
  className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
>
  {/* Background Glow */}
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-indigo-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/10 transition-all duration-500" />

  <div className="relative p-5">
    
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
        {index + 1}
      </div>

      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
        {questionCount} Questions
      </span>
    </div>

    {/* Topic Name */}
    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-6 min-h-[48px]">
      {topic}
    </h3>

    {/* Divider */}
    <div className="my-4 border-t border-slate-100 dark:border-slate-700"></div>

    {/* Info */}
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
      <span>📚 Practice</span>
      <span>⏱ Timed Test</span>
    </div>

    {/* Buttons */}
    <div className="grid grid-cols-2 gap-2">
      <Link
        to={`/mock-test/${category}/${topicSlug}`}
        className="text-center py-2.5 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-300 font-medium text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"
      >
        Practice
      </Link>

      <button
        onClick={() => startTest(topic)}
        className="py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:shadow-lg transition"
      >
        Start Test
      </button>
    </div>
  </div>
</div>
            );
          })}
        </div>

        {/* Empty State */}
        {topics.length === 0 && (
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border border-secondary-200 dark:border-slate-700 p-10 text-center mt-6">
            <div className="text-5xl mb-3">📭</div>

            <h3 className="text-xl font-bold text-secondary-900 dark:text-white">
              No Topics Found
            </h3>

            <p className="text-secondary-600 dark:text-secondary-400 mt-2">
              This category doesn't contain any topics yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;

