import { DB as Database } from 'kysely-codegen';
import { Kysely } from 'kysely';

export type DB = Kysely<Database>;
