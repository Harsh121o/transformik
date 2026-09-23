// utils/db.ts
import { neon } from "@neondatabase/serverless";

export type DbProvider = "neon" | "supabase";

export function getDbProvider(): DbProvider {
  const provider = (
    process.env.DB_PROVIDER ||
    process.env.NEXT_PUBLIC_DB_PROVIDER ||
    "supabase"
  ).toLowerCase().trim();

  if (provider === "neon") {
    return "neon";
  }
  return "supabase";
}

let neonSqlClient: any = null;

export function getNeonSql(): any {
  if (!neonSqlClient) {
    const databaseUrl =
      process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DB_PROVIDER is set to 'neon', but NEON_DATABASE_URL or DATABASE_URL environment variable is missing."
      );
    }
    neonSqlClient = neon(databaseUrl);
  }
  return neonSqlClient;
}

export function isNeonProvider(): boolean {
  return getDbProvider() === "neon";
}
