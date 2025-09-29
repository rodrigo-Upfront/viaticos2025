import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface FundReturnDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (documentNumber: string, files: File[]) => Promise<void>;
  reportId: number;
}

const FundReturnDocumentModal: React.FC<FundReturnDocumentModalProps> = ({
  open,
  onClose,
  onSubmit,
  reportId
}) => {
  const { t } = useTranslation();

  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file sizes (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError(`The following files exceed the 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
    setError('');
    
    // Reset the input
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!documentNumber.trim()) {
      setError('Document number is required');
      return;
    }
    
    if (selectedFiles.length === 0) {
      setError('At least one file must be uploaded');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      await onSubmit(documentNumber.trim(), selectedFiles);
      
      // Reset form
      setDocumentNumber('');
      setSelectedFiles([]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit documents');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setDocumentNumber('');
      setSelectedFiles([]);
      setError('');
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('reports.submitReturnDocuments')}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('reports.returnDocumentsDescription')}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Document Number Field */}
        <TextField
          fullWidth
          label={t('reports.documentNumber')}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder={t('reports.documentNumberPlaceholder')}
          sx={{ mb: 3 }}
          disabled={submitting}
          required
        />

        {/* File Upload Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('reports.supportingDocuments')}
          </Typography>
          
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              mb: 2,
              backgroundColor: '#fafafa'
            }}
          >
            <input
              accept="*/*"
              style={{ display: 'none' }}
              id="file-upload"
              multiple
              type="file"
              onChange={handleFileSelect}
              disabled={submitting}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                disabled={submitting}
              >
                {t('reports.chooseFiles')}
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('reports.fileUploadHint')}
            </Typography>
          </Box>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('reports.selectedFiles')} ({selectedFiles.length})
              </Typography>
              <List dense>
                {selectedFiles.map((file, index) => (
                  <ListItem key={index} sx={{ border: '1px solid #eee', borderRadius: 1, mb: 1 }}>
                    <AttachFileIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFile(index)}
                        disabled={submitting}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>

        {submitting && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('reports.uploadingDocuments')}
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !documentNumber.trim() || selectedFiles.length === 0}
        >
          {submitting ? t('reports.submitting') : t('reports.submitDocuments')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FundReturnDocumentModal;
