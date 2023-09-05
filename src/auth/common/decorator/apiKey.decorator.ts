import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY = 'isApikEY';
export const Apikey = () => SetMetadata(IS_API_KEY, true);
