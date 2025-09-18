import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Paper,
  TextField,
  Step,
  StepLabel,
  Stepper,
  Alert,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
  QrCode as QrCodeIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import mfaService, { MFASetupResponse, MFACompleteLoginResponse } from '../../services/mfaService';

interface ForcedMFASetupModalProps {
  open: boolean;
  setupToken: string;
  message: string;
  onComplete: (accessToken: string, refreshToken: string, userData: any) => void;
  onError: (error: string) => void;
}

const ForcedMFASetupModal: React.FC<ForcedMFASetupModalProps> = ({
  open,
  setupToken,
  message,
  onComplete,
  onError,
}) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<MFASetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const steps = [
    t('mfa.setup.step1'),
    t('mfa.setup.step2'),
    t('mfa.setup.step3'),
  ];

  const handleInitiateSetup = async () => {
    setLoading(true);
    try {
      const data = await mfaService.initiateForcedSetup(setupToken);
      setSetupData(data);
      setActiveStep(1);
    } catch (error: any) {
      onError(error.response?.data?.detail || t('mfa.setup.initError'));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      handleInitiateSetup();
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    if (!setupData || !verificationCode) return;

    setLoading(true);
    try {
      const result: MFACompleteLoginResponse = await mfaService.completeForcedSetup(
        setupToken,
        setupData.secret,
        setupData.backup_codes,
        verificationCode
      );
      
      onComplete(result.access_token, result.refresh_token, result.user);
    } catch (error: any) {
      onError(error.response?.data?.detail || t('mfa.setup.verificationError'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [key]: true });
      setTimeout(() => {
        setCopied({ ...copied, [key]: false });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData) return;

    const content = [
      t('mfa.setup.backupCodesTitle'),
      '==========================================',
      '',
      t('mfa.setup.backupCodesWarning'),
      t('mfa.setup.backupCodesNote'),
      '',
      ...setupData.backup_codes.map((code, index) => `${index + 1}. ${code}`),
      '',
      t('common.date') + ': ' + new Date().toLocaleString(),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigos-respaldo-mfa.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body1" gutterBottom>
                {t('mfa.setup.adminRequiredMessage')}
              </Typography>
            </Alert>
            <Typography variant="body1" sx={{ mt: 2 }}>
              {t('mfa.setup.step1Instructions')}
            </Typography>
          </Box>
        );

      case 1:
        if (!setupData) return null;
        
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('mfa.setup.authenticatorTitle')}
            </Typography>
            
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} mb={3}>
              <Paper elevation={3} sx={{ p: 2, flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <QrCodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {t('mfa.setup.qrCode')}
                </Typography>
                <Box display="flex" justifyContent="center" mb={2}>
                  <img src={setupData.qr_code} alt={t('mfa.setup.qrCode')} style={{ maxWidth: '200px' }} />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {t('mfa.setup.scanQR')}
                </Typography>
              </Paper>

              <Paper elevation={3} sx={{ p: 2, flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('mfa.setup.manualEntry')}
                </Typography>
                <TextField
                  fullWidth
                  value={setupData.secret}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <Tooltip title={copied.secret ? t('common.copied') : t('common.copy')}>
                        <IconButton onClick={() => copyToClipboard(setupData.secret, 'secret')}>
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {t('mfa.setup.manualInstructions')}
                </Typography>
              </Paper>
            </Box>
          </Box>
        );

      case 2:
        if (!setupData) return null;
        
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('mfa.setup.backupCodesTitle')}
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                {t('mfa.setup.backupCodesWarning')}
              </Typography>
            </Alert>

            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">
                  {t('mfa.setup.backupCodes')}
                </Typography>
                <Box>
                  <Button
                    startIcon={<CopyIcon />}
                    onClick={() => copyToClipboard(setupData.backup_codes.join('\n'), 'codes')}
                    sx={{ mr: 1 }}
                  >
                    {copied.codes ? t('common.copied') : t('mfa.setup.copyAllCodes')}
                  </Button>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={downloadBackupCodes}
                  >
                    {t('mfa.setup.downloadCodes')}
                  </Button>
                </Box>
              </Box>
              
              <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={1}>
                {setupData.backup_codes.map((code, index) => (
                  <Chip
                    key={index}
                    label={code}
                    variant="outlined"
                    size="small"
                    sx={{ fontFamily: 'monospace' }}
                  />
                ))}
              </Box>
            </Paper>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              {t('mfa.setup.backupCodesNote')}
            </Typography>

            <Typography variant="h6" gutterBottom>
              {t('mfa.setup.verifyTitle')}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2 }}>
              {t('mfa.setup.verifyInstructions')}
            </Typography>

            <TextField
              fullWidth
              label={t('mfa.verificationCode')}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              inputProps={{
                maxLength: 6,
                pattern: '[0-9]*',
              }}
              sx={{ mb: 2 }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <SecurityIcon sx={{ mr: 2 }} />
          {t('mfa.setup.title')}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || loading}
        >
          {t('common.back')}
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleComplete}
            disabled={!verificationCode || verificationCode.length !== 6 || loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? t('common.verifying') : t('mfa.setup.complete')}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? t('common.processing') : t('common.next')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ForcedMFASetupModal;
