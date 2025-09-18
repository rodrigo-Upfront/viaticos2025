import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { 
  Security, 
  CheckCircle, 
  Warning,
  Refresh,
  Download,
  ContentCopy,
  Shield,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import mfaService, { MFAStatusResponse, MFABackupCodesResponse } from '../../services/mfaService';
import MFASetupModal from './MFASetupModal';

interface MFASettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface DisableFormData {
  password: string;
  confirmation: boolean;
}

const disableSchema = yup.object({
  password: yup.string().required('Password is required'),
  confirmation: yup.boolean().required('You must confirm to disable MFA').oneOf([true], 'You must confirm to disable MFA'),
});

const MFASettingsModal: React.FC<MFASettingsModalProps> = ({
  open,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [mfaStatus, setMfaStatus] = useState<MFAStatusResponse | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetDisableForm,
  } = useForm<DisableFormData>({
    resolver: yupResolver(disableSchema),
  });

  useEffect(() => {
    if (open) {
      loadMFAStatus();
    }
  }, [open]);

  const loadMFAStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const status = await mfaService.getStatus();
      setMfaStatus(status);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('mfa.settings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMFA = () => {
    setShowSetup(true);
  };

  const handleMFASetupComplete = () => {
    setShowSetup(false);
    setSuccess(t('mfa.settings.enableSuccess'));
    loadMFAStatus();
  };

  const handleDisableMFA = async (data: DisableFormData) => {
    try {
      setLoading(true);
      setError('');

      await mfaService.disableMFA(data.password, data.confirmation);
      
      setShowDisable(false);
      resetDisableForm();
      setSuccess(t('mfa.settings.disableSuccess'));
      loadMFAStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('mfa.settings.disableError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await mfaService.regenerateBackupCodes();
      setNewBackupCodes(response.backup_codes);
      setSuccess(response.message);
      loadMFAStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('mfa.settings.regenerateError'));
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    if (!newBackupCodes) return;
    
    try {
      await navigator.clipboard.writeText(newBackupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadBackupCodes = () => {
    if (!newBackupCodes) return;
    
    const codesText = newBackupCodes.join('\n');
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

  const handleClose = () => {
    setError('');
    setSuccess('');
    setShowDisable(false);
    setNewBackupCodes(null);
    setCopiedCodes(false);
    resetDisableForm();
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Shield color="primary" />
            <Typography variant="h6">
              {t('mfa.settings.title')}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {mfaStatus && (
            <Grid container spacing={3}>
              {/* MFA Status Card */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      {mfaStatus.enabled ? (
                        <CheckCircle color="success" />
                      ) : (
                        <Warning color="warning" />
                      )}
                      <Typography variant="h6">
                        {t('mfa.settings.status')}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="textSecondary" paragraph>
                      {mfaStatus.enabled 
                        ? t('mfa.settings.enabledDescription')
                        : t('mfa.settings.disabledDescription')
                      }
                    </Typography>

                    {mfaStatus.enabled && (
                      <Box>
                        <Typography variant="body2">
                          <strong>{t('mfa.settings.backupCodes')}:</strong> {mfaStatus.backup_codes_count || 0}
                        </Typography>
                        {mfaStatus.last_used && (
                          <Typography variant="body2">
                            <strong>{t('mfa.settings.lastUsed')}:</strong> {new Date(mfaStatus.last_used).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions>
                    {mfaStatus.enabled ? (
                      <Button
                        color="error"
                        onClick={() => setShowDisable(true)}
                        disabled={loading}
                      >
                        {t('mfa.settings.disable')}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleEnableMFA}
                        disabled={loading}
                      >
                        {t('mfa.settings.enable')}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>

              {/* Backup Codes Management */}
              {mfaStatus.enabled && (
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <Refresh color="primary" />
                        <Typography variant="h6">
                          {t('mfa.settings.backupCodesTitle')}
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="textSecondary" paragraph>
                        {t('mfa.settings.backupCodesDescription')}
                      </Typography>

                      <Typography variant="body2">
                        {t('mfa.settings.codesRemaining')}: {mfaStatus.backup_codes_count || 0}
                      </Typography>
                    </CardContent>

                    <CardActions>
                      <Button
                        startIcon={<Refresh />}
                        onClick={handleRegenerateBackupCodes}
                        disabled={loading}
                      >
                        {t('mfa.settings.regenerate')}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}

          {/* Disable MFA Form */}
          {showDisable && (
            <Box mt={3}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('mfa.settings.disableTitle')}
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('mfa.settings.disableWarning')}
              </Alert>

              <Box component="form" onSubmit={handleSubmit(handleDisableMFA)}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('auth.currentPassword')}
                  margin="normal"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  {...register('password')}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      {...register('confirmation')}
                      color="primary"
                    />
                  }
                  label={t('mfa.settings.disableConfirmation')}
                  sx={{ mt: 1 }}
                />
                {errors.confirmation && (
                  <Typography variant="caption" color="error" display="block">
                    {errors.confirmation.message}
                  </Typography>
                )}

                <Box display="flex" gap={1} mt={2}>
                  <Button
                    onClick={() => {
                      setShowDisable(false);
                      resetDisableForm();
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="error"
                    disabled={loading}
                  >
                    {loading ? t('common.processing') : t('mfa.settings.disableConfirm')}
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          {/* New Backup Codes Display */}
          {newBackupCodes && (
            <Box mt={3}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('mfa.settings.newBackupCodes')}
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('mfa.setup.backupCodesWarning')}
              </Alert>

              <Card>
                <CardContent>
                  <Grid container spacing={1}>
                    {newBackupCodes.map((code, index) => (
                      <Grid item xs={6} sm={4} key={index}>
                        <Chip
                          label={code}
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={copyBackupCodes}
                    color={copiedCodes ? 'success' : 'primary'}
                  >
                    {copiedCodes ? t('common.copied') : t('common.copy')}
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Download />}
                    onClick={downloadBackupCodes}
                  >
                    {t('common.download')}
                  </Button>
                </CardActions>
              </Card>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MFA Setup Modal */}
      <MFASetupModal
        open={showSetup}
        onComplete={handleMFASetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    </>
  );
};

export default MFASettingsModal;
