import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY = 'isPublic';
export const IsApiKey = () => SetMetadata(IS_API_KEY, true);
