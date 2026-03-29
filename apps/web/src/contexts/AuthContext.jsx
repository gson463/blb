
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { hasPermission as checkPermission } from '@/lib/permissionUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [assignedProperties, setAssignedProperties] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      updateUserState(pb.authStore.model);
    }
    setInitialLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      updateUserState(model);
    });

    return () => unsubscribe();
  }, []);

  const updateUserState = (model) => {
    setCurrentUser(model);
    setUserRole(model?.role || null);
    setStaffRole(model?.staff_role || null);
    setAssignedProperties(model?.assigned_properties || []);
  };

  const login = async (email, password) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      updateUserState(authData.record);
      return { success: true, user: authData.record };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const signup = async (userData) => {
    try {
      const user = await pb.collection('users').create({
        email: userData.email,
        password: userData.password,
        passwordConfirm: userData.password,
        name: userData.name,
        role: 'landlord',
        company_name: userData.company_name,
        status: 'active',
        emailVisibility: true
      });

      const authData = await pb.collection('users').authWithPassword(userData.email, userData.password);
      updateUserState(authData.record);
      
      return { success: true, user: authData.record };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  };

  const logout = () => {
    pb.authStore.clear();
    updateUserState(null);
    navigate('/');
  };

  const refreshUser = async () => {
    if (!pb.authStore.isValid) return;
    try {
      const auth = await pb.collection('users').authRefresh();
      updateUserState(auth.record);
    } catch (e) {
      console.error('refreshUser', e);
    }
  };

  const isStaff = () => userRole === 'staff';
  const isManager = () => userRole === 'landlord' || (userRole === 'staff' && staffRole === 'manager');
  const isAccountant = () => userRole === 'staff' && staffRole === 'accountant';
  const isCollector = () => userRole === 'staff' && staffRole === 'collector';
  
  const hasPermission = (action) => {
    if (userRole === 'landlord') return true;
    if (userRole === 'staff') return checkPermission(staffRole, action);
    return false;
  };

  const value = {
    currentUser,
    userRole,
    staffRole,
    assignedProperties,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: pb.authStore.isValid,
    initialLoading,
    isStaff,
    isManager,
    isAccountant,
    isCollector,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
