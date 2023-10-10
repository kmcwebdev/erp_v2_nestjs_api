import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { MemphisDevModule } from 'src/memphis-dev/memphis-dev.module';
import { LegalAndComplianceController } from './legal-and-compliance.controller';
import { LegalAndComplianceService } from './services/legal-and-compliance.service';
import { LacLexisnexisSearchService } from './services/memphis/lexisnexis-search.memphis.service';
import { LacLexisnexisDownloadService } from './services/memphis/lexisnexis-download.memphis.service';

@Module({
  imports: [ScheduleModule.forRoot(), HttpModule, MemphisDevModule],
  controllers: [LegalAndComplianceController],
  providers: [
    LegalAndComplianceService,
    LacLexisnexisSearchService,
    LacLexisnexisDownloadService,
  ],
})
export class LegalAndComplianceModule {}
