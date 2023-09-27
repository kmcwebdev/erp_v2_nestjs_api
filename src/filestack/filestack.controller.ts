import { Controller } from '@nestjs/common';
import { FilestackService } from './filestack.service';

@Controller('filestack')
export class FilestackController {
  constructor(private readonly filestackService: FilestackService) {}
}
