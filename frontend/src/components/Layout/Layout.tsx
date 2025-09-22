import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Badge,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Dashboard,
  Payment,
  Receipt,
  Assessment,
  People,
  Settings,
  Approval,
  Language,
  Lock,
  Security,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { prepaymentService } from '../../services/prepaymentService';
import { expenseService } from '../../services/expenseService';
import { reportService } from '../../services/reportService';
import PasswordChangeModal from '../forms/PasswordChangeModal';
import MFASettingsModal from '../forms/MFASettingsModal';

const drawerWidth = 260;
const collapsedDrawerWidth = 72;
const BRAND_PURPLE = '#6B5CF6';
const BRAND_GRADIENT = 'linear-gradient(135deg, #6B5CF6 0%, #7C6BF8 100%)';
const LOGOUT_RED = '#FF4D4F';

type NavItem = { key: string; icon: JSX.Element; path: string; count?: number };

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true); // New state for desktop sidebar toggle
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [passwordChangeOpen, setPasswordChangeOpen] = useState(false);
  const [mfaSettingsOpen, setMfaSettingsOpen] = useState(false);
  
  const [counts, setCounts] = useState<{ prepayments: number; expenses: number; reports: number }>({ prepayments: 0, expenses: 0, reports: 0 });
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  

  // Listen for notification events from AuthContext
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      setNotification({
        open: true,
        message: event.detail.message,
        severity: event.detail.severity
      });
    };

    window.addEventListener('showNotification', handleNotification as EventListener);
    return () => {
      window.removeEventListener('showNotification', handleNotification as EventListener);
    };
  }, []);

  useEffect(() => {
    const loadCounts = async () => {
      if (!user) return; // Don't load data if user is not authenticated
      try {
        const [preps, exps, reps] = await Promise.all([
          prepaymentService.getPrepayments({ limit: 1 }),
          expenseService.getExpenses({ limit: 1 }),
          reportService.getReports({ limit: 1 }),
        ]);
        setCounts({ prepayments: preps.total || 0, expenses: exps.total || 0, reports: reps.total || 0 });
      } catch (_) {
        // ignore
      }
    };
    loadCounts();
  }, [location.pathname, user]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDesktopDrawerToggle = () => {
    setDesktopOpen(!desktopOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLangAnchorEl(null);
  };

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang);
    handleLanguageClose();
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handlePasswordChange = () => {
    setPasswordChangeOpen(true);
    handleClose();
  };

  const handleMFASettings = () => {
    setMfaSettingsOpen(true);
    handleClose();
  };

  const handlePasswordChangeSuccess = () => {
    // Could show a success message here
    console.log('Password changed successfully');
  };

  const navigationItems: NavItem[] = [
    { key: 'dashboard', icon: <Dashboard />, path: '/dashboard' },
    { key: 'prepayments', icon: <Payment />, path: '/prepayments', count: counts.prepayments },
    { key: 'expenses', icon: <Receipt />, path: '/expenses', count: counts.expenses },
    { key: 'reports', icon: <Assessment />, path: '/reports', count: counts.reports },
  ];

  // Add admin/approver items
  const dynamicItems: NavItem[] = [];
  if (user?.is_approver) {
    dynamicItems.push({ key: 'approvals', icon: <Approval />, path: '/approvals' });
  }

  if (user?.is_superuser) {
    dynamicItems.push(
      { key: 'users', icon: <People />, path: '/users' },
      { key: 'settings', icon: <Settings />, path: '/settings' }
    );
  }

  const isSelected = (path: string) => location.pathname === path;

  const drawer = (isCollapsed: boolean = false) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: isCollapsed ? 1 : 2, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        {!isCollapsed && (
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
            {t('app.title')}
          </Typography>
        )}
        {isCollapsed && (
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            V25
          </Typography>
        )}
      </Toolbar>
      <Divider />

      <List sx={{ px: isCollapsed ? 0.5 : 1, pt: 1 }}>
        {[...navigationItems, ...dynamicItems].map((item) => (
          <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mx: isCollapsed ? 0.5 : 1,
                minHeight: 48,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                px: isCollapsed ? 1 : 2,
                '&.Mui-selected': {
                  background: BRAND_GRADIENT,
                  color: '#fff',
                },
                '&.Mui-selected .MuiListItemIcon-root, &.Mui-selected .MuiListItemText-primary': {
                  color: '#fff',
                },
              }}
              title={isCollapsed ? t(`navigation.${item.key}`) : undefined}
            >
              <ListItemIcon sx={{ 
                minWidth: isCollapsed ? 'unset' : 36, 
                color: isSelected(item.path) ? '#fff' : BRAND_PURPLE,
                mr: isCollapsed ? 0 : 1
              }}>
                {item.icon}
              </ListItemIcon>
              {!isCollapsed && (
                <>
                  <ListItemText primary={t(`navigation.${item.key}`)} />
                  {typeof item.count === 'number' && (
                    <Chip label={item.count} size="small" color={isSelected(item.path) ? 'default' : 'secondary'} sx={{ ml: 1 }} />
                  )}
                </>
              )}
              {isCollapsed && typeof item.count === 'number' && (
                <Badge badgeContent={item.count} color="secondary" sx={{ position: 'absolute', top: 8, right: 8 }} />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* User card */}
      <Box sx={{ px: isCollapsed ? 0.5 : 2, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: isCollapsed ? 1 : 1.5,
            borderRadius: 2,
            background: BRAND_GRADIENT,
            color: '#fff',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Avatar sx={{ mr: isCollapsed ? 0 : 1.5, bgcolor: '#fff', color: BRAND_PURPLE }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          {!isCollapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ color: '#fff' }}>
                {user?.name} {user?.surname}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }} noWrap>
                {user?.email}
              </Typography>
            </Box>
          )}
        </Box>
        {!isCollapsed && (
          <ListItem disablePadding sx={{ mt: 1 }}>
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2 }}>
              <ListItemIcon sx={{ color: LOGOUT_RED }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary={t('auth.logout')} sx={{ color: LOGOUT_RED }} />
            </ListItemButton>
          </ListItem>
        )}
        {isCollapsed && (
          <ListItem disablePadding sx={{ mt: 1 }}>
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, justifyContent: 'center' }} title={t('auth.logout')}>
              <ListItemIcon sx={{ color: LOGOUT_RED, minWidth: 'unset' }}>
                <Logout />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${desktopOpen ? drawerWidth : collapsedDrawerWidth}px)` },
          ml: { sm: `${desktopOpen ? drawerWidth : collapsedDrawerWidth}px` },
          background: BRAND_GRADIENT,
          transition: 'width 0.3s ease, margin 0.3s ease',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDesktopDrawerToggle}
            sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('app.subtitle')}
          </Typography>
          <IconButton size="large" color="inherit" onClick={handleLanguageMenu}>
            <Language />
          </IconButton>
          <Menu anchorEl={langAnchorEl} open={Boolean(langAnchorEl)} onClose={handleLanguageClose}>
            <MenuItem onClick={() => handleLanguageChange('es')} selected={language === 'es'}>
              Español
            </MenuItem>
            <MenuItem onClick={() => handleLanguageChange('en')} selected={language === 'en'}>
              English
            </MenuItem>
          </Menu>

          <IconButton size="large" aria-label="account of current user" aria-controls="menu-appbar" aria-haspopup="true" onClick={handleMenu} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>{user?.name.charAt(0).toUpperCase()}</Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.name} {user?.surname}</Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handlePasswordChange}>
              <ListItemIcon>
                <Lock fontSize="small" />
              </ListItemIcon>
              Change Password
            </MenuItem>
            <MenuItem onClick={handleMFASettings}>
              <ListItemIcon>
                <Security fontSize="small" />
              </ListItemIcon>
              {t('mfa.settings.menuLabel')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              {t('auth.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <PasswordChangeModal
        open={passwordChangeOpen}
        onClose={() => setPasswordChangeOpen(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
      
      <MFASettingsModal
        open={mfaSettingsOpen}
        onClose={() => setMfaSettingsOpen(false)}
      />
      <Box component="nav" sx={{ width: { sm: desktopOpen ? drawerWidth : collapsedDrawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer(false)}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: desktopOpen ? drawerWidth : collapsedDrawerWidth,
              transition: 'width 0.3s ease',
              overflowX: 'hidden'
            },
          }}
          open
        >
          {drawer(!desktopOpen)}
        </Drawer>
      </Box>
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 3, 
        width: { sm: `calc(100% - ${desktopOpen ? drawerWidth : collapsedDrawerWidth}px)` },
        transition: 'width 0.3s ease'
      }}>
        <Toolbar />
        {children}
      </Box>
      
      {/* Global notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Layout;

