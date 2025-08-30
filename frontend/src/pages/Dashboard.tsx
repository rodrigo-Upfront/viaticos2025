import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Payment,
  Receipt,
  PendingActions,
  CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../services/apiClient';
import { countryService, Country } from '../services/countryService';
import { currencyService, Currency } from '../services/currencyService';

interface DashboardStats {
  prepayments_pending: number;
  expense_reports_pending_amount: number;
  expenses_pending_amount: number;
  expenses_approved_amount: number;
  country?: { id: number; name: string };
  currency?: { id: number; name: string; code: string; symbol?: string };
}



const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState<number | ''>('');
  const { t } = useTranslation();

  // Mock data for charts (will be replaced with real data)
  const monthlyData = [
    { month: 'Jan', amount: 4000 },
    { month: 'Feb', amount: 3000 },
    { month: 'Mar', amount: 5000 },
    { month: 'Apr', amount: 4500 },
    { month: 'May', amount: 6000 },
    { month: 'Jun', amount: 5500 },
  ];

  const categoryData = [
    { category: 'Transport', amount: 2400 },
    { category: 'Accommodation', amount: 1398 },
    { category: 'Meals', amount: 9800 },
    { category: 'Others', amount: 3908 },
  ];

  useEffect(() => {
    loadCountries();
    loadCurrencies();
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedCountry, selectedCurrency]);

  const loadCountries = async () => {
    try {
      const countriesData = await countryService.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      const data = await currencyService.getCurrencies();
      setCurrencies(data);
    } catch (error) {
      console.error('Error loading currencies:', error);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const params: string[] = [];
      if (selectedCountry) params.push(`country_id=${selectedCountry}`);
      if (selectedCurrency) params.push(`currency_id=${selectedCurrency}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `/dashboard/stats${qs}`;
      const response = await apiClient.get(url);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default values for demo
      setStats({
        prepayments_pending: 0,
        expense_reports_pending_amount: 0,
        expenses_pending_amount: 0,
        expenses_approved_amount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (event: SelectChangeEvent<number | ''>) => {
    setSelectedCountry(event.target.value as number | '');
  };

  const getCurrencyDisplay = () => {
    if (stats?.currency?.code) return stats.currency.code;
    const selected = currencies.find(c => c.id === selectedCurrency);
    return selected?.code || 'USD';
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
          </Box>
          <Box sx={{ color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          {t('dashboard.title')}
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {stats?.country && (
            <Chip 
              label={`${stats.country.name}`}
              color="primary"
              variant="outlined"
            />
          )}
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Country</InputLabel>
            <Select
              value={selectedCountry}
              onChange={handleCountryChange}
              label="Filter by Country"
            >
              <MenuItem value="">
                <em>All Countries</em>
              </MenuItem>
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.id}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Currency</InputLabel>
            <Select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as number | '')}
              label="Filter by Currency"
            >
              <MenuItem value="">
                <em>All Currencies</em>
              </MenuItem>
              {currencies.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingPrepayments')}
            value={stats?.prepayments_pending || 0}
            icon={<Payment />}
            color="#ff9800"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingExpenseReports')}
            value={`${getCurrencyDisplay()} ${(stats?.expense_reports_pending_amount || 0).toLocaleString()}`}
            icon={<Receipt />}
            color="#f44336"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingExpenses')}
            value={`${getCurrencyDisplay()} ${(stats?.expenses_pending_amount || 0).toLocaleString()}`}
            icon={<PendingActions />}
            color="#ff5722"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.approvedExpenses')}
            value={`${getCurrencyDisplay()} ${(stats?.expenses_approved_amount || 0).toLocaleString()}`}
            icon={<CheckCircle />}
            color="#4caf50"
          />
        </Grid>

        {/* Monthly Expenses Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.monthlyExpenses')}
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#1976d2" 
                  strokeWidth={2}
                  dot={{ fill: '#1976d2' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Expenses by Category Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.expensesByCategory')}
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#dc004e" 
                  strokeWidth={2}
                  dot={{ fill: '#dc004e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

