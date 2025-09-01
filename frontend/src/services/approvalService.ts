/**
 * Approval Service
 * Real API calls for approval workflow management
 */

import apiClient from './apiClient';

export interface PendingApprovalItem {
  id: number;
  type: string; // "prepayment" or "report"
  entity_id: number;
  requester: string;
  amount?: string;
  currency?: string;
  reason?: string;
  destination?: string;
  request_date: string;
  status?: string; // Current approval status
  prepayment_id?: number; // For reports
  total_expenses?: string; // For reports
  prepaid_amount?: string; // For reports
  report_date?: string; // For reports
}

export interface PendingApprovalsList {
  items: PendingApprovalItem[];
  total: number;
}

export interface ApprovalAction {
  action: string; // "approve" or "reject"
  rejection_reason?: string;
  comments?: string;
}

export interface ApprovalResponse {
  id: number;
  entity_type: string;
  entity_id: number;
  approver_user_id: number;
  approval_level: number;
  status: string;
  rejection_reason?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  approver_name?: string;
  entity_details?: any;
}

export interface ApprovalListResponse {
  approvals: ApprovalResponse[];
  total: number;
  skip: number;
  limit: number;
}

export class ApprovalService {
  private readonly basePath = '/approvals';

  /**
   * Get pending approvals (formatted for frontend)
   */
  async getPendingApprovals(): Promise<PendingApprovalsList> {
    const response = await apiClient.get(`${this.basePath}/pending`);
    return response.data;
  }

  /**
   * Approve or reject a prepayment
   */
  async approvePrepayment(prepaymentId: number, action: ApprovalAction): Promise<any> {
    const response = await apiClient.post(`${this.basePath}/prepayments/${prepaymentId}/approve`, action);
    return response.data;
  }

  /**
   * Approve or reject an expense report
   */
  async approveExpenseReport(reportId: number, action: ApprovalAction): Promise<any> {
    const response = await apiClient.post(`${this.basePath}/reports/${reportId}/approve`, action);
    return response.data;
  }

  /**
   * Get approval history
   */
  async getApprovals(params?: {
    skip?: number;
    limit?: number;
    entity_type?: string;
    status_filter?: string;
  }): Promise<ApprovalListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.entity_type) searchParams.append('entity_type', params.entity_type);
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
    
    const url = `${this.basePath}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Get approval by ID
   */
  async getApproval(id: number): Promise<ApprovalResponse> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }
}

// Export singleton instance
export const approvalService = new ApprovalService();
