import { SetMetadata } from '@nestjs/common';

export const IS_URL = 'isUrl';
export const IsUrl = () => SetMetadata(IS_URL, true);
