import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import apiClient from '../../services/apiClient';

interface User {
  id?: number;
  email: string;
  name: string;
  surname: string;
  password?: string;
  sap_code: string;
  country_id: number;
  country?: string;
  cost_center: string;
  credit_card_number?: string;
  supervisor_id?: number;
  supervisor?: string;
  profile: 'employee' | 'manager' | 'accounting' | 'treasury';
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change?: boolean;
}

interface AdminPasswordUpdateModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
  forcePasswordChange: boolean;
}

const AdminPasswordUpdateModal: React.FC<AdminPasswordUpdateModalProps> = ({
  open,
  user,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PasswordFormData>({
    newPassword: '',
    confirmPassword: '',
    forcePasswordChange: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  const handleChange = (field: keyof PasswordFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'forcePasswordChange' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for password confirmation
    if (field === 'confirmPassword' || field === 'newPassword') {
      const newPassword = field === 'newPassword' ? value as string : formData.newPassword;
      const confirmPassword = field === 'confirmPassword' ? value as string : formData.confirmPassword;
      
      if (confirmPassword && newPassword !== confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/[A-Za-z]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one letter';
    } else if (!/\d/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user || !validateForm()) return;

    setLoading(true);
    try {
      await apiClient.post('/users/admin/update-password', {
        user_id: user.id,
        new_password: formData.newPassword,
        force_password_change: formData.forcePasswordChange,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Password update failed:', error);
      const errorMessage = error?.response?.data?.detail || 'Failed to update password';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      newPassword: '',
      confirmPassword: '',
      forcePasswordChange: false,
    });
    setErrors({});
    setShowPasswords({ new: false, confirm: false });
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Update Password for {user.name} {user.surname}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Alert severity="error">{errors.submit}</Alert>
          )}

          <Alert severity="info">
            You are updating the password for <strong>{user.email}</strong>
          </Alert>

          <TextField
            label="New Password"
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange('newPassword')}
            error={!!errors.newPassword}
            helperText={errors.newPassword || 'Must be at least 8 characters with letters and numbers'}
            fullWidth
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
            label="Confirm New Password"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            fullWidth
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

          <FormControlLabel
            control={
              <Switch
                checked={formData.forcePasswordChange}
                onChange={handleChange('forcePasswordChange')}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2">
                  Force password change on next login
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  User will be required to change this password when they log in
                </Typography>
              </Box>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          color="warning"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminPasswordUpdateModal;
