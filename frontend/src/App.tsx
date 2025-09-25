import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import contexts and providers
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Import components and pages
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PrepaymentsPage from './pages/PrepaymentsPage';
import ExpensesPage from './pages/ExpensesPage';
import BulkExpenseContainer from './pages/BulkExpenseContainer';
import ReportsPage from './pages/ReportsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ReportApprovalPage from './pages/ReportApprovalPage';
import ReportViewPage from './pages/ReportViewPage';
import CreditCardStatementsPage from './pages/CreditCardStatementsPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import SMTPSettingsPage from './pages/SMTPSettingsPage';
import EmailLogsPage from './pages/EmailLogsPage';
import ProtectedRoute from './components/ProtectedRoute';

// Import internationalization
import './utils/i18n';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <LanguageProvider>
          <AuthProvider>
            <Router>
                     {/* DEV HOT RELOAD TEST: If you see v1.0.3 here, frontend live reload works */}
                     <div style={{display:'none'}}>dev-version:v1.0.3</div>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/prepayments" element={<PrepaymentsPage />} />
                          <Route path="/expenses" element={<ExpensesPage />} />
                          <Route path="/expenses/bulk-create" element={<BulkExpenseContainer />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/reports/view/:reportId" element={<ReportViewPage />} />
                          <Route path="/approvals" element={<ApprovalsPage />} />
                          <Route path="/approvals/report/:reportId" element={<ReportApprovalPage />} />
                          <Route path="/users" element={<UsersPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/credit-card-statements" element={<CreditCardStatementsPage />} />
                          <Route path="/email-templates" element={<EmailTemplatesPage />} />
                          <Route path="/smtp-settings" element={<SMTPSettingsPage />} />
                          <Route path="/email-logs" element={<EmailLogsPage />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </LanguageProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
