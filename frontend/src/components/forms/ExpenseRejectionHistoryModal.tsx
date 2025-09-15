import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { approvalService, ExpenseRejectionHistoryItem } from '../../services/approvalService';

interface Props {
  open: boolean;
  onClose: () => void;
  expenseId: number | null;
}

// Helper functions for user-friendly labels
const getStageLabel = (stage: string, t: any): string => {
  const stageLabels: { [key: string]: string } = {
    'SUPERVISOR_PENDING': t('status.supervisorPending'),
    'ACCOUNTING_PENDING': t('status.accountingPending'),
    'TREASURY_PENDING': t('status.treasuryPending'),
    'REVIEW_RETURN': t('status.reviewReturn'),
  };
  return stageLabels[stage] || stage;
};

const getUserRoleLabel = (role: string, t: any): string => {
  const roleLabels: { [key: string]: string } = {
    'SUPERVISOR': t('users.supervisor'),
    'ACCOUNTING': t('users.accounting'),
    'TREASURY': t('users.treasury'),
    'MANAGER': t('users.manager'),
  };
  return roleLabels[role] || role;
};

const ExpenseRejectionHistoryModal: React.FC<Props> = ({ open, onClose, expenseId }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExpenseRejectionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!open || !expenseId) return;
      setLoading(true);
      setError('');
      try {
        const res = await approvalService.getExpenseRejectionHistory(expenseId);
        setItems(res.items || []);
      } catch (e: any) {
        setError(e?.response?.data?.detail || t('expenses.noRejectionHistory'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, expenseId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('expenses.rejectionHistory')}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">{t('expenses.noRejectionHistory')}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('expenses.historyDate')}</TableCell>
                <TableCell>{t('expenses.historyStage')}</TableCell>
                <TableCell>{t('expenses.historyReason')}</TableCell>
                <TableCell>{t('expenses.historyBy')}</TableCell>
                <TableCell>{t('expenses.historyReport')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.created_at ? new Date(it.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>{getStageLabel(it.approval_stage || '', t)}</TableCell>
                  <TableCell>{it.rejection_reason || '-'}</TableCell>
                  <TableCell>{it.user_name ? `${it.user_name} (${getUserRoleLabel(it.user_role || '', t)})` : '-'}</TableCell>
                  <TableCell>{it.report_name || `Report #${it.report_id}` || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseRejectionHistoryModal;


