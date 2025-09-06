import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Chip,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { StatementTransaction } from '../services/statementService';

interface EditableTransactionTableProps {
  transactions: StatementTransaction[];
  statementId: number;
  onTransactionUpdate: (transactionId: number, data: Partial<StatementTransaction>) => Promise<void>;
  onTransactionDelete: (transactionId: number) => Promise<void>;
  onTransactionAdd: (data: Omit<StatementTransaction, 'id'>) => Promise<void>;
  readOnly?: boolean;
}

interface EditingState {
  [key: number]: boolean;
}

interface EditingData {
  [key: number]: Partial<StatementTransaction>;
}

const EditableTransactionTable: React.FC<EditableTransactionTableProps> = ({
  transactions,
  statementId,
  onTransactionUpdate,
  onTransactionDelete,
  onTransactionAdd,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<EditingState>({});
  const [editingData, setEditingData] = useState<EditingData>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<StatementTransaction>>({
    transaction_date: '',
    document_number: '',
    description: '',
    amount_local: undefined,
    amount_usd: undefined,
    is_personal: false,
    notes: '',
  });

  const formatAmount = (amount: number | undefined, currency: string): string => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency === 'PEN' ? 'PEN' : 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-PE');
    } catch {
      return dateString;
    }
  };

  const startEdit = (transactionId: number, transaction: StatementTransaction) => {
    setEditing({ ...editing, [transactionId]: true });
    setEditingData({
      ...editingData,
      [transactionId]: { ...transaction },
    });
  };

  const cancelEdit = (transactionId: number) => {
    const newEditing = { ...editing };
    const newEditingData = { ...editingData };
    delete newEditing[transactionId];
    delete newEditingData[transactionId];
    setEditing(newEditing);
    setEditingData(newEditingData);
  };

  const saveEdit = async (transactionId: number) => {
    const data = editingData[transactionId];
    if (data) {
      try {
        await onTransactionUpdate(transactionId, data);
        cancelEdit(transactionId);
      } catch (error) {
        console.error('Failed to update transaction:', error);
        alert('Failed to update transaction. Please try again.');
      }
    }
  };

  const handleFieldChange = (transactionId: number, field: keyof StatementTransaction, value: any) => {
    setEditingData({
      ...editingData,
      [transactionId]: {
        ...editingData[transactionId],
        [field]: value,
      },
    });
  };

  const handleDelete = async (transactionId: number) => {
    if (window.confirm(t('statements.confirmDeleteTransaction'))) {
      try {
        await onTransactionDelete(transactionId);
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        alert('Failed to delete transaction. Please try again.');
      }
    }
  };

  const handleAddTransaction = async () => {
    try {
      if (!newTransaction.transaction_date || !newTransaction.description) {
        alert('Date and description are required');
        return;
      }
      
      await onTransactionAdd(newTransaction as Omit<StatementTransaction, 'id'>);
      setShowAddDialog(false);
      setNewTransaction({
        transaction_date: '',
        document_number: '',
        description: '',
        amount_local: undefined,
        amount_usd: undefined,
        is_personal: false,
        notes: '',
      });
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const renderEditableCell = (
    transaction: StatementTransaction,
    field: keyof StatementTransaction,
    type: 'text' | 'number' | 'date' = 'text'
  ) => {
    const transactionId = transaction.id;
    const isEditing = editing[transactionId];
    const value = isEditing 
      ? editingData[transactionId]?.[field] 
      : transaction[field];

    if (!isEditing) {
      if (field === 'transaction_date') {
        return formatDate(value as string);
      }
      if (field === 'amount_local') {
        return formatAmount(value as number, 'PEN');
      }
      if (field === 'amount_usd') {
        return formatAmount(value as number, 'USD');
      }
      return value || '-';
    }

    return (
      <TextField
        size="small"
        type={type}
        value={value || ''}
        onChange={(e) => {
          const newValue = type === 'number' 
            ? parseFloat(e.target.value) || undefined
            : e.target.value;
          handleFieldChange(transactionId, field, newValue);
        }}
        sx={{ minWidth: field === 'description' ? 200 : 120 }}
      />
    );
  };

  return (
    <Box>
      {!readOnly && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            {t('statements.addTransaction')}
          </Button>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('statements.date')}</TableCell>
              <TableCell>{t('statements.document')}</TableCell>
              <TableCell>{t('statements.description')}</TableCell>
              <TableCell align="right">{t('statements.amountPEN')}</TableCell>
              <TableCell align="right">{t('statements.amountUSD')}</TableCell>
              <TableCell align="center">{t('statements.type')}</TableCell>
              {!readOnly && <TableCell align="center">{t('common.actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {renderEditableCell(transaction, 'transaction_date', 'date')}
                </TableCell>
                <TableCell>
                  {renderEditableCell(transaction, 'document_number')}
                </TableCell>
                <TableCell>
                  {renderEditableCell(transaction, 'description')}
                </TableCell>
                <TableCell align="right">
                  {renderEditableCell(transaction, 'amount_local', 'number')}
                </TableCell>
                <TableCell align="right">
                  {renderEditableCell(transaction, 'amount_usd', 'number')}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={transaction.is_personal ? t('statements.personal') : t('statements.business')}
                    color={transaction.is_personal ? 'warning' : 'primary'}
                    size="small"
                  />
                </TableCell>
                {!readOnly && (
                  <TableCell align="center">
                    {editing[transaction.id] ? (
                      <>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => saveEdit(transaction.id)}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          onClick={() => cancelEdit(transaction.id)}
                        >
                          <CancelIcon />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => startEdit(transaction.id, transaction)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('statements.addTransaction')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('statements.date')}
              type="date"
              value={newTransaction.transaction_date}
              onChange={(e) => setNewTransaction({ ...newTransaction, transaction_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label={t('statements.document')}
              value={newTransaction.document_number || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, document_number: e.target.value })}
            />
            <TextField
              label={t('statements.description')}
              value={newTransaction.description || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t('statements.amountPEN')}
                type="number"
                value={newTransaction.amount_local || ''}
                onChange={(e) => setNewTransaction({ 
                  ...newTransaction, 
                  amount_local: parseFloat(e.target.value) || undefined 
                })}
              />
              <TextField
                label={t('statements.amountUSD')}
                type="number"
                value={newTransaction.amount_usd || ''}
                onChange={(e) => setNewTransaction({ 
                  ...newTransaction, 
                  amount_usd: parseFloat(e.target.value) || undefined 
                })}
              />
            </Box>
            <TextField
              label={t('statements.notes')}
              value={newTransaction.notes || ''}
              onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleAddTransaction} variant="contained">{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditableTransactionTable;
