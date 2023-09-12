import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReimbursementAnalyticsService {
  private readonly logger = new Logger(ReimbursementAnalyticsService.name);
}
