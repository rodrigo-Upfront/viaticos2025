import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  Description as DocumentIcon,
  FlightTakeoff as TravelIcon,
  AccountBalance as MoneyIcon,
} from '@mui/icons-material';

interface Prepayment {
  id?: number;
  reason: string;
  destination_country_id: number;
  destination: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  comment: string;
  justification_file?: string;
  status: string;
  rejection_reason?: string;
}

interface PrepaymentViewModalProps {
  open: boolean;
  onClose: () => void;
  prepayment?: Prepayment;
}

const PrepaymentViewModal: React.FC<PrepaymentViewModalProps> = ({ open, onClose, prepayment }) => {
  if (!prepayment) {
    return null;
  }

  const handleFileDownload = (filename: string) => {
    // Navigate to backend storage path (basic implementation)
    const url = `/storage/uploads/prepayments/${filename}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_process':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Prepayment Details (ID: {prepayment.id})</Typography>
          <Chip
            label={prepayment.status}
            color={getStatusColor(prepayment.status) as any}
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Trip Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              <TravelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Trip Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Reason
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.reason}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Destination
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.destination}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Duration
            </Typography>
            <Typography variant="body1" paragraph>
              {calculateDays(prepayment.startDate, prepayment.endDate)} days
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Start Date
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.startDate}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              End Date
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.endDate}
            </Typography>
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Financial Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Amount Requested
            </Typography>
            <Typography variant="h5" color="primary" paragraph>
              {prepayment.currency} {(prepayment.amount || 0).toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Currency
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.currency}
            </Typography>
          </Grid>

          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              Additional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {prepayment.comment && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Comments
              </Typography>
              <Typography variant="body1" paragraph>
                {prepayment.comment}
              </Typography>
            </Grid>
          )}

          {prepayment.status.toLowerCase() === 'rejected' && prepayment.rejection_reason && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Rejection Reason
              </Typography>
              <Typography variant="body1" color="error" paragraph>
                {prepayment.rejection_reason}
              </Typography>
            </Grid>
          )}

          {/* Justification File */}
          {prepayment.justification_file && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Justification File
              </Typography>
              <Box 
                display="flex" 
                alignItems="center" 
                sx={{ 
                  cursor: 'pointer', 
                  p: 1.5, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => handleFileDownload(prepayment.justification_file!)}
              >
                <DocumentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 30 }} />
                <Box>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 'medium' }}>
                    {prepayment.justification_file}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Click to download • File attachment
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Status Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Current Status
            </Typography>
            <Box display="flex" alignItems="center">
              <Chip
                label={prepayment.status.toUpperCase()}
                color={getStatusColor(prepayment.status) as any}
                size="medium"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                {prepayment.status.toLowerCase() === 'pending' && 'Waiting to be sent for approval'}
                {prepayment.status.toLowerCase() === 'in_process' && 'Currently being reviewed'}
                {prepayment.status.toLowerCase() === 'approved' && 'Approved and ready for travel'}
                {prepayment.status.toLowerCase() === 'rejected' && 'Rejected - please review and resubmit'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button variant="outlined" color="primary">
          Print
        </Button>
        {prepayment.justification_file && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleFileDownload(prepayment.justification_file!)}
          >
            Download File
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PrepaymentViewModal;

