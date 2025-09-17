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
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Payment,
  Receipt,
  PendingActions,
  CheckCircle,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import apiClient from '../services/apiClient';
import { countryService, Country } from '../services/countryService';
import { currencyService, Currency } from '../services/currencyService';

// Dashboard status labels - consistent with report module
const DASHBOARD_STATUS_LABELS: Record<string, { en: string; es: string }> = {
  pending: { 
    en: "Pending Submit", 
    es: "Pendiente Rendición de Gastos" 
  },
  supervisor_pending: { 
    en: "Supervisor Review", 
    es: "Revisión Jefatura" 
  },
  accounting_pending: { 
    en: "Accounting Review", 
    es: "Revisión Contabilidad" 
  },
  treasury_pending: { 
    en: "Treasury Review", 
    es: "Revisión Tesorería" 
  },
  funds_return_pending: { 
    en: "Funds Return Pending", 
    es: "Pendiente Devolución" 
  },
  review_return: { 
    en: "Return Documents Review", 
    es: "Revisar Doc. Devolución" 
  },
  approved: { 
    en: "Approved", 
    es: "Aprobado" 
  },
  approved_expenses: { 
    en: "Expenses Approved", 
    es: "Gastos Aprobados" 
  },
  approved_repaid: { 
    en: "Trip Reimbursed", 
    es: "Viaje Reembolsado" 
  },
  rejected: { 
    en: "Rejected", 
    es: "Rechazado" 
  },
};

interface DashboardStats {
  prepayments_pending: number;
  expense_reports_pending_amount: number;
  expenses_pending_amount: number;
  expenses_approved_amount: number;
  country?: { id: number; name: string };
  currency?: { id: number; name: string; code: string; symbol?: string };
}

interface RecentPrepayment {
  id: number;
  reason: string;
  country: string;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
  status: string;
}

interface RecentExpense {
  id: number;
  category: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface CategoryData {
  name: string;
  value: number;
  amount: number;
  color: string;
}



const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<number | ''>('');
  const [selectedCurrency, setSelectedCurrency] = useState<number | ''>('');
  const [recentPrepayments, setRecentPrepayments] = useState<RecentPrepayment[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Calculate dynamic progress and changes based on real data
  const getDynamicProgress = () => {
    if (!stats) return { prepayments: 0, reports: 0, pending: 0, approved: 0 };
    
    // Calculate progress as percentage relative to some baseline
    const totalPrepayments = stats.prepayments_pending + 10; // Assume some baseline
    const totalAmount = stats.expenses_pending_amount + stats.expenses_approved_amount;
    
    return {
      prepayments: Math.min(90, (stats.prepayments_pending / Math.max(1, totalPrepayments)) * 100),
      reports: Math.min(90, (stats.expense_reports_pending_amount / Math.max(1000, totalAmount)) * 100),
      pending: Math.min(90, (stats.expenses_pending_amount / Math.max(1000, totalAmount)) * 100),
      approved: Math.min(100, (stats.expenses_approved_amount / Math.max(1000, totalAmount)) * 100)
    };
  };

  // Mock change percentages (these would need historical data to calculate properly)
  const mockChanges = { prepayments: "↓ 12%", reports: "↑ 8%", pending: "↑ 3%", approved: "↑ 23%" };
  const dynamicProgress = getDynamicProgress();



  useEffect(() => {
    loadCountries();
    loadCurrencies();
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchMonthlyData();
    fetchCategoryData();
    fetchRecentData();
  }, [selectedCountry, selectedCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const fetchMonthlyData = async () => {
    try {
      const params: string[] = [];
      if (selectedCountry) params.push(`country_id=${selectedCountry}`);
      if (selectedCurrency) params.push(`currency_id=${selectedCurrency}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `/dashboard/monthly-expenses${qs}`;
      const response = await apiClient.get(url);
      setMonthlyData(response.data.monthly_data);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setMonthlyData([]);
    }
  };

  const fetchCategoryData = async () => {
    try {
      const params: string[] = [];
      if (selectedCountry) params.push(`country_id=${selectedCountry}`);
      if (selectedCurrency) params.push(`currency_id=${selectedCurrency}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const url = `/dashboard/category-breakdown${qs}`;
      console.log('Fetching category data from:', url);
      const response = await apiClient.get(url);
      console.log('Category data response:', response.data);
      setCategoryData(response.data.category_data || []);
    } catch (error) {
      console.error('Error fetching category data:', error);
      setCategoryData([]);
    }
  };

  const fetchRecentData = async () => {
    try {
      console.log('Fetching recent data...');
      const [prepaymentsResponse, expensesResponse] = await Promise.all([
        apiClient.get('/dashboard/recent-prepayments'),
        apiClient.get('/dashboard/recent-expenses')
      ]);
      console.log('Recent prepayments response:', prepaymentsResponse.data);
      console.log('Recent expenses response:', expensesResponse.data);
      setRecentPrepayments(prepaymentsResponse.data.recent_prepayments || []);
      setRecentExpenses(expensesResponse.data.recent_expenses || []);
    } catch (error) {
      console.error('Error fetching recent data:', error);
      setRecentPrepayments([]);
      setRecentExpenses([]);
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

  const getStatusLabel = (status: string) => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = DASHBOARD_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: any } = {
      'PENDING': 'default',
      'SUPERVISOR_PENDING': 'warning',
      'ACCOUNTING_PENDING': 'warning',
      'TREASURY_PENDING': 'warning',
      'FUNDS_RETURN_PENDING': 'warning',
      'REVIEW_RETURN': 'warning',
      'APPROVED': 'success',
      'APPROVED_EXPENSES': 'success',
      'APPROVED_REPAID': 'success',
      'APPROVED_RETURNED_FUNDS': 'success',
      'REJECTED': 'error'
    };
    return statusColors[status] || 'default';
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    bgColor: string;
    barColor: string;
    progress?: number;
    changePercent?: string;
    onDrillDown?: () => void;
  }> = ({ title, value, icon, bgColor, barColor, progress, changePercent, onDrillDown }) => (
    <Card sx={{ 
      height: '100%', 
      backgroundColor: bgColor,
      position: 'relative',
      overflow: 'visible',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 4
    }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header with Icon */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="body1" sx={{ color: '#666', fontWeight: 500, fontSize: '0.9rem' }}>
            {title}
          </Typography>
          <Box sx={{ fontSize: 24, color: '#888' }}>
            {icon}
          </Box>
        </Box>

        {/* Main Value */}
        <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 2, color: '#333' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>

        {/* Progress Bar */}
        {progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(0,0,0,0.06)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: barColor,
                  borderRadius: 4
                }
              }}
            />
          </Box>
        )}

        {/* Bottom Row with Change % and Button */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
          {changePercent && (
            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
              {changePercent}
            </Typography>
          )}
          {onDrillDown && (
            <Button 
              size="small" 
              onClick={onDrillDown}
              sx={{ 
                color: '#666', 
                fontSize: '0.8rem',
                fontWeight: 500,
                '&:hover': { 
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  color: '#333'
                }
              }}
            >
              VER MÁS →
            </Button>
          )}
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
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', p: 3 }}>
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
            <InputLabel>{t('dashboard.filterByCountry')}</InputLabel>
            <Select
              value={selectedCountry}
              onChange={handleCountryChange}
              label={t('dashboard.filterByCountry')}
            >
              <MenuItem value="">
                <em>{t('dashboard.allCountries')}</em>
              </MenuItem>
              {countries.map((country) => (
                <MenuItem key={country.id} value={country.id}>
                  {country.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>{t('dashboard.filterByCurrency')}</InputLabel>
            <Select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as number | '')}
              label={t('dashboard.filterByCurrency')}
            >
              <MenuItem value="">
                <em>{t('dashboard.allCurrencies')}</em>
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
        {/* Enhanced Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingPrepayments')}
            value={stats?.prepayments_pending || 0}
            icon={<Payment />}
            bgColor="#f8f6ff"
            barColor="#6f42c1"
            progress={dynamicProgress.prepayments}
            changePercent={mockChanges.prepayments}
            onDrillDown={() => navigate('/prepayments')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingExpenseReports')}
            value={`${getCurrencyDisplay()} ${(stats?.expense_reports_pending_amount || 0).toLocaleString()}.00`}
            icon={<Receipt />}
            bgColor="#fef7f7"
            barColor="#e74c3c"
            progress={dynamicProgress.reports}
            changePercent={mockChanges.reports}
            onDrillDown={() => navigate('/reports')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.pendingExpenses')}
            value={`${getCurrencyDisplay()} ${(stats?.expenses_pending_amount || 0).toLocaleString()}.00`}
            icon={<PendingActions />}
            bgColor="#fefbf3"
            barColor="#f39c12"
            progress={dynamicProgress.pending}
            changePercent={mockChanges.pending}
            onDrillDown={() => navigate('/expenses')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t('dashboard.approvedExpenses')}
            value={`${getCurrencyDisplay()} ${(stats?.expenses_approved_amount || 0).toLocaleString()}.00`}
            icon={<CheckCircle />}
            bgColor="#f7fdf9"
            barColor="#27ae60"
            progress={dynamicProgress.approved}
            changePercent={mockChanges.approved}
            onDrillDown={() => navigate('/expenses')}
          />
        </Grid>

        {/* Monthly Expenses Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              {t('dashboard.monthlyExpenses')}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value) => [`${getCurrencyDisplay()} ${value}`, 'Monto']}
                  labelStyle={{ color: '#666' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#1976d2"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Expenses by Category Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Gastos por Categoría
            </Typography>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Porcentaje']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                height={300}
                sx={{ color: '#666', fontStyle: 'italic' }}
              >
{t('dashboard.noCategoryData')}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Prepayments Table */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              {t('dashboard.recentPrepayments')}
            </Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Destino</strong></TableCell>
                    <TableCell><strong>Fechas</strong></TableCell>
                    <TableCell><strong>Costo Est.</strong></TableCell>
                    <TableCell><strong>Estado</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPrepayments.map((prepayment) => (
                    <TableRow key={prepayment.id}>
                      <TableCell>{prepayment.country}</TableCell>
                      <TableCell>
                        {prepayment.start_date && prepayment.end_date 
                          ? `${prepayment.start_date} - ${prepayment.end_date}`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{prepayment.currency} {prepayment.amount.toLocaleString()}.00</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(prepayment.status)} 
                          color={getStatusColor(prepayment.status)} 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentPrepayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: '#666', fontStyle: 'italic' }}>
{t('dashboard.noRecentPrepayments')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Expenses Table */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, borderRadius: 4 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Gastos Recientes
            </Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Descripción</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell><strong>Monto</strong></TableCell>
                    <TableCell><strong>Estado</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.purpose}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.currency} {expense.amount.toLocaleString()}.00</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(expense.status)} 
                          color={getStatusColor(expense.status)} 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: '#666', fontStyle: 'italic' }}>
{t('dashboard.noRecentExpenses')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

