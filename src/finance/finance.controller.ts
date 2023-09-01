import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { User } from '@propelauth/node';
import type { Request, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from 'src/auth/common/decorator/public.decorator';

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
    const user = req['user'] as User;

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
    const user = req['user'] as User;

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

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('/reimbursements/requests/attachments')
  @UseInterceptors(FileInterceptor('file'))
  createReimbursementRequestAttachments(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.financeReimbursementApiService.createReimbursementRequestAttachments(
      file,
    );
  }
}
