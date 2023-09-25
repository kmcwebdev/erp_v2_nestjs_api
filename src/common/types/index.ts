import { Kysely } from 'kysely';
import { DB as Database } from '../../../kysely-types';

export type DB = Kysely<Database>;
