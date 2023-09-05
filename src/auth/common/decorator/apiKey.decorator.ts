import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY = 'isApikEY';
export const IsApiKey = () => SetMetadata(IS_API_KEY, true);
