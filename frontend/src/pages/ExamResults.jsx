import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ExamResults = () => {
  const { examId } = useParams();
  const { user, api } = useAuth();
  const [results, setResults] = useState([]);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const endpoint = user.role === 'teacher' 
          ? `/results/exam/${examId}` 
          : `/results/my-result/${examId}`;
        const response = await api.get(endpoint);
        setResults(response.data.results);
        setExam(response.data.exam);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch results.');
        // Fetch results error
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [examId, user.role, api]);

  const downloadExcel = async () => {
    if (!results || results.length === 0) return;

    const data = results.map((result, index) => ({
      rank: result.rank || index + 1,
      studentName: result.student?.name || 'N/A',
      rollNumber: result.student?.rollNumber || 'N/A',
      score: `${result.obtainedMarks}/${result.totalMarks}`,
      percentage: `${result.percentage.toFixed(2)}%`,
      timeTaken: `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`,
      setNumber: result.setNumber || 1,
      submittedAt: new Date(result.submittedAt).toLocaleString()
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');

    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Student Name', key: 'studentName', width: 22 },
      { header: 'Roll Number', key: 'rollNumber', width: 16 },
      { header: 'Score', key: 'score', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Time Taken', key: 'timeTaken', width: 18 },
      { header: 'Set Number', key: 'setNumber', width: 12 },
      { header: 'Submitted At', key: 'submittedAt', width: 24 }
    ];

    worksheet.addRows(data);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${exam?.title || 'Exam'}_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!results || results.length === 0) return;

    try {
      const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(exam?.title || 'Exam Results', 14, 20);
    
    // Add exam info
    doc.setFontSize(11);
    doc.text(`Subject: ${exam?.subject || 'N/A'}`, 14, 30);
    doc.text(`Total Students: ${results.length}`, 14, 37);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

    // Prepare table data
    const tableData = results.map(result => [
      result.rank || '-',
      result.student?.name || 'N/A',
      result.student?.rollNumber || 'N/A',
      `${result.obtainedMarks}/${result.totalMarks}`,
      `${result.percentage.toFixed(2)}%`,
      `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`,
      `Set ${result.setNumber || 1}`
    ]);

    // Add table
      autoTable(doc, {
      head: [['Rank', 'Student', 'Roll No', 'Score', '%', 'Time', 'Set']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      const fileName = `${exam?.title || 'Exam'}_Results_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF download failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center">
        <Loading text="Loading results..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center text-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Link to={user?.role === 'teacher' ? "/teacher" : "/student"} className="btn-primary mt-6">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <div className="max-w-7xl mx-auto py-3 sm:py-4 md:py-6 lg:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Link to={user?.role === 'teacher' ? "/teacher" : "/student"} className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:underline mb-3 sm:mb-4 inline-block touch-manipulation">
            &larr; Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Results for: {exam?.title}
              </h1>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                {exam?.subject}
              </p>
            </div>
            {results.length > 0 && (
              <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
                <button
                  onClick={downloadExcel}
                  className="inline-flex items-center justify-center px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg transition-colors shadow-md text-xs sm:text-sm md:text-base touch-manipulation"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>
                <button
                  onClick={downloadPDF}
                  className="inline-flex items-center justify-center px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors shadow-md text-xs sm:text-sm md:text-base touch-manipulation"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {results.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 text-gray-300 dark:text-dark-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Submissions Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              No students have submitted this exam yet.
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Time Taken
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Submitted
                  </th>
                   <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">View Details</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-900 divide-y divide-gray-200 dark:divide-dark-700">
                {results.map((result) => (
                  <tr key={result._id} className="hover:bg-gray-50 dark:hover:bg-dark-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {result.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {result.student?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {result.student?.rollNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">{result.obtainedMarks}</span> / {result.totalMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {result.percentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {`${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(result.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/result/detailed/${result._id}`} className="text-primary-600 hover:text-primary-800">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResults;