import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Avatar,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SupervisorAccount as SupervisorIcon,
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import UserModal from '../components/forms/UserModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import AdminPasswordUpdateModal from '../components/forms/AdminPasswordUpdateModal';
import { userService, User as ApiUser } from '../services/userService';
import { countryService, Country as ApiCountry } from '../services/countryService';

interface User {
  id?: number;
  email: string;
  name: string;
  surname: string;
  password?: string;
  sap_code: string;
  country_id: number;
  country?: string;
  cost_center: string;
  credit_card_number?: string;
  supervisor_id?: number;
  supervisor?: string;
  profile: 'EMPLOYEE' | 'MANAGER' | 'ACCOUNTING' | 'TREASURY';
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change: boolean;
}

interface Country {
  id: number;
  name: string;
}

const UsersPage: React.FC = () => {
  const { t } = useTranslation();

  // Loading state
  const [loading, setLoading] = useState({
    users: true,
    countries: true,
    action: false,
  });

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadUsers();
    loadCountries();
  }, []);

  // Helper function to map API user to frontend format
  const mapApiToFrontend = (apiUser: ApiUser): User => {
    const country = countries.find(c => c.id === apiUser.country_id);
    const supervisor = users.find(u => u.id === apiUser.supervisor_id);
    
    return {
      id: apiUser.id,
      email: apiUser.email,
      name: apiUser.name,
      surname: apiUser.surname,
      sap_code: apiUser.sap_code,
      country_id: apiUser.country_id,
      country: country?.name || apiUser.country_name,
      cost_center: apiUser.cost_center,
      credit_card_number: apiUser.credit_card_number,
      supervisor_id: apiUser.supervisor_id,
      supervisor: supervisor ? `${supervisor.name} ${supervisor.surname}` : apiUser.supervisor_name,
      profile: apiUser.profile as 'EMPLOYEE' | 'MANAGER' | 'ACCOUNTING' | 'TREASURY',
      is_superuser: apiUser.is_superuser,
      is_approver: apiUser.is_approver,
      force_password_change: apiUser.force_password_change,
    };
  };

  const mapFrontendToApi = (frontendUser: User) => {
    return {
      email: frontendUser.email,
      name: frontendUser.name,
      surname: frontendUser.surname,
      password: frontendUser.password || '',
      sap_code: frontendUser.sap_code,
      country_id: frontendUser.country_id,
      cost_center: frontendUser.cost_center,
      credit_card_number: frontendUser.credit_card_number,
      supervisor_id: frontendUser.supervisor_id && frontendUser.supervisor_id > 0 ? frontendUser.supervisor_id : null,
      profile: frontendUser.profile.toUpperCase(),
      is_superuser: frontendUser.is_superuser,
      is_approver: frontendUser.is_approver,
      force_password_change: frontendUser.force_password_change,
    };
  };

  // Load users from API
  const loadUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      const response = await userService.getUsers();
      const mappedUsers = response.users.map(mapApiToFrontend);
      setUsers(mappedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load users',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Load countries from API
  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      const response = await countryService.getCountries();
      const mappedCountries = response.map((country: ApiCountry) => ({
        id: country.id,
        name: country.name,
      }));
      setCountries(mappedCountries);
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const [modal, setModal] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    user: undefined as User | undefined
  });

  const [passwordModal, setPasswordModal] = useState({
    open: false,
    user: null as User | null
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // CRUD operations
  const handleCreate = async () => {
    await loadCountries();
    await loadUsers();
    setModal({ open: true, mode: 'create', user: undefined });
  };

  const handleEdit = async (user: User) => {
    // Ensure the latest countries list is available when opening the modal
    await loadCountries();
    setModal({ open: true, mode: 'edit', user });
  };

  const handleDelete = (user: User) => {
    // Prevent deletion of superuser
    if (user.is_superuser) {
      setSnackbar({
        open: true,
        message: 'Cannot delete superuser account',
        severity: 'error'
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.name} ${user.surname}"? This action cannot be undone.`,
      onConfirm: async () => {
        if (!user.id) return;
        
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await userService.deleteUser(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
          setSnackbar({
            open: true,
            message: 'User deleted successfully',
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to delete user:', error);
          setSnackbar({
            open: true,
            message: 'Failed to delete user',
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      }
    });
  };

  const handlePasswordUpdate = (user: User) => {
    setPasswordModal({ open: true, user });
  };

  const handlePasswordUpdateSuccess = () => {
    setSnackbar({
      open: true,
      message: 'Password updated successfully',
      severity: 'success'
    });
  };

  const handleSave = async (userData: User) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      if (modal.mode === 'create') {
        const apiData = mapFrontendToApi(userData);
        console.log('Creating user with data:', apiData);
        const newUser = await userService.createUser(apiData);
        const mappedUser = mapApiToFrontend(newUser);
        setUsers(prev => [...prev, mappedUser]);
        setSnackbar({
          open: true,
          message: 'User created successfully',
          severity: 'success'
        });
      } else if (userData.id) {
        const apiData = mapFrontendToApi(userData);
        const updatedUser = await userService.updateUser(userData.id, apiData);
        const mappedUser = mapApiToFrontend(updatedUser);
        setUsers(prev => prev.map(u => u.id === userData.id ? mappedUser : u));
        setSnackbar({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${modal.mode === 'create' ? 'create' : 'update'} user`,
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'TREASURY':
        return 'error';
      case 'ACCOUNTING':
        return 'warning';
      case 'MANAGER':
        return 'info';
      case 'EMPLOYEE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getProfileIcon = (profile: string, isSuperuser: boolean) => {
    if (isSuperuser) return <SupervisorIcon />;
    return <PersonIcon />;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.users')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t('users.createUser')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('users.avatar')}</TableCell>
              <TableCell>{t('users.name')}</TableCell>
              <TableCell>{t('users.email')}</TableCell>
              <TableCell>{t('users.sapCode')}</TableCell>
              <TableCell>{t('users.profile')}</TableCell>
              <TableCell>{t('users.country')}</TableCell>
              <TableCell>{t('users.costCenter')}</TableCell>
              <TableCell>{t('users.supervisor')}</TableCell>
              <TableCell>{t('users.permissions')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.users ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading users...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No users found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getProfileIcon(user.profile, user.is_superuser)}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body1">{user.name} {user.surname}</Typography>
                      {user.is_superuser && (
                        <Chip label="Superuser" color="error" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.sap_code}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.profile}
                      color={getProfileColor(user.profile) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.country}</TableCell>
                  <TableCell>{user.cost_center}</TableCell>
                  <TableCell>{user.supervisor || '-'}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {user.is_approver && (
                        <Chip label="Approver" color="success" size="small" />
                      )}
                      {user.is_superuser && (
                        <Chip label="Admin" color="error" size="small" />
                      )}
                      {user.force_password_change && (
                        <Chip label="Must Change PWD" color="warning" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(user)}
                      color="primary"
                      disabled={loading.action}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handlePasswordUpdate(user)}
                      color="warning"
                      disabled={loading.action}
                      title="Update Password"
                    >
                      <LockIcon />
                    </IconButton>
                    {!user.is_superuser && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(user)}
                        disabled={loading.action}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Modal */}
      <UserModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'create', user: undefined })}
        onSave={handleSave}
        user={modal.user}
        mode={modal.mode}
        countries={countries}
        users={users}
        loading={loading.action}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="error"
        confirmText="Delete"
      />

      {/* Admin Password Update Modal */}
      <AdminPasswordUpdateModal
        open={passwordModal.open}
        user={passwordModal.user}
        onClose={() => setPasswordModal({ open: false, user: null })}
        onSuccess={handlePasswordUpdateSuccess}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
