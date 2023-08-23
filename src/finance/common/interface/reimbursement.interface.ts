export interface Reimbursement {
  reimbursement_request_id: string;
  reimbursement_request_type_id: string;
  expense_type_id: string;
  reference_no: string;
  requestor_id: string;
  attachment: string;
  amount: string;
  request_status_id: string;
  date_approve: string | null;
  created_at: number;
}
