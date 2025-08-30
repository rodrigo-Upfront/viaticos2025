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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { prepaymentService } from '../../services/prepaymentService';
import { expenseService } from '../../services/expenseService';
import { reportService } from '../../services/reportService';

const drawerWidth = 260;
const BRAND_PURPLE = '#6B5CF6';
const BRAND_GRADIENT = 'linear-gradient(135deg, #6B5CF6 0%, #7C6BF8 100%)';
const LOGOUT_RED = '#FF4D4F';

type NavItem = { key: string; icon: JSX.Element; path: string; count?: number };

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  
  const [counts, setCounts] = useState<{ prepayments: number; expenses: number; reports: number }>({ prepayments: 0, expenses: 0, reports: 0 });

  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();

  useEffect(() => {
    const loadCounts = async () => {
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
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          {t('app.title')}
        </Typography>
      </Toolbar>
      <Divider />

      <List sx={{ px: 1, pt: 1 }}>
        {[...navigationItems, ...dynamicItems].map((item) => (
          <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mx: 1,
                '&.Mui-selected': {
                  background: BRAND_GRADIENT,
                  color: '#fff',
                },
                '&.Mui-selected .MuiListItemIcon-root, &.Mui-selected .MuiListItemText-primary': {
                  color: '#fff',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: isSelected(item.path) ? '#fff' : BRAND_PURPLE }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={t(`navigation.${item.key}`)} />
              {typeof item.count === 'number' && (
                <Chip label={item.count} size="small" color={isSelected(item.path) ? 'default' : 'secondary'} sx={{ ml: 1 }} />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* User card */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            borderRadius: 2,
            background: BRAND_GRADIENT,
            color: '#fff',
          }}
        >
          <Avatar sx={{ mr: 1.5, bgcolor: '#fff', color: BRAND_PURPLE }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ color: '#fff' }}>
              {user?.name} {user?.surname}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <ListItem disablePadding sx={{ mt: 1 }}>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ color: LOGOUT_RED }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary={t('auth.logout')} sx={{ color: LOGOUT_RED }} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: BRAND_GRADIENT,
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
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              {t('auth.logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
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
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;

