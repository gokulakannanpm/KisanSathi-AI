import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('kisansathi_token') || null);
  const [isDemoMode, setIsDemoMode] = useState(() => !sessionStorage.getItem('kisansathi_token'));
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Restore session on mount / refresh
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = sessionStorage.getItem('kisansathi_token');
      if (storedToken) {
        try {
          const authData = await apiService.getCurrentUser();
          if (authData && authData.user) {
            setUser(authData.user);
            setToken(storedToken);
            setIsDemoMode(false);
          } else {
            // Invalid or expired token
            sessionStorage.removeItem('kisansathi_token');
            setUser(null);
            setToken(null);
            setIsDemoMode(true);
          }
        } catch {
          sessionStorage.removeItem('kisansathi_token');
          setUser(null);
          setToken(null);
          setIsDemoMode(true);
        }
      } else {
        setIsDemoMode(true);
      }
      setAuthLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (phone, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiService.loginFarmer(phone, password);
      sessionStorage.setItem('kisansathi_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      setIsDemoMode(false);
      setIsLoginOpen(false);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (formData) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiService.registerFarmer(formData);
      sessionStorage.setItem('kisansathi_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      setIsDemoMode(false);
      setIsRegisterOpen(false);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await apiService.logoutFarmer();
    sessionStorage.removeItem('kisansathi_token');
    setUser(null);
    setToken(null);
    setIsDemoMode(true);
  };

  const switchToDemo = () => {
    setIsDemoMode(true);
  };

  const switchToRegistered = () => {
    if (user) {
      setIsDemoMode(false);
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isDemoMode,
      authLoading,
      authError,
      setAuthError,
      login,
      register,
      logout,
      switchToDemo,
      switchToRegistered,
      isLoginOpen,
      setIsLoginOpen,
      isRegisterOpen,
      setIsRegisterOpen,
      openLogin: () => { setAuthError(null); setIsLoginOpen(true); setIsRegisterOpen(false); },
      closeLogin: () => setIsLoginOpen(false),
      openRegister: () => { setAuthError(null); setIsRegisterOpen(true); setIsLoginOpen(false); },
      closeRegister: () => setIsRegisterOpen(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
