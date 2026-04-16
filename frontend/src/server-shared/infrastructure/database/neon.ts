import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.POSTGRES_URL;
    if (!url) {
      throw new Error("POSTGRES_URL environment variable is required.");
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function query<T>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
