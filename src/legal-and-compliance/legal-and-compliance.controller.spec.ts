import { Test, TestingModule } from '@nestjs/testing';
import { LegalAndComplianceController } from './legal-and-compliance.controller';
import { LegalAndComplianceService } from './legal-and-compliance.service';

describe('LegalAndComplianceController', () => {
  let controller: LegalAndComplianceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalAndComplianceController],
      providers: [LegalAndComplianceService],
    }).compile();

    controller = module.get<LegalAndComplianceController>(
      LegalAndComplianceController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
