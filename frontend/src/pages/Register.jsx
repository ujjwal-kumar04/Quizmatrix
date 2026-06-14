import { useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { validatePassword } from '../utils/helpers';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    college: '',
    branch: '',
    section: '',
    department: '', // Teacher fields
    rollNumber: '', // Student fields
    semester: ''
  });

  // 'Other' कॉलेज चुनने पर कस्टम नाम स्टोर करने के लिए स्टेट
  const [isOtherCollege, setIsOtherCollege] = useState(false);
  const [customCollege, setCustomCollege] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;

    // अगर कॉलेज ड्रॉपडाउन चेंज हो रहा है
    if (name === 'college') {
      if (value === 'Other') {
        setIsOtherCollege(true);
        setFormData(prev => ({ ...prev, college: '' })); // कस्टम इनपुट के लिए खाली करें
      } else {
        setIsOtherCollege(false);
        setCustomCollege('');
        setFormData(prev => ({ ...prev, college: value }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // कस्टम कॉलेज इनपुट हैंडलर
  const handleCustomCollegeChange = (e) => {
    const { value } = e.target;
    setCustomCollege(value);
    setFormData(prev => ({ ...prev, college: value }));
    if (errors.college) {
      setErrors(prev => ({ ...prev, college: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordCheck = validatePassword(formData.password);
      if (!passwordCheck.isValid) {
        newErrors.password = passwordCheck.errors.join(', ');
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'teacher') {
      if (!formData.college.trim()) {
        newErrors.college = 'College is required for teachers';
      }
      if (!formData.branch.trim()) {
        newErrors.branch = 'Stream is required for teachers';
      }
    } else if (formData.role === 'student') {
      if (!formData.college.trim()) {
        newErrors.college = 'College is required for students';
      }
      if (!formData.branch.trim()) {
        newErrors.branch = 'Branch/stream is required for students';
      }
      if (!formData.section.trim()) {
        newErrors.section = 'Section is required for students';
      }
      if (!formData.rollNumber.trim()) {
        newErrors.rollNumber = 'Roll number is required for students';
      }
      if (!formData.semester.trim()) {
        newErrors.semester = 'Semester is required for students';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getMissingFields = () => {
    const missingFields = [];

    if (!formData.name.trim()) missingFields.push('name');
    if (!formData.email.trim()) missingFields.push('email');
    if (!formData.password) missingFields.push('password');
    if (!formData.confirmPassword) missingFields.push('confirm password');
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      missingFields.push('password match');
    }
    if (!formData.college.trim()) missingFields.push('college');
    if (!formData.branch.trim()) missingFields.push('branch');

    if (formData.role === 'student') {
      if (!formData.section.trim()) missingFields.push('section');
      if (!formData.rollNumber.trim()) missingFields.push('roll number');
      if (!formData.semester.trim()) missingFields.push('semester');
    }

    return missingFields;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missingFields = getMissingFields();
    console.log('[Register] submit clicked', { role: formData.role, missingFields, formData });

    if (missingFields.length > 0) {
      setErrors({ submit: `Please fill: ${missingFields.join(', ')}` });
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      await register({
        ...formData,
        email: formData.email.trim().toLowerCase(),
      });
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || 'Registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
        <Loading text="Creating account..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary-500 rounded-full mb-3 sm:mb-4">
            <span className="text-white font-bold text-xl sm:text-2xl">Q</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 px-2">
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Join Quiz Platform
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{errors.submit}</p>
              </div>
            )}
            
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <label className={`cursor-pointer rounded-lg border-2 p-3 sm:p-4 text-center transition-all touch-manipulation active:scale-95 ${
                  formData.role === 'student' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-300 dark:border-slate-600 hover:border-primary-300 dark:hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={formData.role === 'student'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">🎓</div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Student</span>
                </label>
                <label className={`cursor-pointer rounded-lg border-2 p-3 sm:p-4 text-center transition-all touch-manipulation active:scale-95 ${
                  formData.role === 'teacher' 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-300 dark:border-slate-600 hover:border-primary-300 dark:hover:border-slate-500'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="teacher"
                    checked={formData.role === 'teacher'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">👨‍🏫</div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Teacher</span>
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* College & Branch Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {/* College Dropdown */}
              <div>
                <label htmlFor="college" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  College
                </label>
                <select
                  id="college"
                  name="college"
                  required
                  value={isOtherCollege ? 'Other' : formData.college}
                  onChange={handleChange}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.college ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  <option value="">Select College</option>
                  <option value="Budge Budge Institute of Technology">Budge Budge Institute of Technology</option>
                  <option value="Other">Other</option>
                </select>
                {errors.college && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.college}</p>
                )}
              </div>

              {/* Stream / Branch Dropdown */}
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Stream / Branch
                </label>
                <select
                  id="branch"
                  name="branch"
                  required
                  value={formData.branch}
                  onChange={handleChange}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.branch ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  <option value="">Select Stream</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="EE">EE</option>
                  <option value="EEE">EEE</option>
                  <option value="ME">ME</option>
                  <option value="CE">CE</option>
                  <option value="AI & ML">AI & ML</option>
                </select>
                {errors.branch && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.branch}</p>
                )}
              </div>
            </div>

            {/* Custom College Input Box - Only opens when 'Other' is selected */}
            {isOtherCollege && (
              <div className="transition-all duration-200">
                <label htmlFor="customCollege" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Enter College Name
                </label>
                <input
                  id="customCollege"
                  type="text"
                  required
                  value={customCollege}
                  onChange={handleCustomCollegeChange}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.college ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Type your college name"
                />
              </div>
            )}

            {/* Role Specific Fields */}
            {formData.role === 'teacher' ? (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Department (Optional)
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all border-gray-300 dark:border-slate-600"
                  placeholder="e.g., Computer Science"
                />
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Section
                  </label>
                  <input
                    id="section"
                    name="section"
                    type="text"
                    required
                    value={formData.section}
                    onChange={handleChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.section ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="e.g., A"
                  />
                  {errors.section && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.section}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Roll Number
                  </label>
                  <input
                    id="rollNumber"
                    name="rollNumber"
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={handleChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.rollNumber ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="e.g., 2021001"
                  />
                  {errors.rollNumber && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.rollNumber}</p>
                  )}
                </div>

                {/* Semester Dropdown */}
                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Semester
                  </label>
                  <select
                    id="semester"
                    name="semester"
                    required
                    value={formData.semester}
                    onChange={handleChange}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.semester ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem.toString()}>
                        {sem}
                      </option>
                    ))}
                  </select>
                  {errors.semester && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.semester}</p>
                  )}
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Create a password (min 6 characters)"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg text-sm sm:text-base bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full font-semibold text-sm sm:text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign in link */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
            <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;