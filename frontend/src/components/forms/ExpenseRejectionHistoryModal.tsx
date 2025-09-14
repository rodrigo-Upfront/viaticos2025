import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Box, Typography } from '@mui/material';
import { approvalService, ExpenseRejectionHistoryItem } from '../../services/approvalService';

interface Props {
  open: boolean;
  onClose: () => void;
  expenseId: number | null;
}

const ExpenseRejectionHistoryModal: React.FC<Props> = ({ open, onClose, expenseId }) => {
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
        setError(e?.response?.data?.detail || 'Failed to load rejection history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, expenseId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Expense Rejection History</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">No rejection history for this expense.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>By</TableCell>
                <TableCell>Report</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.created_at ? new Date(it.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>{it.approval_stage || '-'}</TableCell>
                  <TableCell>{it.rejection_reason || '-'}</TableCell>
                  <TableCell>{it.user_name ? `${it.user_name} (${it.user_role || 'user'})` : '-'}</TableCell>
                  <TableCell>{it.report_id || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseRejectionHistoryModal;


