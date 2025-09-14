import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip
} from '@mui/material';
import {
  Warning as WarningIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ExpenseAlertDialogProps {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  expenseAmount: number;
  alertAmount: number;
  categoryName: string;
  countryName: string;
  currencyCode: string;
  alertMessage?: string;
}

const ExpenseAlertDialog: React.FC<ExpenseAlertDialogProps> = ({
  open,
  onClose,
  onProceed,
  expenseAmount,
  alertAmount,
  categoryName,
  countryName,
  currencyCode,
  alertMessage
}) => {
  const { t } = useTranslation();

  const formatAmount = (amount: number) => {
    return `${currencyCode} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('expenses.expenseAmountAlert')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {alertMessage || t('expenses.expenseExceedsAlert')}
        </Alert>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            {t('expenses.expenseDetails')}:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            <Chip 
              label={`${t('expenses.expenseCategory')}: ${categoryName}`} 
              variant="outlined" 
              size="small" 
            />
            <Chip 
              label={`${t('configuration.country')}: ${countryName}`} 
              variant="outlined" 
              size="small" 
            />
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('expenses.amountComparison')}:
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {t('expenses.yourExpenseAmount')}:
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              {formatAmount(expenseAmount)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {t('configuration.alertAmount')}:
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.main">
              {formatAmount(alertAmount)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              {t('expenses.difference')}:
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="error.main">
              +{formatAmount(expenseAmount - alertAmount)}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {t('expenses.proceedConfirmation')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={onProceed} color="warning" variant="contained">
          {t('expenses.proceedAnyway')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseAlertDialog;
