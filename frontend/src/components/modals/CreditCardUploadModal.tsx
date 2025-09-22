import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import creditCardService, { CreditCardUploadResponse } from '../../services/creditCardService';
import CreditCardPrepaymentFormModal from './CreditCardPrepaymentFormModal';

interface CreditCardUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreditCardUploadModal: React.FC<CreditCardUploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CreditCardUploadResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [prepaymentFormOpen, setPrepaymentFormOpen] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      const result = await creditCardService.uploadStatement(selectedFile);
      setUploadResult(result);
      
      // If there are validation errors, show them
      if (result.validation_errors && Object.keys(result.validation_errors).length > 0) {
        setError('File uploaded with validation errors. Please review and fix before proceeding.');
      } else if (result.user_currency_combinations.length > 0) {
        // Success - open prepayment form
        setPrepaymentFormOpen(true);
      } else {
        setError('No valid transactions found in the file.');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error?.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handlePrepaymentFormSuccess = () => {
    setPrepaymentFormOpen(false);
    handleClose();
    onSuccess();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    setUploading(false);
    setPrepaymentFormOpen(false);
    onClose();
  };

  const hasValidationErrors = uploadResult?.validation_errors && Object.keys(uploadResult.validation_errors).length > 0;
  const canProceed = uploadResult && !hasValidationErrors && uploadResult.user_currency_combinations.length > 0;

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudUploadIcon />
            {t('reports.uploadCreditCardStatement')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {!uploadResult && (
              <>
                <Typography variant="body1" gutterBottom>
                  {t('reports.csvFileContaining')}
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary={t('reports.parseTransactions')} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={t('reports.consolidateCargo')} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={t('reports.groupTransactions')} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary={t('reports.validateCurrencies')} />
                  </ListItem>
                </List>

                <Paper
                  sx={{
                    p: 3,
                    mt: 2,
                    border: '2px dashed',
                    borderColor: selectedFile ? 'primary.main' : 'grey.300',
                    backgroundColor: selectedFile ? 'primary.50' : 'grey.50',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    {selectedFile ? selectedFile.name : t('reports.clickToSelectFile')}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('reports.onlyCsvSupported')}
                  </Typography>
                </Paper>
              </>
            )}

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Processing file...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            {uploadResult && (
              <Box sx={{ mt: 2 }}>
                <Alert 
                  severity={hasValidationErrors ? 'warning' : 'success'} 
                  icon={hasValidationErrors ? <ErrorIcon /> : <CheckCircleIcon />}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    Processed {uploadResult.total_records} records.
                    {hasValidationErrors ? ' Some validation errors found.' : ' Ready to create prepayments.'}
                  </Typography>
                </Alert>

                {hasValidationErrors && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.50' }}>
                    <Typography variant="h6" color="error" gutterBottom>
                      {t('reports.validationIssuesFound')}
                    </Typography>
                    {uploadResult.validation_errors?.unmatched_credit_cards && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="error" gutterBottom>
                          <strong>{t('reports.accountNumbersNoUsers')}</strong>
                        </Typography>
                        {uploadResult.validation_errors.unmatched_credit_cards.map((card: string, index: number) => (
                          <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                            • {card}
                          </Typography>
                        ))}
                      </Box>
                    )}
                    {uploadResult.validation_errors?.missing_currencies && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="error" gutterBottom>
                          <strong>{t('reports.currenciesNotConfigured')}</strong>
                        </Typography>
                        {uploadResult.validation_errors.missing_currencies.map((currency: string, index: number) => (
                          <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                            • {currency}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                )}

                {!hasValidationErrors && uploadResult.user_currency_combinations.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                    <Typography variant="h6" color="success.main" gutterBottom>
                      Ready for Prepayment Creation:
                    </Typography>
                    {uploadResult.user_currency_combinations.map((combo, index) => (
                      <Typography key={index} variant="body2">
                        • {combo.user_name} - {combo.currency_name}: {combo.transaction_count} transactions ({combo.total_amount} {combo.currency_code})
                      </Typography>
                    ))}
                  </Paper>
                )}
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          {!uploadResult && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              variant="contained"
              startIcon={<CloudUploadIcon />}
            >
              {uploading ? 'Uploading...' : 'Upload & Process'}
            </Button>
          )}
          {canProceed && (
            <Button
              onClick={() => setPrepaymentFormOpen(true)}
              variant="contained"
              color="success"
              startIcon={<AccountBalanceIcon />}
            >
              Create Prepayments
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Prepayment Form Modal */}
      {uploadResult && (
        <CreditCardPrepaymentFormModal
          open={prepaymentFormOpen}
          onClose={() => setPrepaymentFormOpen(false)}
          onSuccess={handlePrepaymentFormSuccess}
          statementId={uploadResult.statement_id}
          userCurrencyCombinations={uploadResult.user_currency_combinations}
        />
      )}
    </>
  );
};

export default CreditCardUploadModal;
