import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { ExpenseTypeDto } from 'src/common/dto/expenseType.dto';
import { UpdateReimbursementRequestDTO } from 'src/common/dto/updateReimbursementRequest.dto';
import { CreateReimbursementRequestDTO } from 'src/common/dto/createReimbursementRequest.dto';
import { GetReimbursementRequestDTO } from 'src/common/dto/getReimbursementRequest.dto';
import { DeleteReimbursementRequestDTO } from 'src/common/dto/deleteReimbursementRequest.dto';
import { MemphisConsume, Message } from 'memphis-dev';

interface ReimbursementRequestEnvelope {
  schema: {
    type: 'struct';
    fields: {
      name: string;
      type: string;
      optional: boolean;
      field: {
        type: string;
        fields?: {
          name: string;
          type: string;
          optional: boolean;
          field?: {
            type: string;
          };
        }[];
      };
    }[];
    optional: boolean;
    name: string;
    version: number;
  };
  payload: {
    before: null;
    after: {
      reimbursement_request_id: string;
      reimbursement_request_type_id: string;
      expense_type_id: string;
      reference_no: string;
      requestor_id: string;
      attachment: string;
      amount: string;
      request_status_id: string;
      date_approve: null;
      created_at: number;
    };
    source: {
      version: string;
      connector: string;
      name: string;
      ts_ms: number;
      snapshot: string;
      db: string;
      sequence: string[];
      schema: string;
      table: string;
      txId: number;
      lsn: number;
      xmin: null;
    };
    op: 'c';
    ts_ms: number;
    transaction: null;
  };
}

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeReimbursementApiService: ReimbursementApiService,
  ) {}

  @Get('/reimbursements/request-types')
  getRequestTypes() {
    return this.financeReimbursementApiService.getRequestTypes();
  }

  @Get('/reimbursements/expense-types')
  getExpenseTypes(@Query() query: ExpenseTypeDto) {
    return this.financeReimbursementApiService.getExpenseTypes(
      query.request_type_id,
    );
  }

  @Get('/reimbursements/requests')
  getReimbursementRequests(@Query() query: GetReimbursementRequestDTO) {
    return query;
  }

  @Post('/reimbursements/requests')
  createReimbursementRequests(@Body() body: CreateReimbursementRequestDTO) {
    return this.financeReimbursementApiService.createReimbursementRequest(body);
  }

  @Patch('/reimbursements/requests')
  updateReimbursementRequests(@Body() body: UpdateReimbursementRequestDTO) {
    return body;
  }

  @Delete('/reimbursements/requests')
  deleteReimbursementRequests(@Param() body: DeleteReimbursementRequestDTO) {
    return body;
  }

  @MemphisConsume({
    stationName: 'cdc-events',
    consumerName: 'cdc-events.consumer',
    consumerGroup: 'cdc-events.group',
  })
  async cdcEvents(message: Message) {
    const data: ReimbursementRequestEnvelope = JSON.parse(
      message?.getData().toString() || '{}',
    );

    function detectChanges(oldObj: any, newObj: any): string {
      const changes: string[] = [];

      for (const key in newObj) {
        if (oldObj[key] !== newObj[key]) {
          changes.push(`${key} from ${oldObj[key]} becomes ${newObj[key]}`);
        }
      }

      return changes.join(' and ');
    }

    const { source, before, after } = data.payload;
    const { table } = source;

    const SCHEDULED_ID = '83ad9a7a-3ff6-469f-a4e0-20c202ac6ba4';
    const UNSCHEDULED_ID = '9850f2aa-40c4-4fd5-8708-c8edf734d83f';
    const reimbursementRequest = table === 'finance_reimbursement_requests';
    const isNewRecord = before === null;

    if (reimbursementRequest && isNewRecord) {
      const { reimbursement_request_id, reimbursement_request_type_id } = after;

      const isScheduled = reimbursement_request_type_id === SCHEDULED_ID;
      const isUnscheduled = reimbursement_request_type_id === UNSCHEDULED_ID;

      if (isScheduled) {
        this.financeReimbursementApiService.scheduledReimbursementRequestApprovalRouting(
          reimbursement_request_id,
        );
      }

      if (isUnscheduled) {
        this.financeReimbursementApiService.unScheduledReimbursementRequestApprovalRouting(
          reimbursement_request_id,
        );
      }
    }

    if (!isNewRecord) {
      const changes = detectChanges(before, data.payload.after);

      console.log(source.table + ': ' + changes);
    }

    message.ack();
  }

  @MemphisConsume({
    stationName: 'finance.reimbursement.user',
    consumerName: 'finance.reimbursement.user.consumer-name',
    consumerGroup: 'finance.reimbursement.user.consumer-group',
  })
  async userEvents(message: Message) {
    console.log(message?.getData().toString());
    message.ack();
  }
}
