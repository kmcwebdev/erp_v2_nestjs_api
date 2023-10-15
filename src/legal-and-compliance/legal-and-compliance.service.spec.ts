import { Test, TestingModule } from '@nestjs/testing';
import { LegalAndComplianceService } from './services/legal-and-compliance.service';

describe('LegalAndComplianceService', () => {
  let service: LegalAndComplianceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegalAndComplianceService],
    }).compile();

    service = module.get<LegalAndComplianceService>(LegalAndComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
