export interface ReimbursementRequest {
  reimbursement_request_id: string;
  request_type: string;
  expense_type: string;
  reference_no: string;
  attachment: string;
  attachment_mask_name: string;
  amount: string;
  request_status: string;
  remarks: string | null;
  requestor_id: string;
  full_name: string | null;
  email: string;
  employee_id: string;
  client_id: string;
  client_name: string;
  hrbp_approver_email: string;
  dynamic_approvers: string[] | null;
  date_approve: string | null;
  next_approval_matrix_id: string;
  next_approver_order: number;
  created_at: string;
  approvers: Approver[];
}

interface Approver {
  approval_matrix_id: string;
  approver_id: string;
  approver_order: number;
  has_approved: boolean;
  has_rejected: boolean;
  performed_by_user_id: string | null;
  description: string | null;
  approver_name: string | null;
  is_group_of_approvers: boolean;
  table_reference: string;
  updated_at: string;
}
