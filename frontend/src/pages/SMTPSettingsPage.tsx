import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Save as SaveIcon,
  Science as TestIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { emailService, SMTPSettings, SMTPSettingsCreate, SMTPSettingsUpdate, TestEmailRequest } from '../services/emailService';

const SMTPSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SMTPSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<SMTPSettingsCreate & { is_active?: boolean }>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    use_tls: true,
    use_ssl: false,
    from_email: '',
    from_name: 'Viaticos System',
    is_active: true
  });
  
  // Test email modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState<TestEmailRequest>({
    recipient_email: '',
    subject: 'Test Email from Viaticos System',
    body: '<h2>Test Email</h2><p>This is a test email to verify SMTP configuration.</p><p>If you receive this email, your SMTP settings are working correctly!</p>'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const settingsData = await emailService.getSMTPSettings();
      if (settingsData) {
        setSettings(settingsData);
        setFormData({
          smtp_host: settingsData.smtp_host,
          smtp_port: settingsData.smtp_port,
          smtp_user: settingsData.smtp_user || '',
          smtp_password: '', // Don't show password
          use_tls: settingsData.use_tls,
          use_ssl: settingsData.use_ssl,
          from_email: settingsData.from_email,
          from_name: settingsData.from_name,
          is_active: settingsData.is_active
        });
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to load SMTP settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (settings) {
        const updateData: SMTPSettingsUpdate = { ...formData };
        if (formData.smtp_password === '') {
          delete updateData.smtp_password; // Don't update password if empty
        }
        await emailService.updateSMTPSettings(settings.id, updateData);
      } else {
        await emailService.createSMTPSettings(formData);
      }
      
      setSuccess(t('smtpSettings.saveSuccess'));
      loadSettings();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);
      
      const result = await emailService.testSMTPConnection();
      if (result.success) {
        setSuccess(t('smtpSettings.connectionSuccess'));
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'SMTP connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);
      
      const result = await emailService.sendTestEmail(testEmail);
      if (result.success) {
        setSuccess(result.message);
        setTestModalOpen(false);
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: event.target.type === 'number' ? Number(value) : value
    }));
  };
  
  const handleToggleActive = async () => {
    if (!settings) return;
    
    const newActiveState = !formData.is_active;
    const previousState = formData.is_active;
    
    try {
      setFormData(prev => ({ ...prev, is_active: newActiveState }));
      
      // Immediately update in the backend
      await emailService.updateSMTPSettings(settings.id, { is_active: newActiveState });
      
      setSuccess(newActiveState ? 'Email notifications enabled' : 'Email notifications disabled');
      loadSettings();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to toggle email status');
      // Revert on error
      setFormData(prev => ({ ...prev, is_active: previousState }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <SettingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          {t('smtpSettings.title')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {settings && (
            <Button
              variant="outlined"
              startIcon={<TestIcon />}
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? <CircularProgress size={20} /> : t('smtpSettings.testConnection')}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => setTestModalOpen(true)}
            disabled={!settings}
          >
            {t('smtpSettings.sendTestEmail')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Email Toggle - Prominent */}
      {settings && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: formData.is_active ? 'success.light' : 'grey.100' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                📧 Email Notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formData.is_active 
                  ? '✅ Emails are currently ENABLED - System will send email notifications' 
                  : '🔴 Emails are currently DISABLED - No emails will be sent'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active || false}
                  onChange={handleToggleActive}
                  color="primary"
                  size="medium"
                />
              }
              label={formData.is_active ? 'ON' : 'OFF'}
              labelPlacement="start"
              sx={{ ml: 2 }}
            />
          </Box>
        </Paper>
      )}

      {/* SMTP Configuration Form */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('smtpSettings.configuration')}
        </Typography>
        
        <Grid container spacing={3}>
          {/* Server Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('smtpSettings.serverSettings')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label={t('smtpSettings.smtpHost')}
              value={formData.smtp_host}
              onChange={handleChange('smtp_host')}
              placeholder="smtp.gmail.com"
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label={t('smtpSettings.smtpPort')}
              type="number"
              value={formData.smtp_port}
              onChange={handleChange('smtp_port')}
              required
            />
          </Grid>
          
          {/* Security Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('smtpSettings.securitySettings')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.use_tls}
                  onChange={handleChange('use_tls')}
                />
              }
              label={t('smtpSettings.useTLS')}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.use_ssl}
                  onChange={handleChange('use_ssl')}
                />
              }
              label={t('smtpSettings.useSSL')}
            />
          </Grid>
          
          {/* Authentication */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('smtpSettings.authentication')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('smtpSettings.username')}
              value={formData.smtp_user}
              onChange={handleChange('smtp_user')}
              placeholder="your-email@domain.com"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('smtpSettings.password')}
              type="password"
              value={formData.smtp_password}
              onChange={handleChange('smtp_password')}
              placeholder={settings ? "Leave empty to keep current password" : "Enter password"}
            />
          </Grid>
          
          {/* From Settings */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {t('smtpSettings.fromSettings')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('smtpSettings.fromEmail')}
              type="email"
              value={formData.from_email}
              onChange={handleChange('from_email')}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('smtpSettings.fromName')}
              value={formData.from_name}
              onChange={handleChange('from_name')}
            />
          </Grid>
          
          {/* Current Status */}
          {settings && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle2">
                  {t('smtpSettings.currentStatus')}:
                </Typography>
                <Chip
                  icon={settings.is_active ? <CheckIcon /> : <ErrorIcon />}
                  label={settings.is_active ? t('common.active') : t('common.inactive')}
                  color={settings.is_active ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">
                  {t('smtpSettings.lastUpdated')}: {new Date(settings.updated_at).toLocaleString()}
                </Typography>
              </Box>
            </Grid>
          )}
          
          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving || !formData.smtp_host || !formData.from_email}
              >
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Test Email Modal */}
      <Dialog
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <SendIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          {t('smtpSettings.sendTestEmail')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('smtpSettings.testEmailRecipient')}
                type="email"
                value={testEmail.recipient_email}
                onChange={(e) => setTestEmail(prev => ({ ...prev, recipient_email: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('smtpSettings.testEmailSubject')}
                value={testEmail.subject}
                onChange={(e) => setTestEmail(prev => ({ ...prev, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('smtpSettings.testEmailBody')}
                multiline
                rows={4}
                value={testEmail.body}
                onChange={(e) => setTestEmail(prev => ({ ...prev, body: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSendTestEmail}
            variant="contained"
            disabled={testing || !testEmail.recipient_email}
            startIcon={testing ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {testing ? t('smtpSettings.sending') : t('smtpSettings.sendTest')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SMTPSettingsPage;
