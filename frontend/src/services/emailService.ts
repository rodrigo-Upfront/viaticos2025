import apiClient from './apiClient';

// Email Template Types
export interface EmailTemplate {
  id: number;
  event_type: string;
  language: string;
  subject_template: string;
  body_template: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateCreate {
  event_type: string;
  language: string;
  subject_template: string;
  body_template: string;
  enabled?: boolean;
}

export interface EmailTemplateUpdate {
  subject_template?: string;
  body_template?: string;
  enabled?: boolean;
}

// SMTP Settings Types
export interface SMTPSettings {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string;
  smtp_password?: string;
  use_tls: boolean;
  use_ssl: boolean;
  from_email: string;
  from_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SMTPSettingsCreate {
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string;
  smtp_password?: string;
  use_tls?: boolean;
  use_ssl?: boolean;
  from_email: string;
  from_name?: string;
}

export interface SMTPSettingsUpdate {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  use_tls?: boolean;
  use_ssl?: boolean;
  from_email?: string;
  from_name?: string;
  is_active?: boolean;
}

// Email Notification Types
export interface EmailNotification {
  id: number;
  event_type: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body: string;
  language: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  retry_count: number;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailNotificationList {
  items: EmailNotification[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Template Variable Types
export interface TemplateVariable {
  key: string;
  description: string;
  category: string;
}

export interface TemplateVariableGroup {
  category: string;
  variables: TemplateVariable[];
}

// Test Email Type
export interface TestEmailRequest {
  recipient_email: string;
  subject?: string;
  body?: string;
}

// Email Statistics
export interface EmailStats {
  total_notifications: number;
  status_breakdown: Record<string, number>;
  event_breakdown: Record<string, number>;
  recent_activity_24h: Record<string, number>;
  success_rate: number;
}

// Email Event Types
export const EMAIL_EVENT_TYPES = [
  'prepayment_pending',
  'prepayment_approved', 
  'prepayment_rejected',
  'credit_card_statement_created',
  'report_pending',
  'report_approved_100',
  'report_reimbursement_higher_treasury',
  'report_reimbursement_higher_user',
  'report_reimbursement_lower_user',
  'report_reimbursement_lower_treasury',
  'report_reimbursement_lower_confirmed',
  'report_rejected',
  'report_rejected_expenses'
] as const;

export type EmailEventType = typeof EMAIL_EVENT_TYPES[number];

class EmailService {
  // Email Templates
  async getEmailTemplates(filters?: {
    event_type?: string;
    language?: string;
    enabled?: boolean;
  }): Promise<EmailTemplate[]> {
    const params = new URLSearchParams();
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.language) params.append('language', filters.language);
    if (filters?.enabled !== undefined) params.append('enabled', filters.enabled.toString());
    
    const response = await apiClient.get(`/email-templates/${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate> {
    const response = await apiClient.get(`/email-templates/${id}`);
    return response.data;
  }

  async createEmailTemplate(template: EmailTemplateCreate): Promise<EmailTemplate> {
    const response = await apiClient.post('/email-templates/', template);
    return response.data;
  }

  async updateEmailTemplate(id: number, template: EmailTemplateUpdate): Promise<EmailTemplate> {
    const response = await apiClient.put(`/email-templates/${id}`, template);
    return response.data;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await apiClient.delete(`/email-templates/${id}`);
  }

  async getAvailableVariables(): Promise<TemplateVariableGroup[]> {
    const response = await apiClient.get('/email-templates/variables/available');
    return response.data;
  }

  async validateTemplate(content: string): Promise<any> {
    const response = await apiClient.post('/email-templates/validate', { content });
    return response.data;
  }

  async previewTemplate(template: string, sampleData: any): Promise<{ rendered_content: string }> {
    const response = await apiClient.post('/email-templates/preview', {
      template,
      sample_data: sampleData
    });
    return response.data;
  }

  async getEmailEventTypes(): Promise<any[]> {
    const response = await apiClient.get('/email-templates/events/types');
    return response.data;
  }

  // SMTP Settings
  async getSMTPSettings(): Promise<SMTPSettings | null> {
    const response = await apiClient.get('/smtp-settings/');
    return response.data;
  }

  async createSMTPSettings(settings: SMTPSettingsCreate): Promise<SMTPSettings> {
    const response = await apiClient.post('/smtp-settings/', settings);
    return response.data;
  }

  async updateSMTPSettings(id: number, settings: SMTPSettingsUpdate): Promise<SMTPSettings> {
    const response = await apiClient.put(`/smtp-settings/${id}`, settings);
    return response.data;
  }

  async deleteSMTPSettings(id: number): Promise<void> {
    await apiClient.delete(`/smtp-settings/${id}`);
  }

  async sendTestEmail(testRequest: TestEmailRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/smtp-settings/test-email', testRequest);
    return response.data;
  }

  async testSMTPConnection(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.get('/smtp-settings/connection-test');
    return response.data;
  }

  // Email Logs
  async getEmailLogs(filters?: {
    page?: number;
    per_page?: number;
    status_filter?: string;
    event_type?: string;
    recipient_email?: string;
  }): Promise<EmailNotificationList> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.status_filter) params.append('status_filter', filters.status_filter);
    if (filters?.event_type) params.append('event_type', filters.event_type);
    if (filters?.recipient_email) params.append('recipient_email', filters.recipient_email);
    
    const response = await apiClient.get(`/email-logs/${params.toString() ? '?' + params.toString() : ''}`);
    return response.data;
  }

  async getEmailLog(id: number): Promise<EmailNotification> {
    const response = await apiClient.get(`/email-logs/${id}`);
    return response.data;
  }

  async retryEmailNotification(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/email-logs/${id}/retry`);
    return response.data;
  }

  async retryAllFailedNotifications(limit?: number): Promise<any> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiClient.post(`/email-logs/retry-failed${params}`);
    return response.data;
  }

  async getEmailStats(): Promise<EmailStats> {
    const response = await apiClient.get('/email-logs/stats/summary');
    return response.data;
  }

  async deleteEmailLog(id: number): Promise<void> {
    await apiClient.delete(`/email-logs/${id}`);
  }

  async cleanupOldLogs(days: number, statusFilter?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    if (statusFilter) params.append('status_filter', statusFilter);
    
    const response = await apiClient.post(`/email-logs/cleanup?${params.toString()}`);
    return response.data;
  }
}

export const emailService = new EmailService();
