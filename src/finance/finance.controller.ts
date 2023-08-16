import { Controller, Get, Query } from '@nestjs/common';
import { ReimbursementService } from './services/reimbursement.service';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ExpenseTypeSchema = z.object({
  request_type_id: z.string().min(1),
});

// class is required for using DTO as a type
class ExpenseTypeDto extends createZodDto(ExpenseTypeSchema) {}

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: ReimbursementService) {}

  @Get('/reimbursements/request-types')
  requestTypes() {
    return this.financeService.getRequestTypes();
  }

  @Get('/reimbursements/expense-types')
  getExpenseTypes(@Query() query: ExpenseTypeDto) {
    return this.financeService.getExpenseTypes(query.request_type_id);
  }
}
