import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { approvalService, ApprovalHistoryItem } from '../../services/approvalService';

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: 'report' | 'prepayment';
  entityId: number | null;
}

// Helper functions for user-friendly labels
const getActionLabel = (action: string, t: any): string => {
  const actionLabels: { [key: string]: string } = {
    'SUBMITTED': t('status.submitted'),
    'APPROVED': t('status.approved'),
    'REJECTED': t('status.rejected'),
    'RESUBMITTED': t('status.resubmitted'),
  };
  return actionLabels[action] || action;
};

const getStatusLabel = (status: string, t: any): string => {
  const statusLabels: { [key: string]: string } = {
    'PENDING': t('status.pending'),
    'SUPERVISOR_PENDING': t('status.supervisorPending'),
    'ACCOUNTING_PENDING': t('status.accountingPending'),
    'TREASURY_PENDING': t('status.treasuryPending'),
    'APPROVED': t('status.approved'),
    'REJECTED': t('status.rejected'),
    'REVIEW_RETURN': t('status.reviewReturn'),
    'APPROVED_EXPENSES': t('status.approvedExpenses'),
    'APPROVED_REPAID': t('status.approvedRepaid'),
    'APPROVED_RETURNED_FUNDS': t('status.approvedReturnedFunds'),
  };
  return statusLabels[status] || status;
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

const EntityHistoryModal: React.FC<Props> = ({ open, onClose, entityType, entityId }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!open || !entityId) return;
      setLoading(true);
      setError('');
      try {
        const res = await approvalService.getEntityHistory(entityType, entityId);
        setItems(res.items || []);
      } catch (e: any) {
        setError(e?.response?.data?.detail || t('expenses.noApprovalHistory'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, entityType, entityId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('expenses.approvalHistory')}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">{t('expenses.noApprovalHistory')}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('expenses.historyDate')}</TableCell>
                <TableCell>{t('expenses.historyAction')}</TableCell>
                <TableCell>{t('expenses.historyFrom')} → {t('expenses.historyTo')}</TableCell>
                <TableCell>{t('expenses.historyBy')}</TableCell>
                <TableCell>{t('expenses.historyComments')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.created_at ? new Date(it.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>{getActionLabel(it.action, t)}</TableCell>
                  <TableCell>{`${getStatusLabel(it.from_status || '', t)} → ${getStatusLabel(it.to_status || '', t)}`}</TableCell>
                  <TableCell>{it.user_name ? `${it.user_name} (${getUserRoleLabel(it.user_role || '', t)})` : '-'}</TableCell>
                  <TableCell>{it.comments || '-'}</TableCell>
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

export default EntityHistoryModal;


