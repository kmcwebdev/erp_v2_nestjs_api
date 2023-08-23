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
import { ExpenseTypeDto } from 'src/finance/common/dto/expenseType.dto';
import { UpdateReimbursementRequestDTO } from 'src/finance/common/dto/updateReimbursementRequest.dto';
import { CreateReimbursementRequestDTO } from 'src/finance/common/dto/createReimbursementRequest.dto';
import { GetReimbursementRequestDTO } from 'src/finance/common/dto/getReimbursementRequest.dto';
import { DeleteReimbursementRequestDTO } from 'src/finance/common/dto/deleteReimbursementRequest.dto';

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
}
