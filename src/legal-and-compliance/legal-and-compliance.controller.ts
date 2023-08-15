import { Controller } from '@nestjs/common';
import { LegalAndComplianceService } from './legal-and-compliance.service';

@Controller('legal-and-compliance')
export class LegalAndComplianceController {
  constructor(
    private readonly legalAndComplianceService: LegalAndComplianceService,
  ) {}
}
