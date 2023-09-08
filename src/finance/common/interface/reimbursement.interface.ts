export interface Reimbursement {
  reimbursement_request_id: string;
  reference_no: string;
  request_type_id: string;
  request_type: string;
  expense_type_id: string;
  expense_type: string;
  request_status_id: string;
  request_status: string;
  requestor_id: string;
  attachment: string;
  amount: string;
  date_approve: string | null;
  dynamic_approvers: string[] | null;
  user_id: string;
  full_name: string | null;
  client_name: string | null;
  email: string | null;
  employee_id: string | null;
  created_at: number;
}
