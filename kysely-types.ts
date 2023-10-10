import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Int8 = ColumnType<string, string | number | bigint, string | number | bigint>;

export type Numeric = ColumnType<string, string | number, string | number>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface Departments {
  department_id: Generated<string>;
  group_id: string;
  user_id: string;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementApprovalAuditLogs {
  audit_log_id: Generated<string>;
  reimbursement_request_id: string;
  user_id: string;
  description: string | null;
  cursor_id: Generated<Int8>;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementApprovalLinks {
  approval_link_id: Generated<string>;
  reimbursement_request_id: string;
  approve_link: string;
  rejection_link: string;
  approver_matrix_id: string;
  token: string;
  link_expired: Generated<boolean | null>;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementApprovalMatrix {
  approval_matrix_id: Generated<string>;
  reimbursement_request_id: string;
  approver_id: string;
  is_hrbp: Generated<boolean | null>;
  approver_order: number;
  has_approved: Generated<boolean | null>;
  has_rejected: Generated<boolean | null>;
  performed_by_user_id: string | null;
  description: string | null;
  updated_at: Timestamp | null;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementApprovers {
  approver_id: Generated<string>;
  signatory_id: string;
  is_group_of_approvers: Generated<boolean | null>;
  table_reference: string;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementExpenseTypes {
  expense_type_id: Generated<string>;
  expense_type: string | null;
  sort_order_num: Generated<number | null>;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementReferenceNumbers {
  reference_no_id: Generated<Int8>;
  reimbursement_request_id: string | null;
  year: number;
  prefix: Generated<string | null>;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementRequestExpenseTypes {
  reimbursement_request_type_id: Generated<string>;
  expense_type_id: string;
}

export interface FinanceReimbursementRequests {
  reimbursement_request_id: Generated<string>;
  reimbursement_request_type_id: string;
  expense_type_id: string;
  remarks: string | null;
  reference_no: string | null;
  requestor_id: string;
  attachment: string;
  attachment_mask_name: string | null;
  amount: Numeric;
  request_status_id: Generated<string | null>;
  hrbp_request_status_id: Generated<string | null>;
  finance_request_status_id: Generated<string | null>;
  dynamic_approvers: string | null;
  next_approver_order: Generated<number | null>;
  payroll_date: Timestamp | null;
  date_approve: Timestamp | null;
  created_at: Generated<Timestamp | null>;
  date_processed: Timestamp | null;
}

export interface FinanceReimbursementRequestStatus {
  request_status_id: Generated<string>;
  request_status: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface FinanceReimbursementRequestTypes {
  reimbursement_request_type_id: Generated<string>;
  request_type: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface Groups {
  group_id: Generated<string>;
  group_name: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface LexisnexisSearch {
  lexisnexis_search_id: Generated<string>;
  search_query: string;
  erp_client_id: string | null;
  search_category: string | null;
  query_type: string | null;
  total_size: Generated<number | null>;
  download_id: string | null;
  pdf_report_url: string | null;
  report_generation_status: Generated<string | null>;
  report_generation_desc: string | null;
  finished_at: Timestamp | null;
  created_at: Generated<Timestamp | null>;
}

export interface Users {
  user_id: Generated<string>;
  propelauth_user_id: Generated<string | null>;
  employee_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  email: string | null;
  client_id: string | null;
  client_name: string | null;
  hrbp_approver_email: string | null;
  payroll_account: string | null;
  temporary_propelauth_user_id: Generated<boolean | null>;
  temporary_employee_id: Generated<boolean | null>;
  updated_via_cron_erp_hr: Generated<boolean | null>;
  created_at: Generated<Timestamp | null>;
}

export interface DB {
  departments: Departments;
  finance_reimbursement_approval_audit_logs: FinanceReimbursementApprovalAuditLogs;
  finance_reimbursement_approval_links: FinanceReimbursementApprovalLinks;
  finance_reimbursement_approval_matrix: FinanceReimbursementApprovalMatrix;
  finance_reimbursement_approvers: FinanceReimbursementApprovers;
  finance_reimbursement_expense_types: FinanceReimbursementExpenseTypes;
  finance_reimbursement_reference_numbers: FinanceReimbursementReferenceNumbers;
  finance_reimbursement_request_expense_types: FinanceReimbursementRequestExpenseTypes;
  finance_reimbursement_request_status: FinanceReimbursementRequestStatus;
  finance_reimbursement_request_types: FinanceReimbursementRequestTypes;
  finance_reimbursement_requests: FinanceReimbursementRequests;
  groups: Groups;
  lexisnexis_search: LexisnexisSearch;
  users: Users;
}
