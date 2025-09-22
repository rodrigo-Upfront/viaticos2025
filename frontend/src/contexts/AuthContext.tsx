import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { LoginResult } from '../services/authService';
import { AuthService } from '../services/authService';
import ForcePasswordChangeModal from '../components/forms/ForcePasswordChangeModal';
import MFALoginModal from '../components/forms/MFALoginModal';
import ForcedMFASetupModal from '../components/forms/ForcedMFASetupModal';

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
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaToken, setMfaToken] = useState<string>('');
  const [mfaMessage, setMfaMessage] = useState<string>('');
  const [showForcedMFASetupModal, setShowForcedMFASetupModal] = useState(false);
  const [setupToken, setSetupToken] = useState<string>('');
  const [setupMessage, setSetupMessage] = useState<string>('');

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
      const response: LoginResult = await authService.login(email, password);
      
      // Check if MFA setup is required (forced by admin)
      if (AuthService.requiresMFASetup(response)) {
        setSetupToken(response.setup_token);
        setSetupMessage(response.message);
        setShowForcedMFASetupModal(true);
        return;
      }
      
      // Check if MFA verification is required
      if (AuthService.requiresMFA(response)) {
        setMfaToken(response.mfa_token);
        setMfaMessage(response.message);
        setShowMFAModal(true);
        return;
      }
      
      // Complete login flow
      if (AuthService.isCompleteLogin(response)) {
        setUser(response.user);
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        
        // Check if password change is required
        if (response.user.force_password_change) {
          setShowPasswordChangeModal(true);
        }
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
    setShowMFAModal(false);
    setMfaToken('');
    setMfaMessage('');
    setShowForcedMFASetupModal(false);
    setSetupToken('');
    setSetupMessage('');
    authService.logout();
  };

  const handleMFAComplete = (accessToken: string, refreshToken: string, userData: User) => {
    setUser(userData);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setShowMFAModal(false);
    setMfaToken('');
    setMfaMessage('');
    
    // Check if password change is required
    if (userData.force_password_change) {
      setShowPasswordChangeModal(true);
    }
  };

  const handleMFACancel = () => {
    setShowMFAModal(false);
    setMfaToken('');
    setMfaMessage('');
  };

  const handleForcedMFASetupComplete = (accessToken: string, refreshToken: string, userData: User) => {
    setUser(userData);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setShowForcedMFASetupModal(false);
    setSetupToken('');
    setSetupMessage('');
    
    // Check if password change is required
    if (userData.force_password_change) {
      setShowPasswordChangeModal(true);
    }
  };

  const handleForcedMFASetupError = (error: string) => {
    console.error('Forced MFA setup error:', error);
    // Could show a toast/snackbar here
    alert('MFA Setup Error: ' + error);
  };

  const handlePasswordChanged = () => {
    console.log('🔄 NEW CODE: Password changed successfully - no logout required');
    // Password was changed successfully, update user state and close modal
    setShowPasswordChangeModal(false);
    
    // Update the user object to remove the force_password_change flag
    if (user) {
      setUser({ ...user, force_password_change: false });
    }
    
    // Show success message via custom event that can be caught by the Layout component
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: {
        message: 'Password has been updated successfully!',
        severity: 'success'
      }
    }));
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
      
      {/* MFA Login Modal */}
      <MFALoginModal
        open={showMFAModal}
        mfaToken={mfaToken}
        message={mfaMessage}
        onComplete={handleMFAComplete}
        onCancel={handleMFACancel}
      />
      
      {/* Forced MFA Setup Modal */}
      <ForcedMFASetupModal
        open={showForcedMFASetupModal}
        setupToken={setupToken}
        message={setupMessage}
        onComplete={handleForcedMFASetupComplete}
        onError={handleForcedMFASetupError}
      />
      
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

