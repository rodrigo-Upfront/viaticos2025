import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface User {
  id?: number;
  email: string;
  name: string;
  surname: string;
  password?: string;
  sap_code: string;
  country_id: number;
  country?: string; // For display
  cost_center: string;
  credit_card_number?: string;
  supervisor_id?: number;
  supervisor?: string; // For display
  profile: 'employee' | 'manager' | 'accounting' | 'treasury';
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change: boolean;
}

interface Country {
  id: number;
  name: string;
}

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  user?: User;
  mode: 'create' | 'edit';
  countries: Country[];
  users: User[]; // For supervisor dropdown
  loading?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({
  open,
  onClose,
  onSave,
  user,
  mode,
  countries,
  users,
  loading = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<User>({
    email: '',
    name: '',
    surname: '',
    password: '',
    sap_code: '',
    country_id: 0,
    country: '',
    cost_center: '',
    credit_card_number: '',
    supervisor_id: undefined,
    supervisor: '',
    profile: 'employee' as 'employee' | 'manager' | 'accounting' | 'treasury',
    is_superuser: false,
    is_approver: false,
    force_password_change: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData(user);
    } else {
      setFormData({
        email: '',
        name: '',
        surname: '',
        password: '',
        sap_code: '',
        country_id: 0,
        country: '',
        cost_center: '',
        credit_card_number: '',
        supervisor_id: undefined,
        supervisor: '',
        profile: 'employee' as 'employee' | 'manager' | 'accounting' | 'treasury',
        is_superuser: false,
        is_approver: false,
        force_password_change: true,
      });
    }
    setErrors({});
  }, [user, mode, open]);

  const handleChange = (field: keyof User) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSelectChange = (field: keyof User) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCountryChange = (event: any) => {
    const countryId = event.target.value;
    const selectedCountry = countries.find(c => c.id === countryId);
    setFormData(prev => ({
      ...prev,
      country_id: countryId,
      country: selectedCountry?.name || ''
    }));
    if (errors.country_id) {
      setErrors(prev => ({
        ...prev,
        country_id: ''
      }));
    }
  };

  const handleSupervisorChange = (event: any) => {
    const supervisorId = event.target.value;
    const selectedSupervisor = users.find(u => u.id === supervisorId);
    setFormData(prev => ({
      ...prev,
      supervisor_id: supervisorId || undefined,
      supervisor: selectedSupervisor ? `${selectedSupervisor.name} ${selectedSupervisor.surname}` : ''
    }));
    if (errors.supervisor_id) {
      setErrors(prev => ({
        ...prev,
        supervisor_id: ''
      }));
    }
  };

  const handleSwitchChange = (field: 'is_superuser' | 'is_approver' | 'force_password_change') => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }

    if (mode === 'create' && !formData.password?.trim()) {
      newErrors.password = 'Password is required for new users';
    }

    if (!formData.sap_code.trim()) {
      newErrors.sap_code = 'SAP code is required';
    }

    if (!formData.country_id || formData.country_id === 0) {
      newErrors.country_id = 'Country is required';
    }

    if (!formData.cost_center.trim()) {
      newErrors.cost_center = 'Cost center is required';
    }

    // Check supervisor cannot be self
    if (formData.supervisor_id && formData.supervisor_id === formData.id) {
      newErrors.supervisor_id = 'User cannot be their own supervisor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      name: '',
      surname: '',
      password: '',
      sap_code: '',
      country_id: 0,
      country: '',
      cost_center: '',
      credit_card_number: '',
      supervisor_id: undefined,
      supervisor: '',
      profile: 'employee' as 'employee' | 'manager' | 'accounting' | 'treasury',
      is_superuser: false,
      is_approver: false,
      force_password_change: true,
    });
    setErrors({});
    onClose();
  };

  // Available supervisors (exclude current user if editing)
  const availableSupervisors = users.filter(u => u.id !== formData.id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
{mode === 'create' ? t('users.createNewUser') : t('users.editUser')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {/* Basic Information */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('users.email')}
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SAP Code"
                value={formData.sap_code}
                onChange={handleChange('sap_code')}
                error={!!errors.sap_code}
                helperText={errors.sap_code}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Surname"
                value={formData.surname}
                onChange={handleChange('surname')}
                error={!!errors.surname}
                helperText={errors.surname}
                required
              />
            </Grid>

            {mode === 'create' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  error={!!errors.password}
                  helperText={errors.password || 'Password for initial login'}
                  required
                />
              </Grid>
            )}

            {/* Country and Profile */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.country_id} required>
                <InputLabel>Country</InputLabel>
                <Select
                  value={formData.country_id}
                  onChange={handleCountryChange}
                  label="Country"
                >
                  <MenuItem value={0}>
                    <em>Select a country</em>
                  </MenuItem>
                  {countries.map((country) => (
                    <MenuItem key={country.id} value={country.id}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.country_id && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 2 }}>
                    {errors.country_id}
                  </Box>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Profile</InputLabel>
                <Select
                  value={formData.profile}
                  onChange={handleSelectChange('profile')}
                  label="Profile"
                >
                  <MenuItem value="employee">Employee</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="accounting">Accounting</MenuItem>
                  <MenuItem value="treasury">Treasury</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Cost Center and Credit Card */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cost Center"
                value={formData.cost_center}
                onChange={handleChange('cost_center')}
                error={!!errors.cost_center}
                helperText={errors.cost_center}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Credit Card Number"
                value={formData.credit_card_number}
                onChange={handleChange('credit_card_number')}
                placeholder="Optional"
              />
            </Grid>

            {/* Supervisor */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.supervisor_id}>
                <InputLabel>Supervisor (Optional)</InputLabel>
                <Select
                  value={formData.supervisor_id || ''}
                  onChange={handleSupervisorChange}
                  label="Supervisor (Optional)"
                >
                  <MenuItem value="">
                    <em>No supervisor</em>
                  </MenuItem>
                  {availableSupervisors.map((supervisor) => (
                    <MenuItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.name} {supervisor.surname} ({supervisor.email})
                    </MenuItem>
                  ))}
                </Select>
                {errors.supervisor_id && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 2 }}>
                    {errors.supervisor_id}
                  </Box>
                )}
              </FormControl>
            </Grid>

            {/* Permissions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_superuser}
                      onChange={handleSwitchChange('is_superuser')}
                    />
                  }
                  label="Superuser"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_approver}
                      onChange={handleSwitchChange('is_approver')}
                    />
                  }
                  label="Approver"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.force_password_change}
                      onChange={handleSwitchChange('force_password_change')}
                    />
                  }
                  label="Force Password Change"
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserModal;

