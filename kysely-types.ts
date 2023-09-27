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
  created_at: Generated<Timestamp>;
  cursor_id: Generated<Int8>;
}

export interface FinanceReimbursementApprovalLinks {
  approval_link_id: Generated<string>;
  reimbursement_request_id: string;
  approval_link: string;
  token: string;
  link_expired: Generated<boolean | null>;
  created_at: Generated<Timestamp>;
}

export interface FinanceReimbursementApprovalMatrix {
  approval_matrix_id: Generated<string>;
  reimbursement_request_id: string;
  approver_id: string;
  approver_order: number;
  approver_verifier: string | null;
  has_approved: Generated<boolean | null>;
  performed_by_user_id: string | null;
  description: string | null;
  updated_at: Timestamp | null;
  created_at: Generated<Timestamp | null>;
  has_rejected: Generated<boolean | null>;
  is_hrbp: Generated<boolean | null>;
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
  created_at: Generated<Timestamp>;
  sort_order_num: Generated<number | null>;
}

export interface FinanceReimbursementReferenceNumbers {
  reference_no_id: Generated<Int8>;
  reimbursement_request_id: string | null;
  year: number;
  created_at: Generated<Timestamp>;
  prefix: Generated<string | null>;
}

export interface FinanceReimbursementRequestExpenseTypes {
  reimbursement_request_type_id: Generated<string>;
  expense_type_id: string;
}

export interface FinanceReimbursementRequests {
  reimbursement_request_id: Generated<string>;
  reimbursement_request_type_id: string;
  expense_type_id: string;
  reference_no: string | null;
  requestor_id: string;
  attachment: string;
  amount: Numeric;
  request_status_id: Generated<string | null>;
  date_approve: Timestamp | null;
  created_at: Generated<Timestamp>;
  remarks: string | null;
  text_search_properties: string | null;
  cursor_id: Generated<Int8>;
  no_hrbp_set: Generated<boolean | null>;
  dynamic_approvers: string | null;
  attachment_mask_name: string | null;
  next_approver_order: Generated<number | null>;
  is_cancelled: Generated<boolean | null>;
  is_onhold: Generated<boolean | null>;
  payroll_date: Timestamp | null;
  hrbp_request_status_id: Generated<string | null>;
  finance_request_status_id: Generated<string | null>;
}

export interface FinanceReimbursementRequestStatus {
  request_status_id: Generated<string>;
  request_status: string;
  created_at: Generated<Timestamp>;
}

export interface FinanceReimbursementRequestTypes {
  reimbursement_request_type_id: Generated<string>;
  request_type: string | null;
  created_at: Generated<Timestamp>;
}

export interface Groups {
  group_id: Generated<string>;
  group_name: string | null;
  created_at: Generated<Timestamp | null>;
}

export interface PandadocDownloadJob {
  pandadoc_download_job_id: Generated<number>;
  pandadoc_file_id: string | null;
  pandadoc_filename: string;
  status: Generated<string | null>;
  filestack_filepath: string | null;
  finished_at: Timestamp | null;
  description: string | null;
  created_at: Generated<Timestamp>;
}

export interface PandadocDownloadJobs {
  pandadoc_download_job_id: Generated<string>;
  pandadoc_file_id: string | null;
  pandadoc_filename: string;
  status: Generated<string | null>;
  filestack_filepath: string | null;
  finished_at: Timestamp | null;
  description: string | null;
  created_at: Generated<Timestamp>;
}

export interface PandadocUserAccessCredential {
  pandadoc_user_access_id: Generated<number>;
  propelauth_user_id: string | null;
  access_token: string;
  token_type: string;
  expires_in: number;
  access_scope: string;
  refresh_token: string;
  refresh_date: Timestamp;
  created_at: Generated<Timestamp>;
}

export interface PandadocUserAccessCredentials {
  pandadoc_user_access_id: Generated<string>;
  propelauth_user_id: string | null;
  access_token: string;
  token_type: string;
  expires_in: number;
  access_scope: string;
  refresh_token: string;
  refresh_date: Timestamp;
  created_at: Generated<Timestamp>;
}

export interface Users {
  user_id: Generated<string>;
  propelauth_user_id: Generated<string | null>;
  employee_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  client_id: string | null;
  client_name: string | null;
  temporary_propelauth_user_id: Generated<boolean | null>;
  created_at: Generated<Timestamp>;
  position: string | null;
  hrbp_approver_email: string | null;
  temporary_employee_id: Generated<boolean | null>;
  payroll_account: string | null;
  updated_via_cron_erp_hr: Generated<boolean | null>;
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
  pandadoc_download_job: PandadocDownloadJob;
  pandadoc_download_jobs: PandadocDownloadJobs;
  pandadoc_user_access_credential: PandadocUserAccessCredential;
  pandadoc_user_access_credentials: PandadocUserAccessCredentials;
  users: Users;
}
