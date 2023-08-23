import { Module } from '@nestjs/common';
import { LegalAndComplianceService } from './legal-and-compliance.service';
import { LegalAndComplianceController } from './legal-and-compliance.controller';

@Module({
  imports: [],
  controllers: [LegalAndComplianceController],
  providers: [LegalAndComplianceService],
})
export class LegalAndComplianceModule {}
