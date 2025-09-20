import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  IconButton,
  Divider
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface TreasuryApprovalModalProps {
  open: boolean;
  onClose: () => void;
  onApprovalComplete: () => void;
  prepaymentId: number;
  currentDepositNumber?: string;
  currentSapFile?: string;
  currentSapRecordNumber?: string;
}

interface TreasuryApprovalState {
  step: number; // 0: deposit number, 1: SAP file download, 2: SAP record number
  depositNumber: string;
  sapFilePath: string;
  sapRecordNumber: string;
  loading: boolean;
  error: string;
  success: string;
}

const TreasuryApprovalModal: React.FC<TreasuryApprovalModalProps> = ({
  open,
  onClose,
  onApprovalComplete,
  prepaymentId,
  currentDepositNumber = '',
  currentSapFile = '',
  currentSapRecordNumber = ''
}) => {
  const { t } = useTranslation();
  
  const [state, setState] = useState<TreasuryApprovalState>({
    step: 0,
    depositNumber: '',
    sapFilePath: '',
    sapRecordNumber: '',
    loading: false,
    error: '',
    success: ''
  });

  // Initialize state based on current prepayment data
  useEffect(() => {
    if (open) {
      let initialStep = 0;
      
      if (currentDepositNumber) {
        initialStep = currentSapRecordNumber ? 2 : 1;
      }
      
      setState({
        step: initialStep,
        depositNumber: currentDepositNumber,
        sapFilePath: currentSapFile,
        sapRecordNumber: currentSapRecordNumber,
        loading: false,
        error: '',
        success: ''
      });
    }
  }, [open, currentDepositNumber, currentSapFile, currentSapRecordNumber]);

  const handleDepositNumberSubmit = async () => {
    if (!state.depositNumber.trim()) {
      setState(prev => ({ ...prev, error: t('treasury.depositNumberRequired') }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const response = await fetch(`/api/approvals/prepayments/${prepaymentId}/treasury/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          deposit_number: state.depositNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('treasury.depositNumberError'));
      }

      setState(prev => ({
        ...prev,
        loading: false,
        step: 1,
        sapFilePath: data.sap_file_path,
        success: t('treasury.depositNumberSuccess')
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('treasury.depositNumberError')
      }));
    }
  };

  const handleSapFileDownload = async () => {
    try {
      const response = await fetch(`/api/approvals/prepayments/${prepaymentId}/sap-file`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(t('treasury.downloadError'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prepayment-${prepaymentId}-sap.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setState(prev => ({ ...prev, success: t('treasury.downloadSuccess') }));

    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || t('treasury.downloadError') }));
    }
  };

  const handleSapRecordSubmit = async () => {
    if (!state.sapRecordNumber.trim()) {
      setState(prev => ({ ...prev, error: t('treasury.sapRecordRequired') }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const response = await fetch(`/api/approvals/prepayments/${prepaymentId}/treasury/sap-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          sap_record_number: state.sapRecordNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('treasury.sapRecordError'));
      }

      setState(prev => ({
        ...prev,
        loading: false,
        success: t('treasury.approvalComplete')
      }));

      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        onApprovalComplete();
        onClose();
      }, 1500);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('treasury.sapRecordError')
      }));
    }
  };

  const handleRegenerateSapFile = () => {
    // Reset to step 0 to allow editing deposit number and regenerating file
    setState(prev => ({
      ...prev,
      step: 0,
      error: '',
      success: t('treasury.editDepositToRegenerate')
    }));
  };

  const steps = [
    t('treasury.enterDepositNumber'),
    t('treasury.downloadSapFile'),
    t('treasury.enterSapRecord')
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          {t('treasury.approvalTitle')} - {t('prepayments.prepaymentId', { id: prepaymentId })}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={state.step} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={index} completed={state.step > index}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {state.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {state.success}
          </Alert>
        )}

        {/* Step 0: Deposit Number */}
        {state.step === 0 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('treasury.step1Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('treasury.step1Description')}
            </Typography>
            
            <TextField
              fullWidth
              label={t('treasury.depositNumber')}
              value={state.depositNumber}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                depositNumber: e.target.value.slice(0, 20),
                error: '' 
              }))}
              placeholder={t('treasury.depositNumberPlaceholder')}
              inputProps={{ maxLength: 20 }}
              helperText={t('treasury.depositNumberHelp')}
              disabled={state.loading}
            />
          </Paper>
        )}

        {/* Step 1: SAP File Download */}
        {state.step === 1 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('treasury.step2Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('treasury.step2Description')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body1">
                <strong>{t('treasury.depositNumber')}:</strong> {state.depositNumber}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleRegenerateSapFile}
                title={t('treasury.regenerateFile')}
              >
                <RefreshIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleSapFileDownload}
                color="primary"
              >
                {t('treasury.downloadSapFile')}
              </Button>
              <Typography variant="body2" color="textSecondary">
                {t('treasury.downloadInstructions')}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Step 2: SAP Record Number */}
        {state.step === 2 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('treasury.step3Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('treasury.step3Description')}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{t('treasury.depositNumber')}:</strong> {state.depositNumber}
              </Typography>
              <Typography variant="body2" color="success.main">
                <CheckCircleIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                {t('treasury.sapFileGenerated')}
              </Typography>
            </Box>

            <TextField
              fullWidth
              label={t('treasury.sapRecordNumber')}
              value={state.sapRecordNumber}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                sapRecordNumber: e.target.value.slice(0, 20),
                error: '' 
              }))}
              placeholder={t('treasury.sapRecordPlaceholder')}
              inputProps={{ maxLength: 20 }}
              helperText={t('treasury.sapRecordHelp')}
              disabled={state.loading}
            />
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={state.loading}
        >
          {t('common.cancel')}
        </Button>

        {state.step === 0 && (
          <Button
            variant="contained"
            onClick={handleDepositNumberSubmit}
            disabled={state.loading || !state.depositNumber.trim()}
          >
            {state.loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : null}
            {t('treasury.generateSapFile')}
          </Button>
        )}

        {state.step === 1 && (
          <Button
            variant="contained"
            onClick={() => setState(prev => ({ ...prev, step: 2 }))}
          >
            {t('treasury.proceedToSapRecord')}
          </Button>
        )}

        {state.step === 2 && (
          <Button
            variant="contained"
            color="success"
            onClick={handleSapRecordSubmit}
            disabled={state.loading || !state.sapRecordNumber.trim()}
          >
            {state.loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : null}
            {t('treasury.completeApproval')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TreasuryApprovalModal;
