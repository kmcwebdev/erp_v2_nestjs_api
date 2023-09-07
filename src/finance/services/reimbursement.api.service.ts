import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/types';
import { CreateReimbursementRequestType } from 'src/finance/common/dto/createReimbursementRequest.dto';
import { GetAllReimbursementRequestType } from '../common/dto/getAllReimbursementRequest.dto';
import { filestackClient } from 'src/common/lib/filestack';
import { ConfigService } from '@nestjs/config';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { GetOneReimbursementRequestType } from '../common/dto/getOneReimbursementRequest.dto';
import {
  ONHOLD_REQUEST,
  PENDING_REQUEST,
  SCHEDULED_REQUEST,
  UNSCHEDULED_REQUEST,
} from '../common/constant';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ReimbursementApiService {
  private readonly logger = new Logger(ReimbursementApiService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async getRequestTypes() {
    return await this.pgsql
      .selectFrom('finance_reimbursement_request_types')
      .select(['reimbursement_request_type_id', 'request_type'])
      .execute();
  }

  async getExpenseTypes(requestTypeId: string) {
    return await this.pgsql
      .selectFrom('finance_reimbursement_request_expense_types')
      .innerJoin(
        'finance_reimbursement_expense_types',
        'finance_reimbursement_expense_types.expense_type_id',
        'finance_reimbursement_request_expense_types.expense_type_id',
      )
      .select([
        'finance_reimbursement_request_expense_types.expense_type_id',
        'finance_reimbursement_expense_types.expense_type',
      ])
      .where(
        'finance_reimbursement_request_expense_types.reimbursement_request_type_id',
        '=',
        requestTypeId,
      )
      .execute();
  }

  async getAllReimbursementRequest(
    user: RequestUser,
    data: GetAllReimbursementRequestType,
  ) {
    const { original_user_id } = user;
    const default_page_limit = 10;

    const rawQuery = sql`SELECT 
              frr.reimbursement_request_id,
              frr.reference_no,
              frrt.request_type,
              fret.expense_type,
              frrs.request_status,
              frr.amount,
              frr.attachment,
              frr.remarks,
              u.full_name,
              u.email,
              u.employee_id,
              frr.date_approve,
              frr.created_at,
              frr.cursor_id::TEXT
              ${
                data?.text_search
                  ? sql`
              ,ts_rank(to_tsvector('english', coalesce(frr.text_search_properties, '')), websearch_to_tsquery(${data.text_search})) AS rank`
                  : sql``
              }  
            FROM finance_reimbursement_requests as frr
            INNER JOIN finance_reimbursement_request_types AS frrt
              ON frrt.reimbursement_request_type_id = frr.reimbursement_request_type_id
            INNER JOIN finance_reimbursement_expense_types AS fret
              ON frr.expense_type_id = fret.expense_type_id
            INNER JOIN finance_reimbursement_request_status AS frrs
              ON frrs.request_status_id = frr.request_status_id
            INNER JOIN users AS u
              ON u.user_id = frr.requestor_id
            WHERE frr.requestor_id = ${original_user_id}
              ${
                data?.reimbursement_type_id
                  ? sql`
              AND frr.reimbursement_request_type_id = ${data.reimbursement_type_id}`
                  : sql``
              }
              ${
                data?.expense_type_id
                  ? sql`
              AND frr.expense_type_id = ${data.expense_type_id}`
                  : sql``
              }
              ${
                data?.request_status_id
                  ? sql`
              AND frr.request_status_id = ${data.request_status_id}`
                  : sql``
              }
              ${
                data?.amount_min && data?.amount_max
                  ? sql`
              AND frr.amount BETWEEN ${data.amount_min} AND ${data.amount_max}`
                  : sql``
              }
              ${
                data?.reference_no
                  ? sql`
              AND frr.reference_no = ${data.reference_no}`
                  : sql``
              }
              ${
                data?.last_id
                  ? sql`
              AND frr.cursor_id > ${data.last_id}`
                  : sql``
              }
              ${
                data?.text_search
                  ? sql`
              AND to_tsvector('english', coalesce(frr.text_search_properties, '')) @@ websearch_to_tsquery(${data.text_search})`
                  : sql``
              }
            ${
              data?.text_search
                ? sql`ORDER BY rank DESC`
                : sql`${
                    data?.last_id ? sql`` : sql`ORDER BY frr.created_at DESC`
                  }`
            } LIMIT ${data?.page_limit || default_page_limit}
            `;

    const requests = await rawQuery.execute(this.pgsql);

    return requests.rows;
  }

  async getOneReimbursementRequest(params: GetOneReimbursementRequestType) {
    const singleRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const request = trx
          .selectFrom('finance_reimbursement_requests')
          .innerJoin(
            'finance_reimbursement_request_types',
            'finance_reimbursement_request_types.reimbursement_request_type_id',
            'finance_reimbursement_requests.reimbursement_request_type_id',
          )
          .innerJoin(
            'finance_reimbursement_expense_types',
            'finance_reimbursement_expense_types.expense_type_id',
            'finance_reimbursement_requests.expense_type_id',
          )
          .innerJoin(
            'finance_reimbursement_request_status',
            'finance_reimbursement_request_status.request_status_id',
            'finance_reimbursement_requests.request_status_id',
          )
          .innerJoin(
            'finance_reimbursement_approval_matrix',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'finance_reimbursement_requests.reimbursement_request_id',
          )
          .innerJoin(
            'users',
            'users.user_id',
            'finance_reimbursement_requests.requestor_id',
          )
          .select([
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'finance_reimbursement_requests.reference_no',
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_expense_types.expense_type',
            'finance_reimbursement_request_status.request_status',
            'finance_reimbursement_requests.amount',
            'finance_reimbursement_requests.attachment',
            'finance_reimbursement_requests.remarks',
            'users.full_name',
            'users.email',
            'users.employee_id',
            'finance_reimbursement_requests.date_approve',
            'finance_reimbursement_requests.created_at',
          ])
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            params.reimbursement_request_id,
          );

        const singleRequest = await request.executeTakeFirst();

        const approvers = await this.pgsql
          .selectFrom('finance_reimbursement_approval_matrix')
          .innerJoin(
            'finance_reimbursement_approvers',
            'finance_reimbursement_approvers.approver_id',
            'finance_reimbursement_approval_matrix.approver_id',
          )
          .select([
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'finance_reimbursement_approval_matrix.approver_order',
            'finance_reimbursement_approval_matrix.has_approved',
            'finance_reimbursement_approval_matrix.performed_by_user_id',
            'finance_reimbursement_approval_matrix.description',
            'finance_reimbursement_approval_matrix.updated_at as date_approve',
            'finance_reimbursement_approvers.signatory_id',
            'finance_reimbursement_approvers.is_group_of_approvers',
            'finance_reimbursement_approvers.table_reference',
          ])
          .where(
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            '=',
            singleRequest.reimbursement_request_id,
          )
          .orderBy('approver_order', 'asc')
          .execute();

        return Object.assign(singleRequest, { approvers: approvers });
      });

    return singleRequest;
  }

  async getForApprovalReimbursementRequest(user: RequestUser) {
    const approverIds = [];

    const approvers = await this.pgsql.transaction().execute(async (trx) => {
      const single = await trx
        .selectFrom('finance_reimbursement_approvers')
        .select('approver_id')
        .where('signatory_id', '=', user.original_user_id)
        .executeTakeFirst();

      const approverDepartment = await trx
        .selectFrom('departments')
        .select(['departments.group_id'])
        .where('user_id', '=', user.original_user_id)
        .executeTakeFirst();

      const group = await trx
        .selectFrom('groups')
        .select(['groups.group_id'])
        .where('groups.group_id', '=', approverDepartment?.group_id || null)
        .executeTakeFirst();

      return { single, group };
    });

    if (approvers?.single) {
      approverIds.push(approvers.single.approver_id);
    }

    if (approvers?.group) {
      approverIds.push(approvers.group.group_id);
    }

    if (approverIds.length === 0) {
      return [];
    }

    const rawQuery = await sql`SELECT 
                        fram.approval_matrix_id,
                        frr.reimbursement_request_id,
                        frr.reference_no,
                        frrt.request_type,
                        fret.expense_type,
                        frrs.request_status,
                        frr.amount,
                        fram.approver_id,
                        fram.approver_order,
                        fram.has_approved,
                        fram.performed_by_user_id,
                        fram.description,
                        fram.updated_at as date_approve,
                        frr.created_at
                      FROM finance_reimbursement_approval_matrix AS fram
                      INNER JOIN finance_reimbursement_requests AS frr
                        ON frr.reimbursement_request_id = fram.reimbursement_request_id
                      INNER JOIN finance_reimbursement_request_types AS frrt
                        ON frrt.reimbursement_request_type_id = frr.reimbursement_request_type_id
                      INNER JOIN finance_reimbursement_expense_types AS fret
                        ON frr.expense_type_id = fret.expense_type_id
                      INNER JOIN finance_reimbursement_request_status AS frrs
                        ON frrs.request_status_id = frr.request_status_id
                      WHERE fram.approver_id IN (${approverIds.join(',')})
                      AND fram.has_approved = false
                      ORDER BY created_at DESC LIMIT 10`.execute(this.pgsql);

    return rawQuery.rows;
  }

  async approveReimbursementRequest(user: RequestUser, matrixId: string) {
    const approveReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const updateMatrix = await trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_approved: true,
            performed_by_user_id: user.original_user_id,
            updated_at: new Date(),
          })
          .where('approval_matrix_id', '=', matrixId)
          .executeTakeFirst();

        const matrix = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select([
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.approver_order',
          ])
          .where('approval_matrix_id', '=', matrixId)
          .where('has_approved', '=', false)
          .orderBy('approver_order', 'asc')
          .executeTakeFirst();

        if (matrix) {
          const sendToNextApproverResponse = await firstValueFrom(
            this.httpService
              .post(
                '/api/email/confirmation',
                {
                  to: 'chrisgelosulit@gmail.com',
                  requestId: 'test',
                  hrbpManagerName: 'test',
                  fullName: 'test',
                  employeeId: 'test',
                  expenseType: 'test',
                  expenseDate: 'test',
                  amount: 'test',
                  receiptsAttached: 'test',
                },
                {
                  baseURL: this.configService.get('FRONT_END_URL'),
                },
              )
              .pipe(
                catchError((error: AxiosError) => {
                  this.logger.log(error?.response?.data);

                  throw Error('Failed to send to next approver');
                }),
              ),
          );

          this.logger.log(sendToNextApproverResponse);
        }

        return updateMatrix;
      });

    return approveReimbursementRequest;
  }

  async getReimbursementRequestsAnalyticsForFinance() {
    const [scheduledRequestCount, unScheduledRequestCount, onHoldRequestCount] =
      await Promise.all([
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE reimbursement_request_type_id = ${SCHEDULED_REQUEST}`.execute(
          this.pgsql,
        ),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE reimbursement_request_type_id = ${UNSCHEDULED_REQUEST}`.execute(
          this.pgsql,
        ),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests
        WHERE request_status_id = ${ONHOLD_REQUEST}`.execute(this.pgsql),
      ]);

    return {
      totalScheduledRequest: scheduledRequestCount.rows.length
        ? scheduledRequestCount.rows[0]
        : 0,
      totalUnScheduledRequest: unScheduledRequestCount.rows.length
        ? unScheduledRequestCount.rows[0]
        : 0,
      totalOnholdRequest: onHoldRequestCount.rows.length
        ? onHoldRequestCount.rows[0]
        : 0,
    };
  }

  async getReimbursementRequestsAnalytics(user: RequestUser) {
    const { original_user_id, user_assigned_role } = user;

    const [financeAnalytics, pendingRequestCount, overallRequestCount] =
      await Promise.all([
        this.getReimbursementRequestsAnalyticsForFinance(),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE requestor_id = ${original_user_id}
        AND request_status_id = ${PENDING_REQUEST}`.execute(this.pgsql),
        sql`SELECT COUNT(*) FROM finance_reimbursement_requests 
        WHERE requestor_id = ${original_user_id}`.execute(this.pgsql),
      ]);

    return {
      myPendingRequest: pendingRequestCount.rows.length
        ? pendingRequestCount.rows[0]
        : 0,
      myTotalRequest: overallRequestCount.rows.length
        ? overallRequestCount.rows[0]
        : 0,
      others: user_assigned_role === 'finance' ? financeAnalytics : null,
    };
  }

  async createReimbursementRequest(
    user: RequestUser,
    data: CreateReimbursementRequestType,
  ) {
    const { original_user_id } = user;

    const newReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const newReferenceNo = await trx
          .insertInto('finance_reimbursement_reference_numbers')
          .values({
            year: new Date().getFullYear(),
          })
          .returning(['reference_no_id', 'year', 'prefix'])
          .executeTakeFirstOrThrow();

        const newReimbursementRequest = await trx
          .insertInto('finance_reimbursement_requests')
          .values({
            requestor_id: original_user_id,
            reimbursement_request_type_id: data.reimbursement_request_type_id,
            remarks: data?.remarks,
            expense_type_id: data.expense_type_id,
            reference_no: `${newReferenceNo.prefix}${newReferenceNo.year}-${newReferenceNo.reference_no_id}`,
            attachment: data.attachment,
            amount: data.amount,
            dynamic_approvers: data?.approvers?.length
              ? data.approvers.join(',')
              : null,
          })
          .returning('reimbursement_request_id')
          .executeTakeFirstOrThrow();

        if (newReferenceNo && newReimbursementRequest) {
          await trx
            .updateTable('finance_reimbursement_reference_numbers')
            .set({
              reimbursement_request_id:
                newReimbursementRequest.reimbursement_request_id,
            })
            .where('reference_no_id', '=', newReferenceNo.reference_no_id)
            .execute();
        }

        const queryNewReimbursementRequest = await trx
          .selectFrom('finance_reimbursement_requests')
          .innerJoin(
            'finance_reimbursement_request_types',
            'finance_reimbursement_request_types.reimbursement_request_type_id',
            'finance_reimbursement_requests.reimbursement_request_type_id',
          )
          .innerJoin(
            'finance_reimbursement_expense_types',
            'finance_reimbursement_expense_types.expense_type_id',
            'finance_reimbursement_requests.expense_type_id',
          )
          .innerJoin(
            'users',
            'users.user_id',
            'finance_reimbursement_requests.requestor_id',
          )
          .innerJoin(
            'finance_reimbursement_request_status',
            'finance_reimbursement_request_status.request_status_id',
            'finance_reimbursement_requests.request_status_id',
          )
          .select([
            'reimbursement_request_id',
            'reference_no',
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_expense_types.expense_type',
            'users.full_name',
            'users.client_name',
            'users.email',
            'attachment',
            'amount',
            'finance_reimbursement_request_status.request_status',
            'date_approve',
            'finance_reimbursement_requests.created_at',
          ])
          .where(
            'reimbursement_request_id',
            '=',
            newReimbursementRequest.reimbursement_request_id,
          )
          .executeTakeFirstOrThrow();

        return queryNewReimbursementRequest;
      });

    return newReimbursementRequest;
  }

  async createReimbursementRequestAttachments(file: Express.Multer.File) {
    const fileHandle = await filestackClient.upload(
      file.buffer,
      {
        tags: {
          search_query: file.originalname,
        },
      },
      {
        location: this.configService.get('UPLOAD_LOCATION'),
        filename: file.originalname,
        container: this.configService.get('UPLOAD_CONTAINER'),
        access: this.configService.get('UPLOAD_ACCESS'),
      },
    );

    return fileHandle;
  }
}
