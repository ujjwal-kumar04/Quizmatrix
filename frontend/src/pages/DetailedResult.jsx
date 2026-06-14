import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DetailedResult = () => {
  const { resultId } = useParams();
  const { user, api } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    const fetchDetailedResult = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/results/detailed/${resultId}`);
        setResult(response.data.result);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch detailed result.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedResult();
  }, [resultId]);

  const downloadExcel = async () => {
    if (!result) return;

    // Summary sheet data
    const summaryData = [{
      'Exam': result.exam.title,
      'Student': result.student.name,
      'Roll Number': result.student.rollNumber,
      'Set Number': result.setNumber || 1,
      'Score': `${result.obtainedMarks}/${result.totalMarks}`,
      'Percentage': `${result.percentage.toFixed(2)}%`,
      'Rank': result.rank,
      'Time Taken': `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`,
      'Submitted At': new Date(result.submittedAt).toLocaleString()
    }];

    // Questions sheet data
    const questionsData = (result.answers || []).map((answer, index) => {
      const question = result.exam?.questions?.[index];
      const selectedOption = question?.options?.[answer.selectedOption];
      const correctOption = question?.options?.find(opt => opt.isCorrect);

      return {
        'Q.No': index + 1,
        'Question': question?.question || 'N/A',
        'Your Answer': selectedOption?.text || 'Not Answered',
        'Correct Answer': correctOption?.text || 'N/A',
        'Status': answer.isCorrect ? '✓ Correct' : '✗ Wrong',
        'Marks': `${answer.marks}/${question?.marks || 0}`
      };
    });

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Exam', key: 'Exam', width: 30 },
      { header: 'Student', key: 'Student', width: 24 },
      { header: 'Roll Number', key: 'Roll Number', width: 16 },
      { header: 'Set Number', key: 'Set Number', width: 12 },
      { header: 'Score', key: 'Score', width: 12 },
      { header: 'Percentage', key: 'Percentage', width: 12 },
      { header: 'Rank', key: 'Rank', width: 10 },
      { header: 'Time Taken', key: 'Time Taken', width: 18 },
      { header: 'Submitted At', key: 'Submitted At', width: 24 }
    ];
    summarySheet.addRows(summaryData);

    const questionsSheet = workbook.addWorksheet('Questions');
    questionsSheet.columns = [
      { header: 'Q.No', key: 'Q.No', width: 8 },
      { header: 'Question', key: 'Question', width: 50 },
      { header: 'Your Answer', key: 'Your Answer', width: 30 },
      { header: 'Correct Answer', key: 'Correct Answer', width: 30 },
      { header: 'Status', key: 'Status', width: 12 },
      { header: 'Marks', key: 'Marks', width: 10 }
    ];
    questionsSheet.addRows(questionsData);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.exam.title}_${result.student.name}_Result.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!result) return;

    try {
      const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text(result.exam.title, 14, 20);
    
    // Student Info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Student: ${result.student.name}`, 14, 32);
    doc.text(`Roll Number: ${result.student.rollNumber}`, 14, 39);
    doc.text(`Set Number: ${result.setNumber || 1}`, 14, 46);
    
    // Performance Summary Box
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.rect(14, 53, 182, 35);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Performance Summary', 18, 61);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.text(`Score: ${result.obtainedMarks}/${result.totalMarks}`, 18, 70);
    doc.text(`Percentage: ${result.percentage.toFixed(2)}%`, 18, 77);
    doc.text(`Rank: #${result.rank}`, 100, 70);
    doc.text(`Time: ${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`, 100, 77);
    doc.text(`Submitted: ${new Date(result.submittedAt).toLocaleString()}`, 18, 84);

    // Questions table
    const tableData = (result.answers || []).map((answer, index) => {
      const question = result.exam?.questions?.[index];
      return [
        index + 1,
        question?.question?.substring(0, 60) + (question?.question?.length > 60 ? '...' : '') || 'N/A',
        answer.isCorrect ? '✓' : '✗',
        `${answer.marks}/${question?.marks || 0}`
      ];
    });

      autoTable(doc, {
      head: [['Q.No', 'Question', 'Result', 'Marks']],
      body: tableData,
      startY: 95,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 120 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' }
      },
      didDrawCell: (data) => {
        if (data.column.index === 2 && data.section === 'body' && data.cell.text) {
          const text = data.cell.text[0];
          if (text === '✓') {
            doc.setTextColor(34, 197, 94); // Green
          } else if (text === '✗') {
            doc.setTextColor(239, 68, 68); // Red
          }
        }
      }
      });

      const fileName = `${result.exam.title}_${result.student.name}_Result.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF download failed. Please try again.');
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading detailed result..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center text-center p-4 animate-fadeIn">
        <div className="max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(user?.role === 'teacher' ? "/teacher" : "/student")}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const getOptionClassName = (option, selectedOption) => {
    let base = "p-4 rounded-lg border-2 transition-all duration-200 ";
    const isSelected = option.id === selectedOption;
    const isCorrect = option.isCorrect;

    if (isSelected && isCorrect) {
      return base + "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-500 shadow-sm";
    }
    if (isSelected && !isCorrect) {
      return base + "bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-500 shadow-sm";
    }
    if (!isSelected && isCorrect) {
      return base + "bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-700";
    }
    return base + "bg-gray-100 border-gray-300 dark:bg-dark-800 dark:border-dark-600";
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const correctAnswers = result.answers.filter(a => a.isCorrect).length;
  const totalQuestions = result.answers.length;
  const accuracy = ((correctAnswers / totalQuestions) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 animate-fadeIn">
      <div className="max-w-5xl mx-auto py-3 sm:py-4 md:py-6 lg:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Link 
            to={`/results/${result.exam._id}`} 
            className="inline-flex items-center text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:underline mb-3 sm:mb-4 group touch-manipulation"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Results
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                {result.exam.title}
              </h1>
              {result.setNumber && (
                <span className="px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] sm:text-xs md:text-sm font-semibold rounded-full shadow-md whitespace-nowrap flex-shrink-0">
                  Set {result.setNumber}
                </span>
              )}
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
              <button
                onClick={downloadExcel}
                className="inline-flex items-center justify-center px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg transition-colors shadow-md text-xs sm:text-sm md:text-base touch-manipulation"
                title="Download as Excel"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={downloadPDF}
                className="inline-flex items-center justify-center px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors shadow-md text-xs sm:text-sm md:text-base touch-manipulation"
                title="Download as PDF"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{result.student.name}</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>{result.student.rollNumber}</span>
            </div>
          </div>
        </div>

        {/* Performance Summary Card */}
        <div className="card mb-6 md:mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-semibold text-white">Performance Summary</h2>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                aria-label={showSummary ? 'Hide summary' : 'Show summary'}
              >
                <svg className={`w-5 h-5 transform transition-transform ${showSummary ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {showSummary && (
            <div className="p-4 md:p-6 animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="text-center">
                  <div className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Score</div>
                  <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(result.percentage)}`}>
                    {result.obtainedMarks}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">/ {result.totalMarks}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Percentage</div>
                  <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(result.percentage)}`}>
                    {result.percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Grade</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Rank</div>
                  <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                    #{result.rank}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Position</div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Time Taken</div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.floor(result.timeTaken / 60)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{result.timeTaken % 60}s</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Accuracy</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{correctAnswers}/{totalQuestions} correct</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      accuracy >= 80 ? 'bg-green-500' : 
                      accuracy >= 60 ? 'bg-blue-500' : 
                      accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">{accuracy}% accuracy</div>
              </div>
            </div>
          )}
        </div>

        {/* Questions Review */}
        <div>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">Answer Review</h2>
            <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Correct</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Incorrect</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            {result.answers.map((answer, index) => (
              
              <div 
                key={answer._id || answer.questionId || index} 
                className="card hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div className="flex items-start space-x-2 md:space-x-3 flex-1">
                    <span className={`flex-shrink-0 w-7 md:w-8 h-7 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
                      answer.isCorrect 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {index + 1}
                    </span>
                    <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-white flex-1">
                      {answer.question}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1 md:space-x-2 ml-2 md:ml-4">
                    {answer.isCorrect ? (
                      <svg className="w-5 md:w-6 h-5 md:h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 md:w-6 h-5 md:h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={`font-bold text-base md:text-lg ${
                      answer.isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {answer.isCorrect ? `+${answer.marks}` : '+0'} / {answer.maxMarks}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  {answer.options.map((option) => (
                    <div 
                      key={option._id} 
                      className={getOptionClassName(option, answer.selectedOption)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {option.id === answer.selectedOption && !option.isCorrect && (
                            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          {option.isCorrect && (
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {option.id !== answer.selectedOption && !option.isCorrect && (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-dark-600"></div>
                          )}
                        </div>
                        <p className="font-medium text-gray-800 dark:text-gray-200 flex-1">{option.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => window.print()}
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Result</span>
          </button>
          <Link
            to={user?.role === 'teacher' ? "/teacher" : "/student"}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DetailedResult);
