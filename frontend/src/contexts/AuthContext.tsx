import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '../services/authService';
import ForcePasswordChangeModal from '../components/forms/ForcePasswordChangeModal';

interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  profile: string;
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
          
          // Check if password change is required
          if (userData.force_password_change) {
            setShowPasswordChangeModal(true);
          }
        }
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      // Check if password change is required
      if (response.user.force_password_change) {
        setShowPasswordChangeModal(true);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setShowPasswordChangeModal(false);
    authService.logout();
  };

  const handlePasswordChanged = () => {
    console.log('🔄 NEW CODE: Password changed successfully - no logout required');
    // Password was changed successfully, update user state and close modal
    setShowPasswordChangeModal(false);
    
    // Update the user object to remove the force_password_change flag
    if (user) {
      setUser({ ...user, force_password_change: false });
    }
    
    // Show success message (you can customize this with a toast/snackbar if preferred)
    alert('Password has been updated successfully!');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Force Password Change Modal */}
      {user && (
        <ForcePasswordChangeModal
          open={showPasswordChangeModal}
          onPasswordChanged={handlePasswordChanged}
          onClose={() => setShowPasswordChangeModal(false)}
          userEmail={user.email}
        />
      )}
    </AuthContext.Provider>
  );
};

