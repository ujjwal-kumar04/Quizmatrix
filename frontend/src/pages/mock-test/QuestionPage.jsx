import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // useNavigate इम्पोर्ट किया
import questions from "../../data/questions.json";

const QuestionPage = () => {
  const { category, topic } = useParams();
  const navigate = useNavigate(); // navigate फंक्शन इनिशियलाइज़ किया

  const topicQuestions = questions.filter(
    (q) =>
      q.category.toLowerCase() === category &&
      q.topic.toLowerCase().replace(/\s+/g, "-") === topic
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const currentQuestion = topicQuestions[currentIndex];

  const handleNext = () => {
    setShowAnswer(false);
    setSelectedOption(null);

    if (currentIndex < topicQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("🎉 You have completed all questions!");
    }
  };

  if (!currentQuestion) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-xl max-w-sm w-full text-center shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            No Questions Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            We couldn't find any questions matching this specific topic.
          </p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentIndex + 1) / topicQuestions.length) * 100;

  return (
    <div className="h-screen w-screen max-h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl w-full mx-auto space-y-4 pb-8">
        
        {/* --- BACK BUTTON (यहाँ नया बटन जोड़ा गया है) --- */}
        <div>
          <button
            onClick={() => navigate(-1)} // -1 करने से यूजर पिछले पेज पर वापस चला जाता है
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Header Block */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                Practice Session
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 truncate">
                {currentQuestion.topic}
              </h1>
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 self-start sm:self-center bg-slate-200/60 dark:bg-slate-800 px-3 py-1 rounded-full shrink-0">
              {currentIndex + 1} of {topicQuestions.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Main Content Area */}
          <div className="p-5 sm:p-8 space-y-6">
            
            {/* Question Text */}
            <div 
              className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {currentQuestion.question}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <button
                    key={index}
                    onClick={() => !showAnswer && setSelectedOption(index)}
                    disabled={showAnswer}
                    className={`group flex items-center gap-3.5 p-3.5 w-full text-left rounded-xl border font-medium transition-all duration-200 text-sm sm:text-base
                      ${showAnswer ? 'cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected 
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200" 
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }
                    `}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-semibold text-xs sm:text-sm shrink-0 transition-colors duration-200
                      ${isSelected 
                        ? "bg-blue-600 text-white dark:bg-blue-500" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                      }
                    `}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Answer Section */}
            {showAnswer && (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-4 sm:p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide uppercase">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Correct Answer
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  {currentQuestion.answer}
                </p>
                {currentQuestion.explanation && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pt-1 leading-relaxed border-t border-emerald-200/40 dark:border-emerald-900/40 mt-2">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Normal Actions Row */}
          <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-row gap-3 items-center justify-between">
            <button
              onClick={() => setShowAnswer(true)}
              disabled={selectedOption === null || showAnswer}
              className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold h-10 sm:h-11 px-4 sm:px-6 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Show Answer
            </button>

            <button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold h-10 sm:h-11 px-4 sm:px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-500/10"
            >
              <span>Next Question</span>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default QuestionPage;