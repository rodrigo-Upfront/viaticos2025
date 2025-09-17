import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Typography,
  IconButton,
} from '@mui/material';
import { currencyService, Currency } from '../../services/currencyService';
import apiClient from '../../services/apiClient';
import { useTranslation } from 'react-i18next';
import {
  Download as DownloadIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';


interface Prepayment {
  id?: number;
  reason: string;
  destination_country_id: number;
  destination: string; // For display purposes
  startDate: string;
  endDate: string;
  amount: string | number;
  currency: string;
  currency_id?: number;
  comment: string;
  rejection_reason?: string;
  justification_files?: Array<{filename: string, original_name: string, file_path: string}>;
  status: string;
}

interface Country {
  id: number;
  name: string;
}

interface PrepaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (prepayment: Prepayment, files?: File[]) => Promise<void>;
  prepayment?: Prepayment;
  mode: 'create' | 'edit';
  countries: Country[];
  currencies?: Currency[];
  loading?: boolean;
}

const PrepaymentModal: React.FC<PrepaymentModalProps> = ({
  open,
  onClose,
  onSave,
  prepayment,
  mode,
  countries,
  currencies = [],
  loading = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Prepayment>({
    reason: '',
    destination_country_id: 0,
    destination: '',
    startDate: '',
    endDate: '',
    amount: '',
    currency: 'USD',
    currency_id: undefined,
    comment: '',
    rejection_reason: undefined,
    justification_files: [],
    status: 'pending'
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [hasNewFiles, setHasNewFiles] = useState(false); // Track if user selected new files

  useEffect(() => {
    if (prepayment && mode === 'edit') {
      setFormData(prepayment);
      // Don't set selectedFiles for existing files - only for newly selected ones
      setSelectedFiles([]);
      setHasNewFiles(false);
    } else {
      setFormData({
        reason: '',
        destination_country_id: 0,
        destination: '',
        startDate: '',
        endDate: '',
        amount: '',
        currency: 'USD',
        currency_id: undefined,
        comment: '',
        rejection_reason: undefined,
        justification_files: [],
        status: 'pending'
      });
      setSelectedFiles([]);
      setHasNewFiles(false);
    }
    setErrors({});
  }, [prepayment, mode, open]);

  // Ensure currency is always a string to avoid controlled/uncontrolled warning
  useEffect(() => {
    setFormData(prev => ({ ...prev, currency: prev.currency || '' }));
  }, [open]);

  const handleChange = (field: keyof Prepayment) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSelectChange = (field: keyof Prepayment) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (field === 'currency') {
      const selected = currencies.find(c => c.code === event.target.value);
      setFormData(prev => ({ ...prev, currency_id: selected?.id }));
    }
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Live date validation when either date changes
  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setErrors(prev => ({ ...prev, endDate: 'End date must be after start date' }));
    } else {
      setErrors(prev => ({ ...prev, endDate: '' }));
    }
  }, [formData.startDate, formData.endDate]);

  const handleCountryChange = (event: any) => {
    const countryId = event.target.value;
    const selectedCountry = countries.find(c => c.id === countryId);
    setFormData(prev => ({
      ...prev,
      destination_country_id: countryId,
      destination: selectedCountry?.name || '',
      currency: prev.currency
    }));
    if (errors.destination_country_id) {
      setErrors(prev => ({
        ...prev,
        destination_country_id: ''
      }));
    }
  };

  const handleMultipleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Clear previous file errors
    setErrors(prev => ({
      ...prev,
      justification_files: ''
    }));

    // Validate number of files (max 5)
    if (files.length > 5) {
      setErrors(prev => ({
        ...prev,
        justification_files: `Maximum 5 files allowed (selected ${files.length})`
      }));
      event.target.value = ''; // Clear the input
      return;
    }

    // Validate each file
    for (const file of files) {
      // File size validation (10MB = 10 * 1024 * 1024 bytes)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          justification_files: `File "${file.name}" exceeds 10MB limit`
        }));
        event.target.value = ''; // Clear the input
        return;
      }

      // File type validation (PDF and images only)
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          justification_files: `File "${file.name}" type not allowed. Only PDF and images allowed.`
        }));
        event.target.value = ''; // Clear the input
        return;
      }
    }

    // All files are valid, set them
    setSelectedFiles(files);
    setHasNewFiles(true);
  };

  const uploadFile = async (prepaymentId: number, file: File): Promise<string> => {
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`/prepayments/${prepaymentId}/upload-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.filename;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    } finally {
      setFileUploading(false);
    }
  };

  const handleFileDownload = async (filename: string) => {
    try {
      // Get the prepayment ID from either the prop or the form data
      const prepaymentId = prepayment?.id || formData.id;
      
      if (!prepaymentId) {
        alert('Cannot download file: Prepayment ID not available');
        return;
      }

      // Use authenticated API call to download the file
      const response = await apiClient.get(`/prepayments/${prepaymentId}/download/${filename}`, {
        responseType: 'blob'
      });
      
      // Create a temporary URL for the blob and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to download file';
      if (error.response?.status === 404) {
        errorMessage = 'File not found. The file may have been moved or deleted.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to download this file.';
      }
      
      alert(errorMessage);
    }
  };



  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (!formData.destination_country_id || formData.destination_country_id === 0) {
      newErrors.destination_country_id = 'Destination country is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'End date must be on or after start date';
    }

    const amountValue = typeof formData.amount === 'string' ? parseFloat(formData.amount) || 0 : formData.amount;
    if (!formData.amount || amountValue <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    if (!formData.comment?.trim()) {
      newErrors.comment = t('validation.commentsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        // Convert amount to number before sending
        const prepaymentData = {
          ...formData,
          amount: parseFloat(formData.amount as string) || 0
        };
        
        // Only pass the files if they are new files (not when editing existing prepayment without new files)
        const filesToUpload = hasNewFiles && selectedFiles.length > 0 ? selectedFiles : undefined;
        await onSave(prepaymentData, filesToUpload);
        onClose();
      } catch (error) {
        console.error('Failed to save prepayment:', error);
        // Error handling is done in parent component
      }
    }
  };

  const handleClose = () => {
    setFormData({
      reason: '',
      destination_country_id: 0,
      destination: '',
      startDate: '',
      endDate: '',
      amount: '',
      currency: 'USD',
      comment: '',
      justification_files: [],
      status: 'pending'
    });
    setErrors({});
    setSelectedFiles([]);
    setHasNewFiles(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
{mode === 'create' ? t('prepaymentModule.createNewPrepayment') : t('prepaymentModule.editPrepayment')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label={t('prepaymentModule.reasonForTravel')}
            value={formData.reason}
            onChange={handleChange('reason')}
            error={!!errors.reason}
            helperText={errors.reason}
            margin="normal"
            required
          />
          
          <FormControl fullWidth margin="normal" error={!!errors.destination_country_id} required>
            <InputLabel>{t('prepaymentModule.destinationCountry')}</InputLabel>
            <Select
              value={formData.destination_country_id}
              onChange={handleCountryChange}
              label={t('prepaymentModule.destinationCountry')}
            >
              <MenuItem value={0}>
                <em>{t('prepaymentModule.selectCountry')}</em>
              </MenuItem>
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.id}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
            {errors.destination_country_id && (
              <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 2 }}>
                {errors.destination_country_id}
              </Box>
            )}
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label={t('prepaymentModule.startDate')}
              type="date"
              value={formData.startDate}
              onChange={handleChange('startDate')}
              error={!!errors.startDate}
              helperText={errors.startDate}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
            
            <TextField
              fullWidth
              label={t('prepaymentModule.endDate')} 
              type="date"
              value={formData.endDate}
              onChange={handleChange('endDate')}
              error={!!errors.endDate}
              helperText={errors.endDate}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label={t('common.amount')}
              type="number"
              value={formData.amount}
              onChange={handleChange('amount')}
              error={!!errors.amount}
              helperText={errors.amount}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />

            <FormControl fullWidth sx={{ flex: 1 }}>
              <InputLabel>{t('common.currency')}</InputLabel>
              <Select
                value={formData.currency || ''}
                onChange={handleSelectChange('currency')}
                label={t('common.currency')}
              >
                <MenuItem value=""><em>{t('reports.selectCurrency')}</em></MenuItem>
                {(currencies.length ? currencies : [])?.map((c) => (
                  <MenuItem key={c.code} value={c.code}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label={t('common.comments')}
            value={formData.comment}
            onChange={handleChange('comment')}
            error={!!errors.comment}
            helperText={errors.comment}
            margin="normal"
            multiline
            rows={3}
            placeholder="Additional comments or notes about this prepayment request..."
            required
          />

          <Box sx={{ mt: 2 }}>
            <InputLabel sx={{ mb: 1 }}>{t('prepaymentModule.justificationFile')}</InputLabel>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {t('validation.fileMaxSize')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<InputAdornment position="start">📎</InputAdornment>}
                color={errors.justification_files ? 'error' : 'primary'}
              >
{selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` : 'Choose Files (max 5)'}
                <input
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleMultipleFileChange}
                />
              </Button>
              
              {/* Show file validation error */}
              {errors.justification_files && (
                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                  {errors.justification_files}
                </Typography>
              )}
              
              {/* Show existing files from prepayment (when editing) */}
              {mode === 'edit' && prepayment?.justification_files && prepayment.justification_files.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Existing files ({prepayment.justification_files.length}):
                  </Typography>
                  {prepayment.justification_files.map((file, index) => (
                    <Box 
                      key={index}
                      display="flex" 
                      alignItems="center" 
                      sx={{ 
                        cursor: 'pointer', 
                        p: 1, 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        width: '100%',
                        mb: index < prepayment.justification_files!.length - 1 ? 1 : 0,
                        '&:hover': { 
                          bgcolor: 'action.hover',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleFileDownload(file.filename)}
                    >
                      <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                          {file.original_name || file.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Existing file {index + 1} • Click to download
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileDownload(file.filename);
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Show newly selected files */}
              {selectedFiles.length > 0 && hasNewFiles && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium', mb: 1 }}>
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected:
                  </Typography>
                  {selectedFiles.map((file, index) => (
                    <Box key={index} display="flex" alignItems="center" sx={{ mt: 0.5 }}>
                      <DocumentIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="body2" color="success.main">
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {mode === 'edit' && formData.status.toLowerCase() === 'rejected' && (
          <TextField
            fullWidth
            label={t('prepaymentModule.rejectionReason')}
            value={formData.rejection_reason || ''}
            onChange={handleChange('rejection_reason')}
            margin="normal"
            multiline
            rows={2}
            InputProps={{ readOnly: true }}
            helperText={t('prepaymentModule.providedByApprover')}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
{t('reports.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
{loading ? t('common.saving') : mode === 'create' ? t('reports.create') : t('prepaymentModule.update')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrepaymentModal;
