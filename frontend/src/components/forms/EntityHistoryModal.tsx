import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Box, Typography } from '@mui/material';
import { approvalService, ApprovalHistoryItem } from '../../services/approvalService';

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: 'report' | 'prepayment';
  entityId: number | null;
}

const EntityHistoryModal: React.FC<Props> = ({ open, onClose, entityType, entityId }) => {
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
        setError(e?.response?.data?.detail || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, entityType, entityId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Approval History</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : items.length === 0 ? (
          <Typography color="text.secondary">No history entries.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>From → To</TableCell>
                <TableCell>By</TableCell>
                <TableCell>Comments</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>{it.created_at ? new Date(it.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>{it.action}</TableCell>
                  <TableCell>{`${it.from_status || '-'} → ${it.to_status || '-'}`}</TableCell>
                  <TableCell>{it.user_name ? `${it.user_name} (${it.user_role || 'user'})` : '-'}</TableCell>
                  <TableCell>{it.comments || '-'}</TableCell>
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

export default EntityHistoryModal;


