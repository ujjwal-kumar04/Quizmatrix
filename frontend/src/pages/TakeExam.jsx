import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(60);
  const questionTimersRef = useRef({});
  const [skippedQuestions, setSkippedQuestions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examStartTime] = useState(new Date());
  const [setNumber, setSetNumber] = useState(1);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(null);
  const timerIntervalRef = useRef(null);
  const isProcessingTimeoutRef = useRef(false);

  // Anti-cheating measures
  const [warningCount, setWarningCount] = useState(0);
  const warningCountRef = useRef(0); // Track actual count with ref to avoid stale closure
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const hasSubmittedRef = useRef(false);
  const wasInFullscreenRef = useRef(false); // Track if user was in fullscreen
  const hasLeftTabRef = useRef(false); // Track if user has left the tab
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const answersRef = useRef({}); // Keep ref of latest answers for auto-submit

  // Auto-save answers to localStorage
  const saveAnswersToLocalStorage = useCallback((answersToSave) => {
    try {
      const saveData = {
        answers: answersToSave,
        timestamp: new Date().toISOString(),
        examId: examId
      };
      localStorage.setItem(`exam_answers_${examId}`, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to save answers to localStorage:', error);
    }
  }, [examId]);

  // Load answers from localStorage
  const loadAnswersFromLocalStorage = useCallback(() => {
    try {
      const savedData = localStorage.getItem(`exam_answers_${examId}`);
      if (savedData) {
        const { answers: savedAnswers, timestamp } = JSON.parse(savedData);
        console.log(`Restored answers from ${timestamp}`);
        return savedAnswers;
      }
    } catch (error) {
      console.error('Failed to load answers from localStorage:', error);
    }
    return null;
  }, [examId]);

  // Clear answers from localStorage
  const clearAnswersFromLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(`exam_answers_${examId}`);
    } catch (error) {
      console.error('Failed to clear answers from localStorage:', error);
    }
  }, [examId]);

  const handleSubmitExam = useCallback(async (autoSubmit = false, reason = '') => {
    if (submitting || hasSubmittedRef.current) return;
    
    hasSubmittedRef.current = true;
    setSubmitting(true);
    
    // ALWAYS use ref to get latest answers (not state) to avoid stale closure issues
    const currentAnswers = answersRef.current;
    
    if (autoSubmit) {
      toast.error(`Exam auto-submitted: ${reason}`);
      console.log('🚨 AUTO-SUBMIT TRIGGERED');
      console.log('📝 currentAnswers from ref:', currentAnswers);
      console.log('📊 Number of answered questions:', Object.keys(currentAnswers).filter(k => currentAnswers[k] !== null).length);
    }
    
    try {
      const timeTaken = Math.floor((new Date() - examStartTime) / 1000); // in seconds
      
      const formattedAnswers = exam.questions.map((question, index) => {
        const selectedOptionIndex = currentAnswers[index];
        // Get the originalIndex from the selected option
        let originalOptionIndex = null;
        if (selectedOptionIndex !== null && selectedOptionIndex !== undefined) {
          const selectedOption = question.options[selectedOptionIndex];
          if (selectedOption && selectedOption.originalIndex !== undefined) {
            originalOptionIndex = selectedOption.originalIndex;
          }
        }
        
        return {
          questionId: question._id,
          selectedOption: selectedOptionIndex,
          originalOptionIndex: originalOptionIndex
        };
      });

      const answeredCount = formattedAnswers.filter(a => a.selectedOption !== null && a.selectedOption !== undefined).length;
      console.log('✅ Formatted answers ready:', answeredCount, 'answered questions');
      console.log('📦 Full formatted answers:', JSON.stringify(formattedAnswers, null, 2));

      const questionOrder = exam.questions.map(q => q._id);

      const payload = {
        examId: exam._id,
        answers: formattedAnswers,
        timeTaken: timeTaken,
        setNumber: setNumber,
        questionOrder: questionOrder
      };
      
      console.log('🚀 Sending payload to server:', JSON.stringify(payload, null, 2));
      
      const response = await api.post('/results/submit', payload);

      // Clear saved answers after successful submit
      clearAnswersFromLocalStorage();
      
      toast.success('Exam submitted successfully!');
      navigate('/student', { 
        state: { 
          examResult: response.data 
        }
      });
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit exam');
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, examStartTime, exam, api, setNumber, navigate]);

  const fetchExamQuestions = useCallback(async () => {
    try {
      const response = await api.get(`/exams/${examId}/questions`);
      
      setExam(response.data);
      setSetNumber(response.data.setNumber || 1);
      setTimeLeft(response.data.duration * 60);
      
      // Initialize answers
      const initialAnswers = {};
      response.data.questions.forEach((_, index) => {
        initialAnswers[index] = null;
      });
      
      // Try to restore answers from localStorage
      const savedAnswers = loadAnswersFromLocalStorage();
      if (savedAnswers) {
        // Merge saved answers with initial answers
        Object.keys(savedAnswers).forEach(key => {
          if (initialAnswers.hasOwnProperty(key)) {
            initialAnswers[key] = savedAnswers[key];
          }
        });
        toast.success('Previous answers restored!');
      }
      
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers; // Initialize ref with same data
      
      // Set timer for first question
      if (response.data.questions.length > 0) {
        const firstQuestionTime = response.data.questions[0].timePerQuestion || 60;
        setQuestionTimeLeft(firstQuestionTime);
        questionTimersRef.current = { 0: firstQuestionTime };
        setActiveQuestionIndex(0); // Start timer for first question
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load exam');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  }, [api, examId, navigate, loadAnswersFromLocalStorage]);

  useEffect(() => {
    fetchExamQuestions();
  }, [fetchExamQuestions]);

  // Periodic auto-save (every 30 seconds)
  useEffect(() => {
    if (!exam || !answers || submitting) return;
    
    const autoSaveInterval = setInterval(() => {
      // Use ref to get latest answers
      saveAnswersToLocalStorage(answersRef.current);
      const answeredCount = Object.keys(answersRef.current).filter(k => answersRef.current[k] !== null).length;
      console.log('Answers auto-saved at', new Date().toLocaleTimeString(), '- Answered:', answeredCount);
    }, 30000); // Save every 30 seconds
    
    return () => clearInterval(autoSaveInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, answers, submitting]);

  // Anti-Cheating: Request fullscreen when exam starts
  useEffect(() => {
    if (exam && !loading) {
      // Show fullscreen prompt immediately when exam loads
      setShowFullscreenPrompt(true);
      
      // Listen for fullscreen exit - but only count as violation if user was in fullscreen
      const handleFullscreenChange = () => {
        if (!document.fullscreenElement && wasInFullscreenRef.current && exam && !submitting && !hasSubmittedRef.current) {
          // User exited fullscreen after being in it
          handleViolation('Exited fullscreen mode');
          wasInFullscreenRef.current = false;
        } else if (document.fullscreenElement) {
          // User entered fullscreen
          wasInFullscreenRef.current = true;
        }
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, loading, submitting]);

  // Function to enable fullscreen
  const enableFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        wasInFullscreenRef.current = true;
        setShowFullscreenPrompt(false);
        toast.success('✅ Fullscreen mode activated! Exam started.');
      }
    } catch (err) {
      console.log('Fullscreen request failed:', err);
      toast.error('Please allow fullscreen to continue with the exam');
    }
  };

  // Anti-Cheating: Tab switching detection
  useEffect(() => {
    if (!exam || loading) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden && !submitting && !hasSubmittedRef.current) {
        // User left the tab - immediately save answers and count as violation
        if (!hasLeftTabRef.current) {
          hasLeftTabRef.current = true;
          // Auto-save latest answers from ref before warning
          saveAnswersToLocalStorage(answersRef.current);
          console.log('🔄 Tab switched! Current answersRef:', answersRef.current);
          console.log('📊 Answered questions:', Object.keys(answersRef.current).filter(k => answersRef.current[k] !== null).length);
          handleViolation('Switched to another tab/window');
        }
      } else if (!document.hidden) {
        // User came back to the tab - reset flag so next leave counts again
        hasLeftTabRef.current = false;
      }
    };
    
    // Only using visibility change - not blur to avoid duplicate warnings
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, loading, submitting, answers]);

  // Anti-Cheating: Disable copy-paste and keyboard shortcuts
  useEffect(() => {
    if (!exam || loading) return;
    
    const handleCopy = (e) => {
      e.preventDefault();
      toast.error('Copying is disabled during the exam');
      return false;
    };
    
    const handlePaste = (e) => {
      e.preventDefault();
      toast.error('Pasting is disabled during the exam');
      return false;
    };
    
    const handleCut = (e) => {
      e.preventDefault();
      toast.error('Cut operation is disabled during the exam');
      return false;
    };
    
    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error('Right-click is disabled during the exam');
      return false;
    };
    
    const handleKeyDown = (e) => {
      // Disable common shortcuts
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) ||
        (e.metaKey && ['c', 'v', 'x', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' || // Dev tools
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) // Dev tools
      ) {
        e.preventDefault();
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey)) {
          handleViolation('Attempted to open developer tools');
        }
        return false;
      }
    };
    
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, loading]);

  // Anti-Cheating: Detect developer tools
  useEffect(() => {
    if (!exam || loading) return;
    
    let devToolsOpen = false;
    const threshold = 160;
    
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if ((widthThreshold || heightThreshold) && !devToolsOpen) {
        devToolsOpen = true;
        handleViolation('Developer tools detected');
      }
    };
    
    const interval = setInterval(detectDevTools, 1000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, loading]);

  // Handle violation and warnings
  const handleViolation = useCallback((message) => {
    if (submitting || hasSubmittedRef.current) return;
    
    // Increment ref immediately to get accurate count
    warningCountRef.current += 1;
    const newWarningCount = warningCountRef.current;
    const timestamp = new Date().toLocaleTimeString();
    
    // Update state for UI
    setWarningCount(newWarningCount);
    
    console.log(`[${timestamp}] Violation detected: ${message}. Warning count: ${newWarningCount}/3`);
    
    if (newWarningCount >= 3) {
      setWarningMessage(`Final Warning: ${message}. Exam will be auto-submitted now!`);
      setShowWarningModal(true);
      
      toast.error('⛔ Maximum warnings reached! Auto-submitting exam...');
      
      // Auto-submit after showing warning popup
      setTimeout(() => {
        handleSubmitExam(true, 'Multiple violations detected (3 warnings)');
      }, 3000);
    } else {
      setWarningMessage(`Warning ${newWarningCount}/3: ${message}`);
      // Keep popup hidden for non-final warnings; show toast only
      
      toast(`⚠️ Warning ${newWarningCount}/3: ${message}`, {
        icon: '⚠️',
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          fontWeight: 'bold',
          border: '2px solid #F59E0B'
        }
      });
      
      // Auto-close warning after 3 seconds
      setTimeout(() => {
        setShowWarningModal(false);
      }, 3000);
    }
  }, [submitting, handleSubmitExam]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && exam) {
      handleSubmitExam();
    }
  }, [timeLeft, exam, handleSubmitExam]);

  // Per-question timer - only runs for the ACTIVE question
  useEffect(() => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Only start timer if this question is the actively viewed one
    if (exam && activeQuestionIndex === currentQuestion && !skippedQuestions.has(currentQuestion)) {
      if (questionTimeLeft > 0) {
        timerIntervalRef.current = setInterval(() => {
          setQuestionTimeLeft(prevTime => {
            const newTime = prevTime - 1;
            // Update stored time ONLY for current active question
            questionTimersRef.current[currentQuestion] = newTime;
            
            if (newTime <= 0) {
              // Time ran out for this question
              if (!isProcessingTimeoutRef.current) {
                isProcessingTimeoutRef.current = true;
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                
                // Use setTimeout to avoid setState during render
                setTimeout(() => {
                  setSkippedQuestions(prev => new Set([...prev, currentQuestion]));
                  toast.error(`Time's up for question ${currentQuestion + 1}!`);
                  
                  // Move to next question if available
                  if (currentQuestion < exam.questions.length - 1) {
                    const nextQuestion = currentQuestion + 1;
                    setCurrentQuestion(nextQuestion);
                  } else {
                    // Last question, submit exam
                    handleSubmitExam();
                  }
                  isProcessingTimeoutRef.current = false;
                }, 0);
              }
              return 0;
            }
            
            return newTime;
          });
        }, 1000);
      } else if (questionTimeLeft === 0) {
        // Time already expired
        setSkippedQuestions(prev => new Set([...prev, currentQuestion]));
      }
    }

    // Cleanup
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, activeQuestionIndex, currentQuestion, skippedQuestions, handleSubmitExam]);

  // Handle question navigation - set timer when moving to a question
  useEffect(() => {
    if (exam && exam.questions[currentQuestion]) {
      if (skippedQuestions.has(currentQuestion)) {
        // Question time already expired
        setQuestionTimeLeft(0);
        setActiveQuestionIndex(null); // Don't run timer for expired question
      } else if (questionTimersRef.current[currentQuestion] !== undefined) {
        // Question was visited before, use remaining time
        setQuestionTimeLeft(questionTimersRef.current[currentQuestion]);
        setActiveQuestionIndex(currentQuestion); // Activate timer for this question
      } else {
        // First visit to this question, use full time
        const fullTime = exam.questions[currentQuestion].timePerQuestion || 60;
        setQuestionTimeLeft(fullTime);
        questionTimersRef.current[currentQuestion] = fullTime;
        setActiveQuestionIndex(currentQuestion); // Activate timer for this question
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, exam, skippedQuestions]);

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    // Don't allow selecting answer for skipped questions
    if (skippedQuestions.has(questionIndex)) {
      toast.error('Time ran out for this question');
      return;
    }
    
    const updatedAnswers = {
      ...answers,
      [questionIndex]: optionIndex
    };
    
    // Update both state and ref
    setAnswers(updatedAnswers);
    answersRef.current = updatedAnswers; // Keep ref updated for auto-submit
    
    console.log('✏️ Answer selected - Q' + questionIndex + ': Option ' + optionIndex);
    console.log('📋 Updated answersRef:', answersRef.current);
    
    // Auto-save to localStorage
    saveAnswersToLocalStorage(updatedAnswers);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredQuestionsCount = () => {
    return Object.values(answers).filter(answer => answer !== null).length;
  };

  const getProgress = () => {
    return ((currentQuestion + 1) / exam?.questions?.length) * 100 || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-dark-700 border-t-primary-500 dark:border-t-primary-400 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse"></div>
            </div>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Loading Exam...</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Please wait while we prepare your questions</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center p-4">
        <div className="text-center bg-white dark:bg-dark-800 rounded-2xl shadow-sm p-8 max-w-md mx-auto border border-gray-200 dark:border-dark-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Exam Not Found</h2>
          <p className="text-gray-700 dark:text-gray-400 mb-6">The exam you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/student')}
            className="px-6 py-3 bg-primary-500 dark:bg-primary-600 text-white rounded-full hover:bg-primary-600 dark:hover:bg-primary-700 active:bg-primary-700 transition-all duration-200 font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 select-none">
      {/* Fullscreen Prompt Modal */}
      {showFullscreenPrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 max-w-lg w-full mx-4 border border-gray-200 dark:border-dark-700 animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary-500 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                🎯 Ready to Start Exam?
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-400 mb-4 sm:mb-6 leading-relaxed">
                For a fair examination, this exam requires <span className="font-bold text-primary-600 dark:text-primary-400">fullscreen mode</span>. 
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>Click below to enable fullscreen and begin your exam.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-xs sm:text-sm text-yellow-900 dark:text-yellow-200 font-semibold">
                  ⚠️ Important: Exiting fullscreen or switching tabs will result in warnings. 3 warnings = Auto-submit!
                </p>
              </div>
              <button
                onClick={enableFullscreen}
                className="w-full py-3 sm:py-4 bg-primary-500 text-white text-base sm:text-lg md:text-xl rounded-full hover:bg-primary-600 active:bg-primary-700 transition-all duration-300 font-bold flex items-center justify-center gap-2 sm:gap-3"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Start Exam in Fullscreen
              </button>
              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-500 mt-3 sm:mt-4">
                Press ESC anytime to exit fullscreen (but you'll get a warning!)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-5 sm:p-6 md:p-8 max-w-md w-full mx-4 border-2 border-red-500 dark:border-red-400 animate-in zoom-in duration-300">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center animate-pulse">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                  {warningCount >= 3 ? '⚠️ EXAM AUTO-SUBMITTING' : '⚠️ VIOLATION DETECTED'}
                </h3>
                <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-semibold mb-3 sm:mb-4 break-words">
                  {warningMessage}
                </p>
                {warningCount < 3 && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2.5 sm:p-3 rounded-lg border border-yellow-400 dark:border-yellow-600">
                    <p className="text-xs sm:text-sm text-yellow-900 dark:text-yellow-200 font-medium">
                      🚨 {3 - warningCount} warning{3 - warningCount !== 1 ? 's' : ''} remaining before auto-submit!
                    </p>
                  </div>
                )}
                {warningCount >= 3 && (
                  <div className="bg-red-100 dark:bg-red-900/30 p-2.5 sm:p-3 rounded-lg border border-red-400 dark:border-red-600">
                    <p className="text-xs sm:text-sm text-red-900 dark:text-red-200 font-medium">
                      ⛔ Maximum warnings exceeded. Your exam is being submitted automatically...
                    </p>
                  </div>
                )}
              </div>
            </div>
            {warningCount < 3 && (
              <button
                onClick={() => setShowWarningModal(false)}
                className="mt-5 sm:mt-6 w-full py-2.5 sm:py-3 bg-red-600 dark:bg-red-500 text-white text-sm sm:text-base rounded-full hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 transition-all duration-200 font-bold"
              >
                I Understand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Violations Indicator */}
      {warningCount > 0 && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-50 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-xs sm:text-sm text-red-700 dark:text-red-300">Warnings: {warningCount}/3</span>
          </div>
        </div>
      )}
      {/* Header with timer and exam info */}
      <div className="bg-white/95 dark:bg-dark-800/95 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-dark-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {exam.title}
                </h1>
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-primary-500 text-white text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
                  Set {setNumber}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-700 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium truncate">{exam.subject}</p>
            </div>
            
            {/* Timer Stats */}
            <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:pb-0">
              <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gray-50 dark:bg-dark-900 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className={`text-sm sm:text-base font-semibold ${timeLeft < 300 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gray-50 dark:bg-dark-900 flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className={`text-sm sm:text-base font-semibold ${questionTimeLeft <= 10 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {questionTimeLeft}s
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gray-50 dark:bg-dark-900 flex-shrink-0">
                <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                  {getAnsweredQuestionsCount()}/{exam.questions.length}
                </div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3 sm:mt-4">
            <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1 overflow-hidden">
              <div 
                className="h-full bg-primary-500 dark:bg-primary-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Question Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 p-6 sm:p-8">
              {/* Question Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Question {currentQuestion + 1} / {exam.questions.length}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {currentQ.marks} {currentQ.marks !== 1 ? 'marks' : 'mark'}
                  </div>
                </div>
                
                {skippedQuestions.has(currentQuestion) && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      ⏰ Time expired for this question.
                    </p>
                  </div>
                )}
                
                <div className="mb-6">
                  <p className="text-gray-900 dark:text-gray-100 text-lg sm:text-xl leading-relaxed break-words">
                    {currentQ.question}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <label
                    key={index}
                    className={`group block p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                      skippedQuestions.has(currentQuestion)
                        ? 'bg-gray-50 dark:bg-dark-900 opacity-50 cursor-not-allowed'
                        : answers[currentQuestion] === index
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 dark:border-primary-600'
                        : 'border-2 border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={index}
                        checked={answers[currentQuestion] === index}
                        onChange={() => handleAnswerSelect(currentQuestion, index)}
                        disabled={skippedQuestions.has(currentQuestion)}
                        className="h-5 w-5 text-primary-600 focus:ring-2 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="text-gray-900 dark:text-gray-100 text-base sm:text-lg">
                        {option.text}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-dark-700">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => setCurrentQuestion(Math.min(exam.questions.length - 1, currentQuestion + 1))}
                  disabled={currentQuestion === exam.questions.length - 1}
                  className="px-6 py-2.5 text-sm font-semibold bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 p-5 sticky top-20 sm:top-24">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  All Questions
                </h3>
              </div>
              
              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {exam.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`relative w-full aspect-square rounded-lg text-sm font-medium transition-all ${
                      currentQuestion === index
                        ? 'bg-primary-500 text-white'
                        : skippedQuestions.has(index)
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : answers[index] !== null
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-dark-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="space-y-2.5 text-sm mb-5 pb-5 border-b border-gray-200 dark:border-dark-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30"></div>
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-100 dark:bg-dark-900"></div>
                  <span className="text-gray-600 dark:text-gray-400">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30"></div>
                  <span className="text-gray-600 dark:text-gray-400">Time Expired</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="w-full py-3 bg-primary-500 text-white text-sm font-semibold rounded-full hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Exam'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeExam;