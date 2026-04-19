import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sqlClient = neon(process.env.NEON_DB_URL!);
export const db = drizzle(sqlClient, { schema });
