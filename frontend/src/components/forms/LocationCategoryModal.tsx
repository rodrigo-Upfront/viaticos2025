import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { locationService, LocationCategory, LocationCategoryCreate } from '../../services/locationService';

interface LocationCategoryModalProps {
  open: boolean;
  onClose: () => void;
  locationId: number;
  locationName: string;
}

interface EditingCategory {
  id: number;
  name: string;
  account: string;
}

const LocationCategoryModal: React.FC<LocationCategoryModalProps> = ({
  open,
  onClose,
  locationId,
  locationName
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationCategories, setLocationCategories] = useState<LocationCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Validation schema for adding new category
  const schema = yup.object().shape({
    name: yup
      .string()
      .required(t('validation.required'))
      .min(1, t('validation.minLength', { min: 1 }))
      .max(200, t('validation.maxLength', { max: 200 })),
    account: yup
      .string()
      .required(t('validation.required'))
      .min(1, t('validation.minLength', { min: 1 }))
      .max(50, t('validation.maxLength', { max: 50 }))
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      account: ''
    }
  });

  // Load data when modal opens
  useEffect(() => {
    if (open && locationId) {
      loadLocationCategories();
    }
  }, [open, locationId]);

  const loadLocationCategories = async () => {
    try {
      setLoading(true);
      const categories = await locationService.getLocationCategories(locationId);
      setLocationCategories(categories);
    } catch (err: any) {
      console.error('Failed to load location categories:', err);
      setError('Failed to load location categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setAddingNew(true);
    reset({
      name: '',
      account: ''
    });
    setError(null);
  };

  const handleCancelAdd = () => {
    setAddingNew(false);
    reset();
  };

  const onSubmitNew = async (data: any) => {
    try {
      setLoading(true);
      setError(null);

      await locationService.addLocationCategory(locationId, {
        name: data.name.trim(),
        account: data.account.trim(),
        location_id: locationId
      });

      await loadLocationCategories();
      setAddingNew(false);
      reset();
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.response?.data?.detail || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: LocationCategory) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      account: category.account
    });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;

    try {
      setLoading(true);
      setError(null);

      await locationService.updateLocationCategory(
        locationId,
        editingCategory.id,
        { 
          name: editingCategory.name.trim(),
          account: editingCategory.account.trim(),
          location_id: locationId
        }
      );

      await loadLocationCategories();
      setEditingCategory(null);
    } catch (err: any) {
      console.error('Error updating category:', err);
      setError(err.response?.data?.detail || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: LocationCategory) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await locationService.removeLocationCategory(locationId, category.id);
      await loadLocationCategories();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err.response?.data?.detail || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAddingNew(false);
    setEditingCategory(null);
    setError(null);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('configuration.manageCategories')} - {locationName}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {t('configuration.expenseCategories')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCategory}
            disabled={loading || addingNew}
          >
            {t('configuration.addCategory')}
          </Button>
        </Box>

        {/* Add new category form */}
        {addingNew && (
          <Box component="form" onSubmit={handleSubmit(onSubmitNew)} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('configuration.addNewCategory')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('name')}
                  label={t('users.name')}
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('account')}
                  label={t('configuration.sapAccount')}
                  fullWidth
                  error={!!errors.account}
                  helperText={errors.account?.message}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    {t('common.save')}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelAdd}
                    disabled={loading}
                  >
                    {t('common.cancel')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Categories table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('tables.id')}</TableCell>
                <TableCell>{t('users.name')}</TableCell>
                <TableCell>{t('configuration.sapAccount')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locationCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>
                    {editingCategory?.id === category.id ? (
                      <TextField
                        size="small"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({
                          ...editingCategory,
                          name: e.target.value
                        })}
                        disabled={loading}
                      />
                    ) : (
                      category.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCategory?.id === category.id ? (
                      <TextField
                        size="small"
                        value={editingCategory.account}
                        onChange={(e) => setEditingCategory({
                          ...editingCategory,
                          account: e.target.value
                        })}
                        disabled={loading}
                      />
                    ) : (
                      category.account
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCategory?.id === category.id ? (
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveEdit}
                          disabled={loading}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleCancelEdit}
                          disabled={loading}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box display="flex" gap={1}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditCategory(category)}
                          disabled={loading || addingNew || editingCategory !== null}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCategory(category)}
                          disabled={loading || addingNew || editingCategory !== null}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {locationCategories.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="textSecondary">
                      {t('configuration.noCategories')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationCategoryModal;
