import { Controller, Get, Query } from '@nestjs/common';
import { LegalAndComplianceService } from './services/legal-and-compliance.service';
import { LexisnexisSearchDto } from './common/dto/lexisnexis-search.dto';

@Controller('legal-and-compliance')
export class LegalAndComplianceController {
  constructor(
    private readonly legalAndComplianceService: LegalAndComplianceService,
  ) {}

  @Get('lexisnexis-search')
  lexisnexisSearch(@Query() query: LexisnexisSearchDto) {
    return this.legalAndComplianceService.lexisnexisSearch(query);
  }
}
