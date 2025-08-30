import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Public as CountryIcon,
  Category as CategoryIcon,
  Business as SupplierIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import CountryModal from '../components/forms/CountryModal';
import CategoryModal from '../components/forms/CategoryModal';
import SupplierModal from '../components/forms/SupplierModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import { supplierService, Supplier as ApiSupplier } from '../services/supplierService';
import { categoryService, Category as ApiCategory } from '../services/categoryService';
import { countryService, Country as ApiCountry } from '../services/countryService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Country {
  id?: number;
  name: string;
}

interface Category {
  id?: number;
  name: string;
  account: string;
  alertAmount: number;
}

interface Supplier {
  id?: number;
  name: string;
  sapCode: string;
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);

  // Loading states
  const [loading, setLoading] = useState({
    countries: true,
    categories: true,
    suppliers: true,
  });

  // Countries state
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryModal, setCountryModal] = useState({ open: false, mode: 'create' as 'create' | 'edit', country: undefined as Country | undefined });

  // Categories state  
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryModal, setCategoryModal] = useState({ open: false, mode: 'create' as 'create' | 'edit', category: undefined as Category | undefined });

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierModal, setSupplierModal] = useState({ open: false, mode: 'create' as 'create' | 'edit', supplier: undefined as Supplier | undefined });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Load data from APIs
  useEffect(() => {
    loadCountries();
    loadCategories();
    loadSuppliers();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      const countriesData = await countryService.getCountries();
      // Map API data to frontend format
      const mappedCountries = countriesData.map((country: ApiCountry) => ({
        id: country.id,
        name: country.name,
      }));
      setCountries(mappedCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load countries',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(prev => ({ ...prev, categories: true }));
      const response = await categoryService.getCategories();
      const mappedCategories = response.categories.map((cat: ApiCategory) => ({
        id: cat.id,
        name: cat.name,
        account: cat.account,
        alertAmount: Number(cat.alert_amount)
      }));
      setCategories(mappedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load categories',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const loadSuppliers = async () => {
    try {
      setLoading(prev => ({ ...prev, suppliers: true }));
      const response = await supplierService.getSuppliers();
      const mappedSuppliers = response.suppliers.map((sup: ApiSupplier) => ({
        id: sup.id,
        name: sup.name,
        sapCode: sup.sap_code
      }));
      setSuppliers(mappedSuppliers);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load suppliers',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, suppliers: false }));
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Country CRUD operations
  const handleCreateCountry = () => {
    setCountryModal({ open: true, mode: 'create', country: undefined });
  };

  const handleEditCountry = (country: Country) => {
    setCountryModal({ open: true, mode: 'edit', country });
  };

  const handleDeleteCountry = (country: Country) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Country',
      message: `Are you sure you want to delete "${country.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          if (country.id) {
            await countryService.deleteCountry(country.id);
            setCountries(prev => prev.filter(c => c.id !== country.id));
            setSnackbar({
              open: true,
              message: `Country "${country.name}" deleted successfully`,
              severity: 'success'
            });
          }
        } catch (error) {
          console.error('Error deleting country:', error);
          setSnackbar({
            open: true,
            message: `Failed to delete country "${country.name}"`,
            severity: 'error'
          });
        }
      }
    });
  };

  const handleSaveCountry = async (countryData: Country) => {
    try {
      if (countryModal.mode === 'create') {
        const apiData = {
          name: countryData.name,
        };
        const newCountry = await countryService.createCountry(apiData);
        const mappedCountry = {
          id: newCountry.id,
          name: newCountry.name,
        };
        setCountries(prev => [...prev, mappedCountry]);
        setSnackbar({
          open: true,
          message: `Country "${countryData.name}" created successfully`,
          severity: 'success'
        });
      } else if (countryData.id) {
        const apiData = {
          name: countryData.name,
        };
        const updatedCountry = await countryService.updateCountry(countryData.id, apiData);
        const mappedCountry = {
          id: updatedCountry.id,
          name: updatedCountry.name,
        };
        setCountries(prev => prev.map(c => c.id === countryData.id ? mappedCountry : c));
        setSnackbar({
          open: true,
          message: `Country "${countryData.name}" updated successfully`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error saving country:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${countryModal.mode === 'create' ? 'create' : 'update'} country`,
        severity: 'error'
      });
    }
  };

  // Category CRUD operations
  const handleCreateCategory = () => {
    setCategoryModal({ open: true, mode: 'create', category: undefined });
  };

  const handleEditCategory = (category: Category) => {
    setCategoryModal({ open: true, mode: 'edit', category });
  };

  const handleDeleteCategory = (category: Category) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        if (category.id) {
          try {
            await categoryService.deleteCategory(category.id);
            setCategories(prev => prev.filter(c => c.id !== category.id));
            setSnackbar({
              open: true,
              message: `Category "${category.name}" deleted successfully`,
              severity: 'success'
            });
          } catch (error) {
            console.error('Failed to delete category:', error);
            setSnackbar({
              open: true,
              message: `Failed to delete category "${category.name}"`,
              severity: 'error'
            });
          }
        }
      }
    });
  };

  const handleSaveCategory = async (categoryData: Category) => {
    try {
      if (categoryModal.mode === 'create') {
        const apiData = {
          name: categoryData.name,
          account: categoryData.account,
          alert_amount: categoryData.alertAmount
        };
        const newCategory = await categoryService.createCategory(apiData);
        const mappedCategory = {
          id: newCategory.id,
          name: newCategory.name,
          account: newCategory.account,
          alertAmount: Number(newCategory.alert_amount)
        };
        setCategories(prev => [...prev, mappedCategory]);
        setSnackbar({
          open: true,
          message: `Category "${categoryData.name}" created successfully`,
          severity: 'success'
        });
      } else if (categoryData.id) {
        const apiData = {
          name: categoryData.name,
          account: categoryData.account,
          alert_amount: categoryData.alertAmount
        };
        const updatedCategory = await categoryService.updateCategory(categoryData.id, apiData);
        const mappedCategory = {
          id: updatedCategory.id,
          name: updatedCategory.name,
          account: updatedCategory.account,
          alertAmount: Number(updatedCategory.alert_amount)
        };
        setCategories(prev => prev.map(c => c.id === categoryData.id ? mappedCategory : c));
        setSnackbar({
          open: true,
          message: `Category "${categoryData.name}" updated successfully`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to save category:', error);
      setSnackbar({
        open: true,
        message: `Failed to save category "${categoryData.name}"`,
        severity: 'error'
      });
    }
  };

  // Supplier CRUD operations
  const handleCreateSupplier = () => {
    setSupplierModal({ open: true, mode: 'create', supplier: undefined });
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierModal({ open: true, mode: 'edit', supplier });
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Supplier',
      message: `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        if (supplier.id) {
          try {
            await supplierService.deleteSupplier(supplier.id);
            setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
            setSnackbar({
              open: true,
              message: `Supplier "${supplier.name}" deleted successfully`,
              severity: 'success'
            });
          } catch (error) {
            console.error('Failed to delete supplier:', error);
            setSnackbar({
              open: true,
              message: `Failed to delete supplier "${supplier.name}"`,
              severity: 'error'
            });
          }
        }
      }
    });
  };

  const handleSaveSupplier = async (supplierData: Supplier) => {
    try {
      if (supplierModal.mode === 'create') {
        const apiData = {
          name: supplierData.name,
          sap_code: supplierData.sapCode
        };
        const newSupplier = await supplierService.createSupplier(apiData);
        const mappedSupplier = {
          id: newSupplier.id,
          name: newSupplier.name,
          sapCode: newSupplier.sap_code
        };
        setSuppliers(prev => [...prev, mappedSupplier]);
        setSnackbar({
          open: true,
          message: `Supplier "${supplierData.name}" created successfully`,
          severity: 'success'
        });
      } else if (supplierData.id) {
        const apiData = {
          name: supplierData.name,
          sap_code: supplierData.sapCode
        };
        const updatedSupplier = await supplierService.updateSupplier(supplierData.id, apiData);
        const mappedSupplier = {
          id: updatedSupplier.id,
          name: updatedSupplier.name,
          sapCode: updatedSupplier.sap_code
        };
        setSuppliers(prev => prev.map(s => s.id === supplierData.id ? mappedSupplier : s));
        setSnackbar({
          open: true,
          message: `Supplier "${supplierData.name}" updated successfully`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to save supplier:', error);
      setSnackbar({
        open: true,
        message: `Failed to save supplier "${supplierData.name}"`,
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('navigation.settings')}
      </Typography>

      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<CountryIcon />} label="Countries" />
            <Tab icon={<CategoryIcon />} label="Expense Categories" />
            <Tab icon={<SupplierIcon />} label="Suppliers" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Countries Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateCountry}
            >
              Add Country
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Actions</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {countries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell>{country.id}</TableCell>
                    <TableCell>{country.name}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditCountry(country)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCountry(country)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Expense Categories Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateCategory}
            >
              Add Category
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>SAP Account</TableCell>
                  <TableCell>Alert Amount</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.account}</TableCell>
                    <TableCell>${category.alertAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditCategory(category)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCategory(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Factura Suppliers Management</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateSupplier}
            >
              Add Supplier
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>SAP Code</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>{supplier.id}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.sapCode}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditSupplier(supplier)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSupplier(supplier)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Country Modal */}
      <CountryModal
        open={countryModal.open}
        onClose={() => setCountryModal({ open: false, mode: 'create', country: undefined })}
        onSave={handleSaveCountry}
        country={countryModal.country}
        mode={countryModal.mode}
      />

      {/* Category Modal */}
      <CategoryModal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, mode: 'create', category: undefined })}
        onSave={handleSaveCategory}
        category={categoryModal.category}
        mode={categoryModal.mode}
      />

      {/* Supplier Modal */}
      <SupplierModal
        open={supplierModal.open}
        onClose={() => setSupplierModal({ open: false, mode: 'create', supplier: undefined })}
        onSave={handleSaveSupplier}
        supplier={supplierModal.supplier}
        mode={supplierModal.mode}
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

export default SettingsPage;
