import { Test, TestingModule } from '@nestjs/testing';
import { FinanceController } from './finance.controller';
import { ReimbursementApiService } from './services/reimbursement.api.service';

describe('FinanceController', () => {
  let controller: FinanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [ReimbursementApiService],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
