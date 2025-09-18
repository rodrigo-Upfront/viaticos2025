import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Security, Help } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import mfaService from '../../services/mfaService';

interface MFALoginModalProps {
  open: boolean;
  mfaToken: string;
  message: string;
  onComplete: (accessToken: string, refreshToken: string, user: any) => void;
  onCancel: () => void;
}

interface MFAFormData {
  code: string;
}

const schema = yup.object({
  code: yup
    .string()
    .required('MFA code is required')
    .min(6, 'Code must be at least 6 characters')
    .max(8, 'Code must be at most 8 characters'),
});

const MFALoginModal: React.FC<MFALoginModalProps> = ({
  open,
  mfaToken,
  message,
  onComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MFAFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: MFAFormData) => {
    try {
      setLoading(true);
      setError('');

      const response = await mfaService.verifyMFA(mfaToken, data.code);
      
      onComplete(
        response.access_token,
        response.refresh_token,
        response.user
      );
      reset();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || t('mfa.verificationError');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setError('');
    setShowHelp(false);
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Security color="primary" />
          <Typography variant="h6">
            {t('mfa.verificationRequired')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {message || t('mfa.enterCode')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={t('mfa.verificationCode')}
            placeholder="123456"
            autoFocus
            autoComplete="one-time-code"
            inputMode="numeric"
            error={!!errors.code}
            helperText={errors.code?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowHelp(!showHelp)}
                    title={t('mfa.help')}
                  >
                    <Help />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            {...register('code')}
          />

          {showHelp && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {t('mfa.helpText')}
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleCancel}
          disabled={loading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={loading}
        >
          {loading ? t('common.verifying') : t('mfa.verify')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MFALoginModal;
