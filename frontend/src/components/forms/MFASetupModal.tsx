import React, { useState, useEffect } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  Grid,
  Divider,
  Link,
} from '@mui/material';
import { Security, Download, ContentCopy, QrCode2 } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import mfaService, { MFASetupResponse } from '../../services/mfaService';

interface MFASetupModalProps {
  open: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

interface VerificationFormData {
  code: string;
}

const schema = yup.object({
  code: yup
    .string()
    .required('Verification code is required')
    .length(6, 'Code must be exactly 6 digits'),
});

const MFASetupModal: React.FC<MFASetupModalProps> = ({
  open,
  onComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VerificationFormData>({
    resolver: yupResolver(schema),
  });

  const steps = [
    t('mfa.setup.step1'), // 'Set up authenticator'
    t('mfa.setup.step2'), // 'Save backup codes'
    t('mfa.setup.step3'), // 'Verify setup'
  ];

  useEffect(() => {
    if (open && !setupData) {
      initializeSetup();
    }
  }, [open]);

  const initializeSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await mfaService.setupMFA();
      setSetupData(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('mfa.setup.initError'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'secret' | 'codes') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData) return;
    
    const codesText = setupData.backup_codes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'viaticos-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onSubmit = async (data: VerificationFormData) => {
    if (!setupData) return;

    try {
      setLoading(true);
      setError('');

      await mfaService.verifySetup(
        data.code,
        setupData.secret,
        setupData.backup_codes
      );

      onComplete();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('mfa.setup.verificationError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError('');
    setActiveStep(0);
    setSetupData(null);
    setCopiedSecret(false);
    setCopiedCodes(false);
    onCancel();
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const renderStepContent = () => {
    if (!setupData) return null;

    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('mfa.setup.authenticatorTitle')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('mfa.setup.authenticatorInstructions')}
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('mfa.setup.qrCode')}
                  </Typography>
                  <Box
                    component="img"
                    src={setupData.qr_code}
                    alt="QR Code"
                    sx={{
                      maxWidth: '100%',
                      height: 'auto',
                      border: 1,
                      borderColor: 'grey.300',
                      borderRadius: 1,
                    }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {t('mfa.setup.scanQR')}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('mfa.setup.manualEntry')}
                  </Typography>
                  <Box sx={{ 
                    p: 1, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1, 
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    wordBreak: 'break-all',
                    mb: 1
                  }}>
                    {setupData.secret}
                  </Box>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => copyToClipboard(setupData.secret, 'secret')}
                    color={copiedSecret ? 'success' : 'primary'}
                  >
                    {copiedSecret ? t('common.copied') : t('common.copy')}
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {t('mfa.setup.manualInstructions')}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('mfa.setup.backupCodesTitle')}
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {t('mfa.setup.backupCodesWarning')}
              </Typography>
            </Alert>

            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={1}>
                {setupData.backup_codes.map((code, index) => (
                  <Grid item xs={6} sm={4} key={index}>
                    <Chip
                      label={code}
                      variant="outlined"
                      sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                startIcon={<ContentCopy />}
                onClick={() => copyToClipboard(setupData.backup_codes.join('\n'), 'codes')}
                color={copiedCodes ? 'success' : 'primary'}
                size="small"
              >
                {copiedCodes ? t('common.copied') : t('mfa.setup.copyAllCodes')}
              </Button>
              <Button
                startIcon={<Download />}
                onClick={downloadBackupCodes}
                size="small"
              >
                {t('mfa.setup.downloadCodes')}
              </Button>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              {t('mfa.setup.backupCodesNote')}
            </Typography>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('mfa.setup.verifyTitle')}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {t('mfa.setup.verifyInstructions')}
            </Typography>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <TextField
                fullWidth
                label={t('mfa.verificationCode')}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                error={!!errors.code}
                helperText={errors.code?.message}
                {...register('code')}
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Security color="primary" />
          <Typography variant="h6">
            {t('mfa.setup.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            {t('common.back')}
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={loading}>
            {t('common.next')}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="contained"
            disabled={loading}
          >
            {loading ? t('common.verifying') : t('mfa.setup.complete')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MFASetupModal;
