import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Preview as PreviewIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Language as LanguageIcon,
  Email as EmailIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { emailService, EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate, TemplateVariableGroup } from '../services/emailService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const EmailTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [variables, setVariables] = useState<TemplateVariableGroup[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<boolean | ''>('');
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [variablesModalOpen, setVariablesModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<EmailTemplateCreate>({
    event_type: '',
    language: 'es',
    subject_template: '',
    body_template: '',
    enabled: true
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventTypeFilter, languageFilter, enabledFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load templates with filters
      const filters: any = {};
      if (eventTypeFilter) filters.event_type = eventTypeFilter;
      if (languageFilter) filters.language = languageFilter;
      if (enabledFilter !== '') filters.enabled = enabledFilter;
      
      const [templatesData, variablesData, eventTypesData] = await Promise.all([
        emailService.getEmailTemplates(filters),
        emailService.getAvailableVariables(),
        emailService.getEmailEventTypes()
      ]);
      
      setTemplates(templatesData);
      setVariables(variablesData);
      setEventTypes(eventTypesData);
    } catch (error) {
      setError('Failed to load email templates');
      console.error('Error loading email templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      event_type: template.event_type,
      language: template.language,
      subject_template: template.subject_template,
      body_template: template.body_template,
      enabled: template.enabled
    });
    setIsEditing(true);
    setEditModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      event_type: '',
      language: 'es',
      subject_template: '',
      body_template: '',
      enabled: true
    });
    setIsEditing(false);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isEditing && selectedTemplate) {
        await emailService.updateEmailTemplate(selectedTemplate.id, {
          subject_template: formData.subject_template,
          body_template: formData.body_template,
          enabled: formData.enabled
        });
      } else {
        await emailService.createEmailTemplate(formData);
      }
      
      setEditModalOpen(false);
      loadData();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save template');
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (window.confirm(t('emailTemplates.confirmDelete'))) {
      try {
        await emailService.deleteEmailTemplate(template.id);
        loadData();
      } catch (error: any) {
        setError(error.response?.data?.detail || 'Failed to delete template');
      }
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    try {
      const sampleData = {
        user: { name: 'Juan Pérez', email: 'juan.perez@company.com' },
        prepayment: { id: 123, reason: 'Viaje de negocios', amount: 1500, currency: 'USD' },
        report: { id: 456, reason: 'Reporte de gastos', total_expenses: 800 },
        system: { app_url: 'http://localhost:3000' }
      };
      
      const result = await emailService.previewTemplate(template.body_template, sampleData);
      setPreviewContent(result.rendered_content);
      setPreviewModalOpen(true);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to preview template');
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const type = eventTypes.find(t => t.value === eventType);
    return type ? type.label : eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'success' : 'default';
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('body-template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{${variable}}` + after;
      
      setFormData(prev => ({ ...prev, body_template: newText }));
      
      // Reset cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length + 2;
        textarea.focus();
      }, 0);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <EmailIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          {t('emailTemplates.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t('emailTemplates.createTemplate')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={t('emailTemplates.templates')} />
        <Tab label={t('emailTemplates.variables')} />
        <Tab label={t('emailTemplates.documentation')} />
      </Tabs>

      {/* Templates Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('emailTemplates.eventType')}</InputLabel>
                <Select
                  value={eventTypeFilter}
                  label={t('emailTemplates.eventType')}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                >
                  <MenuItem value="">
                    <em>{t('common.all')}</em>
                  </MenuItem>
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('emailTemplates.language')}</InputLabel>
                <Select
                  value={languageFilter}
                  label={t('emailTemplates.language')}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <MenuItem value="">
                    <em>{t('common.all')}</em>
                  </MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('common.status')}</InputLabel>
                <Select
                  value={enabledFilter}
                  label={t('common.status')}
                  onChange={(e) => setEnabledFilter(e.target.value as boolean | '')}
                >
                  <MenuItem value="">
                    <em>{t('common.all')}</em>
                  </MenuItem>
                  <MenuItem value={true}>{t('common.enabled')}</MenuItem>
                  <MenuItem value={false}>{t('common.disabled')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                onClick={() => {
                  setEventTypeFilter('');
                  setLanguageFilter('');
                  setEnabledFilter('');
                }}
                fullWidth
              >
                {t('common.clearFilters')}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Templates Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('emailTemplates.eventType')}</TableCell>
                <TableCell>{t('emailTemplates.language')}</TableCell>
                <TableCell>{t('emailTemplates.subject')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('emailTemplates.lastUpdated')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {t('emailTemplates.noTemplates')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Chip
                        label={getEventTypeLabel(template.event_type)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<LanguageIcon />}
                        label={template.language.toUpperCase()}
                        size="small"
                        color={template.language === 'es' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {template.subject_template}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.enabled ? t('common.enabled') : t('common.disabled')}
                        color={getStatusColor(template.enabled)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(template.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t('common.preview')}>
                        <IconButton
                          size="small"
                          onClick={() => handlePreview(template)}
                          color="info"
                        >
                          <PreviewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(template)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete')}>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(template)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Variables Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          {t('emailTemplates.availableVariables')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('emailTemplates.variablesDescription')}
        </Typography>
        
        {variables.map((group) => (
          <Accordion key={group.category} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                {group.category} {t('emailTemplates.variables')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {group.variables.map((variable) => (
                  <Grid item xs={12} sm={6} md={4} key={variable.key}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CodeIcon sx={{ mr: 1, fontSize: 16 }} />
                        <Typography variant="body2" fontWeight="bold">
                          {`{${variable.key}}`}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {variable.description}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </TabPanel>

      {/* Documentation Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          {t('emailTemplates.documentation')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('emailTemplates.documentationContent')}
        </Typography>
        {/* Add documentation content here */}
      </TabPanel>

      {/* Edit/Create Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? t('emailTemplates.editTemplate') : t('emailTemplates.createTemplate')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('emailTemplates.eventType')}</InputLabel>
                <Select
                  value={formData.event_type}
                  label={t('emailTemplates.eventType')}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value }))}
                  disabled={isEditing}
                >
                  {eventTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('emailTemplates.language')}</InputLabel>
                <Select
                  value={formData.language}
                  label={t('emailTemplates.language')}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  disabled={isEditing}
                >
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('emailTemplates.subject')}
                value={formData.subject_template}
                onChange={(e) => setFormData(prev => ({ ...prev, subject_template: e.target.value }))}
                placeholder="e.g., Prepayment {prepayment.reason} - Status Update"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  {t('emailTemplates.body')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<HelpIcon />}
                  onClick={() => setVariablesModalOpen(true)}
                  sx={{ ml: 'auto' }}
                >
                  {t('emailTemplates.showVariables')}
                </Button>
              </Box>
              <TextField
                id="body-template"
                fullWidth
                multiline
                rows={10}
                value={formData.body_template}
                onChange={(e) => setFormData(prev => ({ ...prev, body_template: e.target.value }))}
                placeholder="Enter HTML email template..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Modal */}
      <Dialog
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('emailTemplates.preview')}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              backgroundColor: 'background.paper'
            }}
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewModalOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Variables Helper Modal */}
      <Dialog
        open={variablesModalOpen}
        onClose={() => setVariablesModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('emailTemplates.availableVariables')}</DialogTitle>
        <DialogContent>
          {variables.map((group) => (
            <Box key={group.category} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'capitalize' }}>
                {group.category}:
              </Typography>
              {group.variables.map((variable) => (
                <Button
                  key={variable.key}
                  size="small"
                  variant="outlined"
                  onClick={() => insertVariable(variable.key)}
                  sx={{ m: 0.5 }}
                >
                  {`{${variable.key}}`}
                </Button>
              ))}
              <Divider sx={{ my: 1 }} />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVariablesModalOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailTemplatesPage;
