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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request, Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpenseTypeDto } from 'src/finance/common/dto/expenseType.dto';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { Readable } from 'stream';
import { jsonToCsv } from 'src/common/utils/jsonToCsv.utils';
import { GetAllReimbursementRequestDTO } from './common/dto/getAllReimbursementRequest.dto';
import { GetOneReimbursementRequestDTO } from './common/dto/getOneReimbursementRequest.dto';
import { CancelReimbursementRequestDTO } from './common/dto/cancelReimbursementRequest.dto';
import { RejectReimbursementRequestDTO } from './common/dto/rejectReimbursementRequest.dto';
import { ReimbursementRequestApprovalDTO } from './common/dto/approveReimbursementRequest.dto';
import { UpdateReimbursementRequestDTO } from 'src/finance/common/dto/updateReimbursementRequest.dto';
import { CreateReimbursementRequestDTO } from 'src/finance/common/dto/createReimbursementRequest.dto';
import { DeleteReimbursementRequestDTO } from 'src/finance/common/dto/deleteReimbursementRequest.dto';
import { OnHoldReimbursementRequestDTO } from './common/dto/onHoldReimbursementRequest.dto';
import { PendingReimbursementRequestDTO } from './common/dto/pendingReimbursementRequest.dto';
import { GetAuditlogReimbursementRequestDTO } from './common/dto/getAuditlogReimbursementRequest.dto';
import { ReimbursementApiService } from './services/reimbursement.api.service';
import { ReimbursementRequestTypesService } from './services/reimbursement.request-types.service';
import { ReimbursementExpenseTypesService } from './services/reimbursement.expense-types.service';
import { ReimbursementGetAllService } from './services/reimbursement.get-all.service';
import { ReimbursementGetOneService } from './services/reimbursement.get-one.service';
import { ReimbursementCreateService } from './services/reimbursement.create.service';
import { ReimbursementForApprovalService } from './services/reimbursement.for-approval.service';
import { ReimbursementRejectService } from './services/reimbursement.reject.service';
import { ReimbursementCancelService } from './services/reimbursement.cancel.service';
import { ReimbursementCreateAttachmentService } from './services/reimbursement.create-attachment.service';
import { ReimbursementApproveService } from './services/reimbursement.approve.service';
import { ReimbursementOhHoldService } from './services/reimbursement.onhold.service';
import { ReimbursementpPendingService } from './services/reimbursement.pending.service';
import { ReimbursementAuditlogService } from './services/reimbursement.auditlog.service';

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeReimbursementApiService: ReimbursementApiService,
    private readonly reimbursementRequestTypesService: ReimbursementRequestTypesService,
    private readonly reimbursementExpenseTypesService: ReimbursementExpenseTypesService,
    private readonly reimbursementGetAllService: ReimbursementGetAllService,
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
    private readonly reimbursementCreateService: ReimbursementCreateService,
    private readonly reimbursementForApprovalService: ReimbursementForApprovalService,
    private readonly reimbursementApproveService: ReimbursementApproveService,
    private readonly reimbursementRejectService: ReimbursementRejectService,
    private readonly reimbursementOhHoldService: ReimbursementOhHoldService,
    private readonly reimbursementpPendingService: ReimbursementpPendingService,
    private readonly reimbursementCancelService: ReimbursementCancelService,
    private readonly reimbursementCreateAttachmentService: ReimbursementCreateAttachmentService,
    private readonly reimbursementAuditlogService: ReimbursementAuditlogService,
  ) {}

  @Get('/reimbursements/request-types')
  getRequestTypes() {
    return this.reimbursementRequestTypesService.get();
  }

  @Get('/reimbursements/expense-types')
  getExpenseTypes(@Query() query: ExpenseTypeDto) {
    return this.reimbursementExpenseTypesService.get(query.request_type_id);
  }

  @Get('/reimbursements/requests')
  getAllReimbursementRequest(
    @Req() req: Request,
    @Query() query: GetAllReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementGetAllService.get(user, query);
  }

  @Post('/reimbursements/requests')
  createReimbursementRequests(
    @Req() req: Request,
    @Body() body: CreateReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementCreateService.create(user, body);
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

    return this.reimbursementForApprovalService.get(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/approve')
  approveReimbursementRequest(
    @Req() req: Request,
    @Body() body: ReimbursementRequestApprovalDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementApproveService.approve(user, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/onhold')
  onholdReimbursementRequest(
    @Req() req: Request,
    @Body() body: OnHoldReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementOhHoldService.onhold(user, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/pending')
  pendingReimbursementRequest(
    @Req() req: Request,
    @Body() body: PendingReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementpPendingService.pending(user, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/cancel')
  cancelReimbursementRequest(
    @Req() req: Request,
    @Body() body: CancelReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementCancelService.cancel(user, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reimbursement/requests/reject')
  rejectReimbursementRequest(
    @Req() req: Request,
    @Body() body: RejectReimbursementRequestDTO,
  ) {
    const user = req['user'] as RequestUser;

    return this.reimbursementRejectService.reject(user, body);
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

    return this.reimbursementCreateAttachmentService.upload(file);
  }

  @Get('/reimbursements/requests/auditlogs')
  getAuditlogs(@Query() query: GetAuditlogReimbursementRequestDTO) {
    return this.reimbursementAuditlogService.get(query);
  }

  @Get('/reimbursements/requests/reports/hrbp')
  getHrbpReport(@Res({ passthrough: true }) res: Response): StreamableFile {
    // Your provided JSON data
    const data = { name: 'hrbp', age: 14 };

    // Convert JSON to CSV
    const csvString = jsonToCsv(data);

    // Create a Readable stream and push the CSV string to it
    const csvStream = new Readable();
    csvStream.push(csvString);
    csvStream.push(null); // indicates end of the data

    // Set headers
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="data.csv"',
    });

    // Return the streamable file
    return new StreamableFile(csvStream);
  }

  @Get('/reimbursements/requests/reports/finance')
  getFinanceReport(@Res({ passthrough: true }) res: Response): StreamableFile {
    // Your provided JSON data
    const data = { name: 'finance', age: 14 };

    // Convert JSON to CSV
    const csvString = jsonToCsv(data);

    // Create a Readable stream and push the CSV string to it
    const csvStream = new Readable();
    csvStream.push(csvString);
    csvStream.push(null); // indicates end of the data

    // Set headers
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="data.csv"',
    });

    // Return the streamable file
    return new StreamableFile(csvStream);
  }

  @Get('/reimbursements/requests/dashboard/analytics')
  getReimbursementRequestsAnalytics(@Req() req: Request) {
    const user = req['user'] as RequestUser;

    return this.financeReimbursementApiService.getReimbursementRequestsAnalytics(
      user,
    );
  }

  // TODO: Be careful this query can return the reimbursement request of other users unless it's an approver or admin
  @Get('/reimbursements/requests/:reimbursement_request_id')
  getOneReimbursementRequest(@Param() params: GetOneReimbursementRequestDTO) {
    return this.reimbursementGetOneService.get(params);
  }
}
