import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { sql } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { GetAuditlogReimbursementRequestType } from '../common/dto/get-auditlog-reimbursement-request.dto';

@Injectable()
export class ReimbursementAuditlogService {
  private readonly logger = new Logger(ReimbursementAuditlogService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async get(data: GetAuditlogReimbursementRequestType) {
    const auditlogs = await sql`SELECT 
                fr.audit_log_id,
                u.full_name,
                u.email,
                fr.description,
                fr.created_at
          FROM finance_reimbursement_approval_audit_logs fr
          INNER JOIN users u ON fr.user_id = u.user_id
          WHERE fr.reimbursement_request_id = ${data.reimbursement_request_id} 
          ${data?.cursor_id ? sql`AND fr.cursor_id < ${data.cursor_id}` : sql``}
          ORDER BY fr.created_at DESC LIMIT 10
        `.execute(this.pgsql);

    if (!auditlogs.rows.length) {
      throw new HttpException('Request id not found', HttpStatus.NOT_FOUND);
    }

    return auditlogs.rows;
  }
}
