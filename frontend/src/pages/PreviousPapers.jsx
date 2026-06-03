import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaDownload, FaFilter, FaSearch, FaTimes, FaTrash, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const PreviousPapers = () => {
  const { user, api } = useAuth();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showFilters, setShowFilters] = useState(true); // Auto-show filters for students
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    country: '',
    state: '',
    college: '',
    branch: '',
    semester: '',
    subject: '',
    year: '',
    search: ''
  });
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    states: [],
    colleges: [],
    branches: [],
    semesters: [],
    subjects: [],
    years: []
  });

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    year: new Date().getFullYear().toString(),
    country: user?.country || '',
    state: user?.state || '',
    college: user?.college || '',
    branch: user?.branch || '',
    semester: user?.semester || ''
  });

  useEffect(() => {
    fetchFilterOptions();
    fetchPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto-populate form with user profile data
    if (user) {
      setFormData(prev => ({
        ...prev,
        country: user.country || '',
        state: user.state || '',
        college: user.college || '',
        branch: user.branch || '',
        semester: user.semester || ''
      }));
      
      // Auto-set filters for students based on their profile
      if (user.role === 'student') {
        setFilters({
          country: user.country || '',
          state: user.state || '',
          college: user.college || '',
          branch: user.branch || '',
          semester: user.semester || '',
          subject: '',
          year: '',
          search: ''
        });
      }
    }
  }, [user]);

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/previous-papers/filters');
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await api.get(`/previous-papers?${queryParams.toString()}`);
      setPapers(response.data);
    } catch (error) {
      toast.error('Failed to fetch papers');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!file.type.includes('pdf')) {
        toast.error('Only PDF files are allowed');
        return;
      }
      setSelectedFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }

    if (!formData.title || !formData.subject || !formData.year || 
        !formData.country || !formData.state || !formData.college || 
        !formData.branch || !formData.semester) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('subject', formData.subject);
      uploadFormData.append('year', formData.year);
      uploadFormData.append('country', formData.country);
      uploadFormData.append('state', formData.state);
      uploadFormData.append('college', formData.college);
      uploadFormData.append('branch', formData.branch);
      uploadFormData.append('semester', formData.semester);

      await api.post('/previous-papers/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Paper uploaded successfully!');
      setShowUploadForm(false);
      setFormData({
        title: '',
        subject: '',
        year: new Date().getFullYear().toString(),
        country: user?.country || '',
        state: user?.state || '',
        college: user?.college || '',
        branch: user?.branch || '',
        semester: user?.semester || ''
      });
      setSelectedFile(null);
      fetchPapers();
      fetchFilterOptions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (paper) => {
    try {
      toast.loading('Preparing download...');

      const response = await api.get(`/previous-papers/download/${paper._id}`, {
        responseType: 'blob'
      });

      toast.dismiss();
      toast.loading('Downloading file...');

      const blob = response.data;
      const blobUrl = window.URL.createObjectURL(blob);

      const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
      let fileName = 'paper.pdf';
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) fileName = match[1];
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
      
      toast.dismiss();
      toast.success('Download completed! Check your downloads folder.');
    } catch (error) {
      console.error('Download error:', error);
      toast.dismiss();
      let errorMessage = error?.response?.data?.message || error.message || 'Download failed';
      let fileNotAvailable = error?.response?.data?.fileNotAvailable || false;

      if (error?.response?.data instanceof Blob && error.response.data.type?.includes('application/json')) {
        try {
          const parsedError = JSON.parse(await error.response.data.text());
          errorMessage = parsedError.message || errorMessage;
          fileNotAvailable = parsedError.fileNotAvailable || fileNotAvailable;
        } catch (parseError) {
          console.error('Failed to parse download error response:', parseError);
        }
      }
      
      if (fileNotAvailable ||
          errorMessage.includes('not found on server') || 
          errorMessage.includes('File not found') ||
          errorMessage.includes('fileNotAvailable')) {
        toast.error('⚠️ File no longer available on server. Please contact the teacher to re-upload this file.', {
          duration: 6000,
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            fontWeight: '500'
          }
        });
      } else if (errorMessage.includes('Previous paper not found')) {
        toast.error('This paper has been deleted or is no longer available.');
      } else {
        toast.error(errorMessage || 'Failed to download file. Please try again.');
      }
    }
  };

  const handleDelete = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this paper?')) {
      return;
    }

    try {
      await api.delete(`/previous-papers/${paperId}`);
      toast.success('Paper deleted successfully');
      fetchPapers();
    } catch (error) {
      toast.error('Delete failed');
      console.error('Delete error:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      country: user?.role === 'student' ? user.country || '' : '',
      state: user?.role === 'student' ? user.state || '' : '',
      college: user?.role === 'student' ? user.college || '' : '',
      branch: user?.role === 'student' ? user.branch || '' : '',
      semester: user?.role === 'student' ? user.semester || '' : '',
      subject: '',
      year: '',
      search: ''
    });
  };

  if (loading && papers.length === 0) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 py-4 sm:py-6">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Previous Year Question Papers
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
              {user?.role === 'teacher' ? 'Upload and manage' : 'Search and download'} previous papers
            </p>
          </div>
          
          {user?.role === 'teacher' && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-primary-500 text-white rounded-full hover:bg-primary-600 active:bg-primary-700 transition-all font-semibold touch-manipulation"
            >
              <FaUpload />
              {showUploadForm ? 'Cancel' : 'Upload Paper'}
            </button>
          )}
        </div>

       

        {/* Upload Form (Teacher Only) */}
        {showUploadForm && user?.role === 'teacher' && (
          <div className="bg-white dark:bg-dark-800 rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              Upload Previous Paper
            </h2>
            <form onSubmit={handleUpload} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input
                  type="text"
                  placeholder="Paper Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="Subject *"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="Year *"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="Country *"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="State/Province *"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="College/University *"
                  value={formData.college}
                  onChange={(e) => setFormData({...formData, college: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="Branch (e.g., CSE, ECE) *"
                  value={formData.branch}
                  onChange={(e) => setFormData({...formData, branch: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
                <input
                  type="text"
                  placeholder="Semester (e.g., 1, 2, 3) *"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                  required
                />
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-3 sm:p-4 md:p-6 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload" 
                  className="cursor-pointer flex flex-col items-center touch-manipulation"
                >
                  <FaUpload className="text-2xl sm:text-3xl md:text-4xl text-gray-400 mb-1.5 sm:mb-2" />
                  <span className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                    {selectedFile ? selectedFile.name : 'Click to select PDF file (Max 10MB)'}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm md:text-base font-medium touch-manipulation"
              >
                {uploading ? 'Uploading...' : 'Upload Paper'}
              </button>
            </form>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white dark:bg-dark-800 rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FaFilter className="text-sm sm:text-base" />
              Search & Filter Papers
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-xs sm:text-sm md:text-base text-blue-600 dark:text-blue-400 hover:underline touch-manipulation self-start sm:self-auto"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Auto-filter indicator for students */}
          {user?.role === 'student' && (user?.country || user?.state || user?.college || user?.branch || user?.semester) && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-[10px] sm:text-xs md:text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">✓ Auto-filtered:</span> Papers matching your profile ({user?.country}{user?.state ? `, ${user.state}` : ''}{user?.college ? `, ${user.college}` : ''}{user?.branch ? `, ${user.branch}` : ''}{user?.semester ? `, Semester ${user.semester}` : ''})
              </p>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-3 sm:mb-4">
            <FaSearch className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs sm:text-sm" />
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
            />
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="space-y-3 sm:space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <select
                  value={filters.country}
                  onChange={(e) => setFilters({...filters, country: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All Countries</option>
                  {filterOptions.countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={filters.state}
                  onChange={(e) => setFilters({...filters, state: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All States</option>
                  {filterOptions.states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={filters.college}
                  onChange={(e) => setFilters({...filters, college: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All Colleges</option>
                  {filterOptions.colleges.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={filters.branch}
                  onChange={(e) => setFilters({...filters, branch: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All Branches</option>
                  {filterOptions.branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({...filters, semester: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All Semesters</option>
                  {filterOptions.semesters.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({...filters, subject: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All Subjects</option>
                  {filterOptions.subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select
                  value={filters.year}
                  onChange={(e) => setFilters({...filters, year: e.target.value})}
                  className="px-2 sm:px-3 md:px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:text-white text-xs sm:text-sm md:text-base"
                >
                  <option value="">All Years</option>
                  {filterOptions.years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  onClick={clearFilters}
                  className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-dark-500 active:bg-gray-400 dark:active:bg-dark-400 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base touch-manipulation"
                >
                  <FaTimes className="text-xs sm:text-sm" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Papers Grid */}
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
            Found {papers.length} paper{papers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {papers.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl sm:rounded-2xl shadow-md p-6 sm:p-8 md:p-12 text-center">
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
              No papers found matching your filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-xs sm:text-sm md:text-base touch-manipulation"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {papers.map(paper => (
              <div
                key={paper._id}
                className="bg-white dark:bg-dark-800 rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 md:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white pr-2">
                    {paper.title}
                  </h3>
                  {user?.role === 'teacher' && paper.teacher._id === user.id && (
                    <button
                      onClick={() => handleDelete(paper._id)}
                      className="text-red-600 hover:text-red-700 active:text-red-800 p-1 touch-manipulation"
                      title="Delete"
                    >
                      <FaTrash className="text-xs sm:text-sm md:text-base" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 text-[10px] sm:text-xs md:text-sm">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] sm:text-xs">
                      {paper.subject}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px] sm:text-xs">
                      Year: {paper.year}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] sm:text-xs">
                      Sem: {paper.semester}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Branch:</strong> {paper.branch}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>College:</strong> {paper.college}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Location:</strong> {paper.state}, {paper.country}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <strong>Uploaded by:</strong> {paper.teacher.name}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500">
                    Downloads: {paper.downloadCount}
                  </p>
                </div>

                <button
                  onClick={() => handleDownload(paper)}
                  className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 active:from-green-800 active:to-teal-800 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base touch-manipulation"
                >
                  <FaDownload className="text-xs sm:text-sm" />
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviousPapers;
