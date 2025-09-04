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
  amount: number;
  currency: string;
  currency_id?: number;
  comment: string;
  rejection_reason?: string;
  justification_file?: string;
  status: string;
}

interface Country {
  id: number;
  name: string;
}

interface PrepaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (prepayment: Prepayment, file?: File) => Promise<void>;
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
  const [formData, setFormData] = useState<Prepayment>({
    reason: '',
    destination_country_id: 0,
    destination: '',
    startDate: '',
    endDate: '',
    amount: 0,
    currency: 'USD',
    currency_id: undefined,
    comment: '',
    rejection_reason: undefined,
    justification_file: '',
    status: 'pending'
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [hasNewFile, setHasNewFile] = useState(false); // Track if user selected a new file

  useEffect(() => {
    if (prepayment && mode === 'edit') {
      setFormData(prepayment);
      // Don't set selectedFile for existing files - only for newly selected ones
      setSelectedFile(null);
      setHasNewFile(false);
    } else {
      setFormData({
        reason: '',
        destination_country_id: 0,
        destination: '',
        startDate: '',
        endDate: '',
        amount: 0,
        currency: 'USD',
        currency_id: undefined,
        comment: '',
        rejection_reason: undefined,
        justification_file: '',
        status: 'pending'
      });
      setSelectedFile(null);
      setHasNewFile(false);
    }
    setErrors({});
  }, [prepayment, mode, open]);

  // Ensure currency is always a string to avoid controlled/uncontrolled warning
  useEffect(() => {
    setFormData(prev => ({ ...prev, currency: prev.currency || '' }));
  }, [open]);

  const handleChange = (field: keyof Prepayment) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'amount' ? parseFloat(event.target.value) || 0 : event.target.value;
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setHasNewFile(true); // Mark that user selected a new file
      // Don't update justification_file in formData yet - will be set after upload
    }
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

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        // Only pass the file if it's a new file (not when editing existing prepayment without new file)
        const fileToUpload = hasNewFile && selectedFile ? selectedFile : undefined;
        await onSave(formData, fileToUpload);
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
      amount: 0,
      currency: 'USD',
      comment: '',
      justification_file: '',
      status: 'pending'
    });
    setErrors({});
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create New Prepayment' : 'Edit Prepayment'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Reason for Travel"
            value={formData.reason}
            onChange={handleChange('reason')}
            error={!!errors.reason}
            helperText={errors.reason}
            margin="normal"
            required
          />
          
          <FormControl fullWidth margin="normal" error={!!errors.destination_country_id} required>
            <InputLabel>Destination Country</InputLabel>
            <Select
              value={formData.destination_country_id}
              onChange={handleCountryChange}
              label="Destination Country"
            >
              <MenuItem value={0}>
                <em>Select a country</em>
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
              label="Start Date"
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
              label="End Date" 
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
              label="Amount"
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
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency || ''}
                onChange={handleSelectChange('currency')}
                label="Currency"
              >
                <MenuItem value=""><em>Select currency</em></MenuItem>
                {(currencies.length ? currencies : [])?.map((c) => (
                  <MenuItem key={c.code} value={c.code}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Comment"
            value={formData.comment}
            onChange={handleChange('comment')}
            margin="normal"
            multiline
            rows={3}
            placeholder="Additional comments or notes about this prepayment request..."
          />

          <Box sx={{ mt: 2 }}>
            <InputLabel sx={{ mb: 1 }}>Justification File (Optional)</InputLabel>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<InputAdornment position="start">📎</InputAdornment>}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
              </Button>
              
              {/* Show existing file from prepayment (when editing) */}
              {mode === 'edit' && prepayment?.justification_file && (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  sx={{ 
                    cursor: 'pointer', 
                    p: 1, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    width: '100%',
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleFileDownload(prepayment.justification_file!)}
                >
                  <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                      {prepayment.justification_file}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Existing file • Click to download
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileDownload(prepayment.justification_file!);
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              
              {/* Show newly selected file */}
              {selectedFile && hasNewFile && (
                <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                  <DocumentIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    (New file selected)
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {mode === 'edit' && formData.status.toLowerCase() === 'rejected' && (
          <TextField
            fullWidth
            label="Rejection Reason"
            value={formData.rejection_reason || ''}
            onChange={handleChange('rejection_reason')}
            margin="normal"
            multiline
            rows={2}
            InputProps={{ readOnly: true }}
            helperText="Provided by approver upon rejection"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrepaymentModal;
