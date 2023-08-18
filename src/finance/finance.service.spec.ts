import { Test, TestingModule } from '@nestjs/testing';
import { ReimbursementApiService } from './services/reimbursement.api.service';

describe('FinanceService', () => {
  let service: ReimbursementApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReimbursementApiService],
    }).compile();

    service = module.get<ReimbursementApiService>(ReimbursementApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
