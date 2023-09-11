import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { ExpenseTypeDto } from 'src/finance/common/dto/expenseType.dto';
import { UpdateReimbursementRequestDTO } from 'src/finance/common/dto/updateReimbursementRequest.dto';
import { CreateReimbursementRequestDTO } from 'src/finance/common/dto/createReimbursementRequest.dto';
import { DeleteReimbursementRequestDTO } from 'src/finance/common/dto/deleteReimbursementRequest.dto';
import { GetAllReimbursementRequestDTO } from './common/dto/getAllReimbursementRequest.dto';
import type { Request, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { GetOneReimbursementRequestDTO } from './common/dto/getOneReimbursementRequest.dto';
import { ReimbursementRequestApprovalDTO } from './common/dto/reimbursementRequestApproval.dto';
import { CancelReimbursementRequestDTO } from './common/dto/cancelReimbursementRequest.dto';

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
  getAllReimbursementRequest(
    @Req() req: Request,
    @Query() query: GetAllReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.getAllReimbursementRequest(
      user,
      query,
    );
  }

  @Post('/reimbursements/requests')
  createReimbursementRequests(
    @Req() req: Request,
    @Body() body: CreateReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.createReimbursementRequest(
      user,
      body,
    );
  }

  @Patch('/reimbursements/requests')
  updateReimbursementRequests(@Body() body: UpdateReimbursementRequestDTO) {
    return body;
  }

  @Delete('/reimbursements/requests')
  deleteReimbursementRequests(@Param() body: DeleteReimbursementRequestDTO) {
    return body;
  }

  @Get('/reimbursements/requests/for-approvals')
  getAllForApprovalReimbursementRequest(@Req() req: Request) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.getAllForApprovalReimbursementRequest(
      user,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/approve')
  approveReimbursementRequest(
    @Req() req: Request,
    @Body() body: ReimbursementRequestApprovalDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.approveReimbursementRequest(
      user,
      body.approval_matrix_ids,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/cancel')
  cancelReimbursementRequest(
    @Req() req: Request,
    @Body() body: CancelReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.cancelReimbursementRequest(
      user,
      body,
    );
  }

  @Get('/reimbursements/requests/dashboard/analytics')
  getReimbursementRequestsAnalytics(@Req() req: Request) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.getReimbursementRequestsAnalytics(
      user,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursements/requests/attachments')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  createReimbursementRequestAttachments(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    return this.financeReimbursementApiService.createReimbursementRequestAttachments(
      file,
    );
  }

  // TODO: Be careful this query can return the reimbursement request of other users unless it's an approver or admin
  @Get('/reimbursements/requests/:reimbursement_request_id')
  getOneReimbursementRequest(@Param() params: GetOneReimbursementRequestDTO) {
    return this.financeReimbursementApiService.getOneReimbursementRequest(
      params,
    );
  }
}
