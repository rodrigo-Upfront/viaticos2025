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
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface AlertWarning {
  categoryName: string;
  countryName: string;
  currencyCode: string;
  expenseAmount: number;
  alertAmount: number;
}

interface BulkExpenseAlertDialogProps {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  alertWarnings: AlertWarning[];
}

const BulkExpenseAlertDialog: React.FC<BulkExpenseAlertDialogProps> = ({
  open,
  onClose,
  onProceed,
  alertWarnings
}) => {
  const { t } = useTranslation();

  const formatAmount = (amount: number, currencyCode: string) => {
    return `${currencyCode} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const totalExceedingExpenses = alertWarnings.length;
  const totalExcessAmount = alertWarnings.reduce((sum, warning) => 
    sum + (warning.expenseAmount - warning.alertAmount), 0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            {t('expenses.bulkExpenseAmountAlert')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('expenses.bulkExpenseExceedsAlert', { count: totalExceedingExpenses })}
        </Alert>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('expenses.expensesExceedingLimits')}:
          </Typography>
          
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {alertWarnings.map((warning, index) => (
              <React.Fragment key={index}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Chip 
                            label={`${t('expenses.expenseCategory')}: ${warning.categoryName}`} 
                            variant="outlined" 
                            size="small" 
                          />
                          <Chip 
                            label={`${t('configuration.country')}: ${warning.countryName}`} 
                            variant="outlined" 
                            size="small" 
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            {t('expenses.yourExpenseAmount')}: 
                            <Typography component="span" fontWeight="bold" color="error.main" sx={{ ml: 1 }}>
                              {formatAmount(warning.expenseAmount, warning.currencyCode)}
                            </Typography>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('configuration.alertAmount')}: 
                            <Typography component="span" fontWeight="bold" color="warning.main" sx={{ ml: 1 }}>
                              {formatAmount(warning.alertAmount, warning.currencyCode)}
                            </Typography>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('expenses.difference')}: 
                            <Typography component="span" fontWeight="bold" color="error.main" sx={{ ml: 1 }}>
                              +{formatAmount(warning.expenseAmount - warning.alertAmount, warning.currencyCode)}
                            </Typography>
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < alertWarnings.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>

        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('expenses.summary')}:
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {t('expenses.totalExpensesExceeding')}:
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {totalExceedingExpenses}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {t('expenses.bulkProceedConfirmation')}
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

export default BulkExpenseAlertDialog;
