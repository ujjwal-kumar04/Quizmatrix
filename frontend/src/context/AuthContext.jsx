import axios from 'axios';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  // Set up axios defaults
  axios.defaults.baseURL = API_BASE_URL;
  
  const fetchUser = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      // Error fetching user
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refetchUser = useCallback(async () => {
    try {
      const response = await axios.get('/auth/me');
      
     setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Error refetching user:', error);
      return null;
    }
  }, []);
  
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      toast.success('Login successful!');
      
      // Navigate based on role
      if (userData.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else if (userData.role === 'student') {
        navigate('/student-dashboard');
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      const requiresEmailVerification = Boolean(error.response?.data?.requiresEmailVerification);
      if (!requiresEmailVerification) {
        toast.error(message);
      }
      return {
        success: false,
        message,
        requiresEmailVerification,
        email: error.response?.data?.email || email,
      };
    }
  }, [navigate]);

  const register = useCallback(async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      const { message, requiresEmailVerification, emailSent, token, user } = response.data;

      toast.success(message || 'Registration successful.');

      // If backend returned a token, treat user as logged in
      if (token) {
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Navigate based on role
        if (user.role === 'teacher') {
          navigate('/teacher-dashboard');
        } else if (user.role === 'student') {
          navigate('/student-dashboard');
        }

        return { success: true };
      }

      // Fallback: if still requires verification (edge-case), navigate to login with state
      if (requiresEmailVerification) {
        navigate('/login', {
          replace: true,
          state: {
            verificationEmail: userData.email,
            verificationMessage: message,
            emailSent,
          },
        });
        return { success: true, requiresEmailVerification, emailSent };
      }

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  }, [navigate]);

  // Resend verification removed because OTP/email verification is no longer required.

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
    try {
      navigate('/', { replace: true });
    } catch (e) {
      // fallback: ignore navigation errors
    }
  }, [navigate]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    token,
    isAuthenticated: !!user,
    login,
    register,
    
    logout,
    updateProfile,
    refetchUser,
    api: axios, // Export the configured axios instance
  }), [user, loading, token, login, register, logout, updateProfile, refetchUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};