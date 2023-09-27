import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { filestackClient } from 'src/common/lib/filestack';

@Injectable()
export class ReimbursementCreateAttachmentService {
  private readonly logger = new Logger(
    ReimbursementCreateAttachmentService.name,
  );

  uploadLocation = '';
  uploadContainer = '';
  uploadAccess = '';

  constructor(private readonly configService: ConfigService) {
    this.uploadLocation = this.configService.get('UPLOAD_LOCATION');
    this.uploadContainer = this.configService.get(
      'REIMBURSEMENT_ATTACHMENT_UPLOAD_CONTAINER',
    );
    this.uploadAccess = this.configService.get(
      'REIMBURSEMENT_ATTACHMENT_UPLOAD_ACCESS',
    );
  }

  async upload(file: Express.Multer.File) {
    const dateNumber = Date.now();

    const uniqueFilename = `${file.originalname}_${dateNumber}`.toLowerCase();

    const fileHandle = await filestackClient.upload(
      file.buffer,
      {
        tags: {
          search_query: file.originalname,
        },
      },
      {
        location: this.uploadLocation,
        filename: uniqueFilename,
        container: this.uploadContainer,
        access: this.uploadAccess,
      },
    );

    return fileHandle;
  }
}
