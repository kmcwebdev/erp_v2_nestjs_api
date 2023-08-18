import { Module } from '@nestjs/common';
import { LegalAndComplianceService } from './legal-and-compliance.service';
import { LegalAndComplianceController } from './legal-and-compliance.controller';
import { PostgresModule } from 'src/common/database/postgres.module';

@Module({
  imports: [PostgresModule],
  controllers: [LegalAndComplianceController],
  providers: [LegalAndComplianceService],
})
export class LegalAndComplianceModule {}
