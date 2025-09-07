import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';

interface ForcePasswordChangeModalProps {
  open: boolean;
  onPasswordChanged: () => void;
  onClose: () => void;
  userEmail: string;
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({
  open,
  onPasswordChanged,
  onClose,
  userEmail
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = t('auth.currentPasswordRequired');
    }

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = t('auth.newPasswordRequired');
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('auth.passwordMinLength');
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.confirmPasswordRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.passwordsDoNotMatch');
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = t('auth.newPasswordMustBeDifferent');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword
      });

      // Password changed successfully
      console.log('🔄 Password changed successfully - force_password_change flag should be cleared');
      onPasswordChanged();
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('auth.passwordChangeError');
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Allow closing the modal - it's now just a friendly reminder
  const handleClose = () => {
    // User can close the modal and continue using the system
    // The modal will reappear on next login until password is changed
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      data-testid="force-password-change-modal"
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LockIcon color="warning" />
          <Typography variant="h6">
            {t('auth.passwordChangeRequired')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('auth.passwordChangeMessage')}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('auth.loggedInAs')}: <strong>{userEmail}</strong>
        </Typography>

        {generalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {generalError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label={t('auth.currentPassword')}
            type={showPasswords.current ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) => handleInputChange('currentPassword', e.target.value)}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('current')}
                    edge="end"
                  >
                    {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label={t('auth.newPassword')}
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            error={!!errors.newPassword}
            helperText={errors.newPassword || t('auth.passwordMinLengthHint')}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('new')}
                    edge="end"
                  >
                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label={t('auth.confirmNewPassword')}
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => togglePasswordVisibility('confirm')}
                    edge="end"
                  >
                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('auth.passwordChangeNote')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          fullWidth
        >
          {loading ? t('common.loading') : t('auth.changePassword')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForcePasswordChangeModal;
