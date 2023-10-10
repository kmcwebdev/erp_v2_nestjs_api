import { Controller, Get, Query } from '@nestjs/common';
import { LegalAndComplianceService } from './services/legal-and-compliance.service';
import { LexisnexisSearchDto } from './common/dto/lexisnexis-search.dto';
import { Public } from 'src/auth/common/decorator/public.decorator';

@Controller('legal-and-compliance')
export class LegalAndComplianceController {
  constructor(
    private readonly legalAndComplianceService: LegalAndComplianceService,
  ) {}

  @Get('lexisnexis-search')
  lexisnexisSearch(@Query() query: LexisnexisSearchDto) {
    return this.legalAndComplianceService.lexisnexisSearch(query);
  }

  @Public()
  @Get('test')
  test() {
    this.legalAndComplianceService.test();

    return 'OK';
  }
}
