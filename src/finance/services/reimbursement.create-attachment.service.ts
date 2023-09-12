import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { filestackClient } from 'src/common/lib/filestack';

@Injectable()
export class ReimbursementCreateAttachmentService {
  private readonly logger = new Logger(
    ReimbursementCreateAttachmentService.name,
  );

  constructor(private readonly configService: ConfigService) {}

  async upload(file: Express.Multer.File) {
    const dateNumber = Date.now();

    const fileHandle = await filestackClient.upload(
      file.buffer,
      {
        tags: {
          search_query: file.originalname,
        },
      },
      {
        location: this.configService.get('UPLOAD_LOCATION'),
        filename: `${file.originalname}_${dateNumber}`.toLowerCase(),
        container: this.configService.get('UPLOAD_CONTAINER'),
        access: this.configService.get('UPLOAD_ACCESS'),
      },
    );

    return fileHandle;
  }
}
