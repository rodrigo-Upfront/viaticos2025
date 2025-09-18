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
  Security as SecurityIcon,
  Shield as ShieldIcon,
  GppGood as ForceMFAIcon,
  SecurityUpdate as DisableMFAIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import UserModal from '../components/forms/UserModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import AdminPasswordUpdateModal from '../components/forms/AdminPasswordUpdateModal';
import { userService, User as ApiUser } from '../services/userService';
import { countryService, Country as ApiCountry } from '../services/countryService';
import { locationService, Location as ApiLocation } from '../services/locationService';

interface User {
  id?: number;
  email: string;
  name: string;
  surname: string;
  password?: string;
  sap_code: string;
  country_id: number;
  country?: string;
  location_id?: number;
  location?: string;
  cost_center: string;
  credit_card_number?: string;
  supervisor_id?: number;
  supervisor?: string;
  profile: 'EMPLOYEE' | 'MANAGER' | 'ACCOUNTING' | 'TREASURY';
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change: boolean;
  mfa_enabled?: boolean;
  mfa_required_by_admin?: boolean;
}

interface Country {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

const UsersPage: React.FC = () => {
  const { t } = useTranslation();

  // Loading state
  const [loading, setLoading] = useState({
    users: true,
    countries: true,
    locations: true,
    action: false,
  });

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadUsers();
    loadCountries();
    loadLocations();
  }, []);

  // Helper function to map API user to frontend format
  const mapApiToFrontend = (apiUser: ApiUser): User => {
    const country = countries.find(c => c.id === apiUser.country_id);
    const location = locations.find(l => l.id === apiUser.location_id);
    const supervisor = users.find(u => u.id === apiUser.supervisor_id);
    
    return {
      id: apiUser.id,
      email: apiUser.email,
      name: apiUser.name,
      surname: apiUser.surname,
      sap_code: apiUser.sap_code,
      country_id: apiUser.country_id,
      country: country?.name || apiUser.country_name,
      location_id: apiUser.location_id,
      location: location?.name || apiUser.location_name,
      cost_center: apiUser.cost_center,
      credit_card_number: apiUser.credit_card_number,
      supervisor_id: apiUser.supervisor_id,
      supervisor: supervisor ? `${supervisor.name} ${supervisor.surname}` : apiUser.supervisor_name,
      profile: apiUser.profile as 'EMPLOYEE' | 'MANAGER' | 'ACCOUNTING' | 'TREASURY',
      is_superuser: apiUser.is_superuser,
      is_approver: apiUser.is_approver,
      force_password_change: apiUser.force_password_change,
      mfa_enabled: apiUser.mfa_enabled || false,
      mfa_required_by_admin: apiUser.mfa_required_by_admin || false,
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
      location_id: frontendUser.location_id,
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

  // Load locations from API
  const loadLocations = async () => {
    try {
      setLoading(prev => ({ ...prev, locations: true }));
      const response = await locationService.getLocations();
      const mappedLocations = response.locations.map((location: ApiLocation) => ({
        id: location.id,
        name: location.name,
      }));
      setLocations(mappedLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(prev => ({ ...prev, locations: false }));
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
    confirmText: 'Confirm',
    severity: 'warning' as 'error' | 'warning' | 'info',
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
      confirmText: 'Delete',
      severity: 'error',
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

  const handleForceMFA = (user: User) => {
    setConfirmDialog({
      open: true,
      title: t('users.forceMFATitle'),
      message: t('users.forceMFAMessage', { name: `${user.name} ${user.surname}` }),
      confirmText: t('common.confirm'),
      severity: 'warning',
      onConfirm: async () => {
        if (!user.id) return;
        
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await userService.forceMFA(user.id);
          
          // Update user in local state
          setUsers(prev => prev.map(u => 
            u.id === user.id ? { ...u, mfa_required_by_admin: true } : u
          ));
          
          setSnackbar({
            open: true,
            message: t('users.forceMFASuccess', { name: `${user.name} ${user.surname}` }),
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to force MFA for user:', error);
          setSnackbar({
            open: true,
            message: t('users.forceMFAError'),
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      }
    });
  };

  const handleAdminDisableMFA = (user: User) => {
    setConfirmDialog({
      open: true,
      title: t('users.adminDisableMFATitle'),
      message: t('users.adminDisableMFAMessage', { name: `${user.name} ${user.surname}` }),
      confirmText: t('users.adminDisableMFA'),
      severity: 'error',
      onConfirm: async () => {
        if (!user.id) return;
        
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await userService.adminDisableMFA(user.id);
          
          // Update user in local state
          setUsers(prev => prev.map(u => 
            u.id === user.id ? { 
              ...u, 
              mfa_enabled: false, 
              mfa_required_by_admin: false 
            } : u
          ));
          
          setSnackbar({
            open: true,
            message: t('users.adminDisableMFASuccess', { name: `${user.name} ${user.surname}` }),
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to disable MFA for user:', error);
          setSnackbar({
            open: true,
            message: t('users.adminDisableMFAError'),
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      }
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
              <TableCell>{t('users.mfaStatus')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.users ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading users...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
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
                    <Box display="flex" alignItems="center" gap={1}>
                      {user.mfa_required_by_admin ? (
                        <Chip 
                          label={t('users.mfaRequired')} 
                          color="warning" 
                          size="small"
                          icon={<ShieldIcon />}
                        />
                      ) : user.mfa_enabled ? (
                        <Chip 
                          label={t('users.mfaEnabled')} 
                          color="success" 
                          size="small"
                          icon={<SecurityIcon />}
                        />
                      ) : (
                        <Chip 
                          label={t('users.mfaDisabled')} 
                          color="default" 
                          size="small"
                        />
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
                    
                    {/* MFA Admin Actions */}
                    {!user.mfa_required_by_admin && !user.mfa_enabled && (
                      <IconButton
                        size="small"
                        onClick={() => handleForceMFA(user)}
                        color="info"
                        disabled={loading.action}
                        title={t('users.forceMFA')}
                      >
                        <ForceMFAIcon />
                      </IconButton>
                    )}
                    
                    {(user.mfa_enabled || user.mfa_required_by_admin) && (
                      <IconButton
                        size="small"
                        onClick={() => handleAdminDisableMFA(user)}
                        color="secondary"
                        disabled={loading.action}
                        title={t('users.adminDisableMFA')}
                      >
                        <DisableMFAIcon />
                      </IconButton>
                    )}
                    
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
        locations={locations}
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
        severity={confirmDialog.severity}
        confirmText={confirmDialog.confirmText}
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
