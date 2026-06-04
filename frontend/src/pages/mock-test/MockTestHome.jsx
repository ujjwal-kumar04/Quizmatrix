import { Link } from "react-router-dom";
import questions from "../../data/questions.json";

const MockTestHome = () => {
  const categories = [...new Set(questions.map((q) => q.category))];

  const categoryDetails = {
    "Aptitude": "Sharpen your quantitative and problem-solving skills.",
    "Logical Reasoning": "Test your logical and analytical thinking abilities.",
    "Verbal Ability":
      "Improve your vocabulary, grammar, and comprehension.",
    "Data Structures & Algorithms":
      "Assess your knowledge of coding concepts and data structures.",
    "General Knowledge":
      "Stay updated with current affairs and general awareness.",
  };

  const categoryIcons = {
    "Aptitude": "📊",
    "Logical Reasoning": "🧩",
    "Verbal Ability": "📝",
    "Data Structures & Algorithms": "💻",
    "General Knowledge": "🌍",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#0f172a] dark:via-[#111827] dark:to-[#1e293b] px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">
            Mock Test Series
          </h1>

          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Choose your category and start practicing with real exam-style
            questions. Track your progress and improve your performance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {categories.map((category) => {
            const count = questions.filter(
              (q) => q.category === category
            ).length;

            return (
              <Link
                key={category}
                to={`/mock-test/${encodeURIComponent(
                  category.toLowerCase()
                )}`}
                className="group relative overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                <div className="p-7">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-md mb-5 group-hover:scale-110 transition-transform duration-300">
                    {categoryIcons[category] || "📚"}
                  </div>

                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                    {category}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                    {categoryDetails[category] || "Practice and improve your skills."}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      {count} Questions
                    </span>

                    <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform duration-300">
                      Start Test →
                    </span>
                  </div>
                </div>

                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MockTestHome;