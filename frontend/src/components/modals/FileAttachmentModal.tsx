import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface FileAttachmentModalProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: File | null) => void;
  currentFile: File | null;
  rowId: string;
}

const FileAttachmentModal: React.FC<FileAttachmentModalProps> = ({
  open,
  onClose,
  onFileSelect,
  currentFile,
  rowId
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(currentFile);
  const [dragOver, setDragOver] = useState(false);

  // Reset selectedFile when modal opens or currentFile/rowId changes
  useEffect(() => {
    setSelectedFile(currentFile);
  }, [open, currentFile, rowId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleSave = () => {
    onFileSelect(selectedFile);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleClose = () => {
    setSelectedFile(currentFile); // Reset to original file
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <AttachFileIcon />
          {t('expenses.attachDocument')} - {t('expenses.row')} {parseInt(rowId.split('-')[0]) || rowId}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary">
            {t('expenses.attachDocumentHelp')}
          </Typography>
        </Box>

        {/* File Drop Zone */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            border: '2px dashed',
            borderColor: dragOver ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 3,
            textAlign: 'center',
            bgcolor: dragOver ? 'primary.50' : 'grey.50',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'primary.50'
            }
          }}
          onClick={() => document.getElementById(`file-input-${rowId}`)?.click()}
        >
          <input
            id={`file-input-${rowId}`}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          
          <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          
          <Typography variant="h6" gutterBottom>
            {dragOver ? t('expenses.dropFileHere') : t('expenses.clickOrDragFile')}
          </Typography>
          
          <Typography variant="body2" color="textSecondary">
            {t('expenses.acceptedFormats')}: PDF, JPG, PNG, DOC, DOCX
          </Typography>
        </Box>

        {/* Current File Display */}
        {selectedFile && (
          <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <AttachFileIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatFileSize(selectedFile.size)}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={handleRemoveFile}
                title={t('common.remove')}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* File Size Warning */}
        {selectedFile && selectedFile.size > 5 * 1024 * 1024 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t('expenses.fileSizeWarning')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={selectedFile ? selectedFile.size > 10 * 1024 * 1024 : false}
        >
          {selectedFile ? t('expenses.attachFile') : t('expenses.removeFile')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileAttachmentModal;
