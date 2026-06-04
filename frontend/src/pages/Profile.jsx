import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCalendar, FaCamera, FaTrash } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { BACKEND_URL } from '../config/api';

const Profile = () => {
  const { user, token, updateProfile, loading, api, refetchUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [stats, setStats] = useState({ totalPosts: 0, totalLikes: 0, totalReplies: 0 });
  const [forums, setForums] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', tags: '' });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  const API_URL = BACKEND_URL;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    rollNumber: '',
    class: '',
    semester: '',
    country: '',
    state: '',
    college: '',
    branch: '',
    linkedin: '',
    leetcode: '',
    github: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        rollNumber: user.rollNumber || '',
        class: user.class || '',
        semester: user.semester || '',
        country: user.country || '',
        state: user.state || '',
        college: user.college || '',
        branch: user.branch || '',
        linkedin: user.linkedin || '',
        leetcode: user.leetcode || '',
        github: user.github || '',
      });
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserData = async () => {
    if (!user?._id) return;
    try {
      const response = await axios.get(`${API_URL}/api/auth/user/${user._id}`);
      setStats(response.data.stats);
      setForums(response.data.forums);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Please login to create a post');
      return;
    }

    try {
      const tagsArray = newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const response = await axios.post(
        `${API_URL}/api/forums`,
        {
          content: newPost.content,
          tags: tagsArray
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Forum post created successfully!');
        setShowCreateModal(false);
        setNewPost({ content: '', tags: '' });
        fetchUserData();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const profileData = {
      name: formData.name,
      country: formData.country,
      state: formData.state,
      college: formData.college,
      branch: formData.branch,
      linkedin: formData.linkedin,
      leetcode: formData.leetcode,
      github: formData.github,
    };
    if (user.role === 'teacher') {
      profileData.department = formData.department;
    }
    if (user.role === 'student') {
      profileData.rollNumber = formData.rollNumber;
      profileData.class = formData.class;
      profileData.semester = formData.semester;
    }
    const success = await updateProfile(profileData);
    if (success) {
      setEditMode(false);
      fetchUserData();
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      await api.post('/auth/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refetch user data to update profile image without page reload
      await refetchUser();

      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Profile picture upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (!user.profileImage) {
      toast.error('No profile picture to delete');
      return;
    }

    if (!window.confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    setUploading(true);

    try {
      await api.delete('/auth/delete-profile-picture');

      // Refetch user data to update profile image without page reload
      await refetchUser();

      toast.success('Profile picture deleted successfully!');
    } catch (error) {
      console.error('Profile picture deletion error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete profile picture');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatJoinDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Please log in to see your profile.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <div className="max-w-2xl mx-auto bg-white dark:bg-dark-900 min-h-screen border-x border-gray-200 dark:border-dark-800">
        {/* Twitter-style Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-800">
          <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 dark:hover:bg-dark-800 p-1.5 sm:p-2 rounded-full transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stats.totalPosts} posts</p>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="border-b-4 sm:border-b-8 border-gray-200 dark:border-dark-800">
          {/* Cover Image */}
          <div className="h-24 sm:h-32 md:h-48 bg-gradient-to-r from-primary-400 to-purple-500"></div>
          
          <div className="px-3 sm:px-4 pb-3 sm:pb-4">
            {/* Avatar with Upload Controls */}
            <div className="flex justify-between items-start -mt-12 sm:-mt-16 md:-mt-20 mb-2 sm:mb-3">
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full object-cover border-3 sm:border-4 border-white dark:border-dark-900"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold border-3 sm:border-4 border-white dark:border-dark-900">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleProfilePictureClick}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-1.5 sm:p-2 text-white hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg touch-manipulation"
                  title="Upload profile picture"
                >
                  {uploading ? (
                    <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <FaCamera className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>

                {user.profileImage && (
                  <button
                    onClick={handleDeleteProfilePicture}
                    disabled={uploading}
                    className="absolute top-0 right-0 bg-red-600 rounded-full p-1.5 sm:p-2 text-white hover:bg-red-700 active:bg-red-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg touch-manipulation"
                    title="Delete profile picture"
                  >
                    <FaTrash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setEditMode(!editMode)}
                className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-gray-300 dark:border-dark-700 text-xs sm:text-sm font-semibold hover:bg-gray-100 dark:hover:bg-dark-800 active:bg-gray-200 dark:active:bg-dark-700 transition-colors text-gray-900 dark:text-white touch-manipulation"
              >
                {editMode ? 'Cancel' : 'Edit profile'}
              </button>
            </div>

            {/* User Info */}
            <div className="mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                {user.role === 'teacher' && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">@{user.email.split('@')[0]}</p>

              {/* Role Badge */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                  user.role === 'teacher' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                }`}>
                  {user.role === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student'}
                </span>
                {user.department && (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-gray-300">
                    📚 {user.department}
                  </span>
                )}
              </div>

              {/* Additional Info */}
              {user.role === 'student' && !editMode && (
                <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                  {user.rollNumber && <span>Roll: {user.rollNumber}</span>}
                  {user.class && <span>• Class: {user.class}</span>}
                  {user.semester && <span>• Semester: {user.semester}</span>}
                </div>
              )}

              {/* Location Info */}
              {!editMode && (user.college || user.branch || user.country) && (
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 space-y-0.5">
                  {user.college && <div>🏫 {user.college}</div>}
                  {user.branch && <div>🎯 {user.branch}</div>}
                  {(user.country || user.state) && (
                    <div>📍 {[user.state, user.country].filter(Boolean).join(', ')}</div>
                  )}
                </div>
              )}

              {/* Join Date */}
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">
                <FaCalendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Joined {formatJoinDate(user.createdAt)}</span>
              </div>

              {/* Social Links */}
              {!editMode && (user.linkedin || user.github || user.leetcode) && (
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {user.linkedin && (
                    <a
                      href={user.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs sm:text-sm flex items-center gap-1 touch-manipulation"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {user.github && (
                    <a
                      href={user.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 dark:text-white hover:underline text-xs sm:text-sm flex items-center gap-1 touch-manipulation"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                  )}
                  {user.leetcode && (
                    <a
                      href={user.leetcode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline text-xs sm:text-sm flex items-center gap-1 touch-manipulation"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                      LeetCode
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{stats.totalPosts}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Posts</span>
              </div>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{stats.totalLikes}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Likes</span>
              </div>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">{stats.totalReplies}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Replies</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form or Posts */}
        {editMode ? (
          <div className="px-3 sm:px-4 py-4 sm:py-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white text-xs sm:text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-gray-100 dark:bg-dark-700 dark:text-gray-400 cursor-not-allowed text-xs sm:text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">College/University</label>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch/Department</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              {user.role === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                  />
                </div>
              )}

              {user.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roll Number</label>
                    <input
                      type="text"
                      name="rollNumber"
                      value={formData.rollNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                    <input
                      type="text"
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                    <input
                      type="text"
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn Profile URL</label>
                <input
                  type="text"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Profile URL</label>
                <input
                  type="text"
                  name="github"
                  value={formData.github}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LeetCode Profile URL</label>
                <input
                  type="text"
                  name="leetcode"
                  value={formData.leetcode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 rounded-full font-semibold hover:bg-primary-700 active:bg-primary-800 transition-colors text-sm sm:text-base touch-manipulation"
              >
                Save Changes
              </button>
            </form>
          </div>
        ) : (
          /* Posts Section */
          <div>
            <div className="border-b border-gray-200 dark:border-dark-800">
              <div className="px-3 sm:px-4 py-2 sm:py-3">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Posts</h3>
              </div>
            </div>

            {forums.length === 0 ? (
              <div className="text-center py-12 sm:py-16 px-3 sm:px-4">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 dark:text-gray-600 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">No posts yet</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">Start sharing your thoughts</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-full px-4 sm:px-6 py-2 sm:py-2.5 font-semibold transition-colors text-sm sm:text-base touch-manipulation"
                >
                  Create Post
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-dark-800">
                {forums.map((forum) => (
                  <Link
                    key={forum._id}
                    to={`/forums/${forum._id}`}
                    className="block hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors duration-200"
                  >
                    <div className="px-4 py-3">
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-base font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                              {user.name}
                            </span>
                            {user.role === 'teacher' && (
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-gray-500 dark:text-gray-400 text-sm">·</span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm">
                              {formatTime(forum.createdAt)}
                            </span>
                          </div>

                          <p className="text-sm sm:text-base text-gray-900 dark:text-white mb-2 line-clamp-4 leading-relaxed break-words whitespace-pre-wrap">
                            {forum.content}
                          </p>

                          <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400 text-sm">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="font-medium">{forum.replies.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span className="font-medium">{forum.likes.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="font-medium">{forum.views}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Twitter-style Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-12">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Simple Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-900 px-4 py-3 border-b border-gray-200 dark:border-dark-800 flex items-center justify-between">
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 p-2 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button 
                type="submit" 
                form="create-post-form"
                className="bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
                disabled={!newPost.content}
              >
                Post
              </button>
            </div>

            <form id="create-post-form" onSubmit={handleCreatePost} className="p-4">
              {/* Content Areas - Minimal Styling */}
              <div className="space-y-3">
                <textarea
                  required
                  rows={8}
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full border-0 text-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none resize-none bg-transparent"
                  placeholder="What's on your mind?"
                  maxLength={5000}
                />

                {/* Tags Row */}
                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-dark-800">
                  <input
                    type="text"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                    className="flex-1 border border-gray-300 dark:border-dark-700 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-transparent"
                    placeholder="Tags (comma-separated)"
                  />
                </div>

                {/* Character Count */}
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 text-right">
                  <span>{newPost.content.length}/5000</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
