create extension if not exists "uuid-ossp";

create table if not exists users (
    user_id uuid default uuid_generate_v4() primary key,
    propelauth_user_id uuid default uuid_generate_v4() unique,
    employee_id varchar(255) unique,
    full_name varchar(255),
    first_name varchar(255),
    last_name varchar(255),
    position varchar(255),
    email varchar(100) unique,
    client_id varchar(255),
    client_name varchar(255),
    hrbp_approver_email varchar(100),
    temporary_propelauth_user_id boolean default true,
    temporary_employee_id boolean default true,
    created_at timestamp default current_timestamp
);

create table if not exists groups (
    group_id uuid default uuid_generate_v4() primary key,
    group_name varchar(100) unique,
    created_at timestamp default current_timestamp
);

create table if not exists departments (
    department_id uuid default  uuid_generate_v4() primary key,
    group_id uuid not null,
    foreign key (group_id) references groups(group_id),
    user_id uuid not null,
    foreign key (user_id) references users(user_id),
    created_at timestamp default current_timestamp
);

create table if not exists pandadoc_user_access_credentials (
	pandadoc_user_access_id uuid default uuid_generate_v4() primary key,
	propelauth_user_id varchar(255) unique,
	access_token varchar(255) not null,
	token_type varchar(50) not null,
	expires_in int not null,
	access_scope varchar(255) not null,
	refresh_token varchar(255) not null,
	refresh_date date not null,
	created_at timestamp default current_timestamp
);

create table if not exists pandadoc_download_jobs (
    pandadoc_download_job_id uuid default uuid_generate_v4() primary key,
    pandadoc_file_id varchar(100) unique,
    pandadoc_filename varchar(255) not null,
    status varchar(50) default 'Downloading',
    filestack_filepath varchar(255),
    finished_at timestamp,
    description text,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_request_types (
    reimbursement_request_type_id uuid default uuid_generate_v4() primary key,
    request_type varchar(100) unique,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_expense_types (
    expense_type_id uuid default uuid_generate_v4() primary key,
    expense_type varchar(255) unique,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_request_expense_types (
    reimbursement_request_type_id uuid default uuid_generate_v4() not null,
    expense_type_id uuid not null,
    primary key (reimbursement_request_type_id, expense_type_id),
    foreign key (reimbursement_request_type_id) references finance_reimbursement_request_types (reimbursement_request_type_id),
    foreign key (expense_type_id) references finance_reimbursement_expense_types (expense_type_id)
);

create table if not exists finance_reimbursement_request_status (
    request_status_id uuid default uuid_generate_v4() primary key,
    request_status varchar(100) unique,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_requests (
    reimbursement_request_id uuid default uuid_generate_v4() primary key,
    reimbursement_request_type_id uuid not null,
    foreign key (reimbursement_request_type_id) references finance_reimbursement_request_types(reimbursement_request_type_id),
    expense_type_id uuid not null,
    remarks text,
    reference_no varchar(255) unique,
    foreign key (expense_type_id) references finance_reimbursement_expense_types(expense_type_id),
    requestor_id uuid not null,
    foreign key (requestor_id) references users(user_id),
    attachment text not null,
    attachment_mask_name text,
    amount decimal(30, 2) not null,
    request_status_id uuid default '33bfa3b3-1dfa-471f-a7bb-80a9a8842fc5',
    foreign key (request_status_id) references finance_reimbursement_request_status(request_status_id),
    dynamic_approvers text,
    next_approver_order smallint default 1,
    date_approve timestamp,
    text_search_properties text,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_reference_numbers (
    reference_no_id bigserial primary key,
    reimbursement_request_id uuid,
    year int not null,
    prefix varchar(50) default 'R',
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_approvers (
    approver_id uuid default uuid_generate_v4() primary key,
    signatory_id uuid not null,
    is_group_of_approvers boolean default false,
    table_reference varchar(200) not null,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_approval_matrix (
    approval_matrix_id uuid default uuid_generate_v4() primary key,
    reimbursement_request_id uuid not null,
    foreign key (reimbursement_request_id) references finance_reimbursement_requests(reimbursement_request_id),
    approver_id uuid not null,
    foreign key (approver_id) references finance_reimbursement_approvers(approver_id),
    approver_order int not null,
    approver_verifier varchar(255) unique, -- eg: 1<->1 | 1 reimbursement_request_id - 1 approver_order
    has_approved boolean default false,
    performed_by_user_id uuid,
    foreign key (performed_by_user_id) references users(user_id),
    description text,
    updated_at timestamp,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_approval_links (
    approval_link_id uuid default uuid_generate_v4() primary key,
    reimbursement_request_id uuid not null,
    foreign key (reimbursement_request_id) references finance_reimbursement_requests(reimbursement_request_id),
    approval_link text not null,
    token text not null,
    link_expired boolean default false,
    created_at timestamp default current_timestamp
);

create table if not exists finance_reimbursement_approval_audit_logs (
    audit_log_id uuid default uuid_generate_v4() primary key,
    reimbursement_request_id uuid not null,
    foreign key (reimbursement_request_id) references finance_reimbursement_requests(reimbursement_request_id),
    user_id int not null,
    foreign key (user_id) references users(user_id),
    description text,
    created_at timestamp default current_timestamp
);

create table if not exists lexisnexis_diligence_search (
    audit_log_id uuid default uuid_generate_v4() primary key,
    legacy_client_id varchar(255),
    search_category varchar(255),
    created_at int not null
);

CREATE OR REPLACE FUNCTION delete_reimbursement_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM finance_reimbursement_reference_numbers
  WHERE reimbursement_request_id = OLD.reimbursement_request_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER delete_reimbursement_reference_number_trigger
AFTER DELETE ON finance_reimbursement_requests
FOR EACH ROW
EXECUTE FUNCTION delete_reimbursement_reference_number();

CREATE OR REPLACE FUNCTION delete_finance_reimbursement_approval_matrix()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM finance_reimbursement_approval_matrix
    WHERE reimbursement_request_id = OLD.reimbursement_request_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER finance_reimbursement_approval_matrix_trigger
BEFORE DELETE ON finance_reimbursement_requests
FOR EACH ROW
EXECUTE FUNCTION delete_finance_reimbursement_approval_matrix();

CREATE OR REPLACE FUNCTION delete_finance_reimbursement_approval_links()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM finance_reimbursement_approval_links
    WHERE reimbursement_request_id = OLD.reimbursement_request_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER finance_reimbursement_approval_links_trigger
BEFORE DELETE ON finance_reimbursement_requests
FOR EACH ROW
EXECUTE FUNCTION delete_finance_reimbursement_approval_links();