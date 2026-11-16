import { DataSource, type DataSourceOptions } from 'typeorm';

import { TYPEORM_SQLSERVER_TRANSACTION_ID_KEY } from '../../sqlserver/typeorm-sqlserver.constants.js';

/**
 * The `pnpm test:docker:sqlserver` database. Row-level security applies to
 * every user, `sa` included, so the tests connect as `sa`.
 */
export const SESSION_CONTEXT_DATABASE: Extract<
  DataSourceOptions,
  { type: 'mssql' }
> = {
  type: 'mssql',
  host: process.env.SQLSERVER_HOST ?? 'localhost',
  port: Number(process.env.SQLSERVER_PORT ?? 51433),
  username: 'sa',
  password: 'Rockets-Test-1',
  database: 'rockets_test',
  options: { trustServerCertificate: true, useUTC: true },
};

const DROP_POLICY = [
  `IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'tenant_isolation')
     DROP SECURITY POLICY rls.tenant_isolation`,
  `IF OBJECT_ID('rls.tenant_predicate') IS NOT NULL
     DROP FUNCTION rls.tenant_predicate`,
];

/**
 * Drops any policy a previous run left, which would block dropping its
 * table, then recreates the schema for `entities`.
 */
export async function createSessionContextOwner(
  entities: DataSourceOptions['entities'],
): Promise<DataSource> {
  const cleanup = await new DataSource(SESSION_CONTEXT_DATABASE).initialize();
  try {
    for (const statement of DROP_POLICY) {
      await cleanup.query(statement);
    }
  } finally {
    await cleanup.destroy();
  }

  return new DataSource({
    ...SESSION_CONTEXT_DATABASE,
    entities,
    synchronize: true,
    dropSchema: true,
  }).initialize();
}

/**
 * Installs the README's row-level security recipe on `table`: rows whose
 * `column` holds the caller's `tenant_id`, set by the transaction now
 * running.
 */
export async function applySessionContextTenantPolicy(
  owner: DataSource,
  table: string,
  column: string,
): Promise<void> {
  await owner.query(`IF SCHEMA_ID('rls') IS NULL EXEC('CREATE SCHEMA rls')`);
  await owner.query(`
    CREATE FUNCTION rls.tenant_predicate(@tenant_id nvarchar(36))
    RETURNS TABLE WITH SCHEMABINDING AS RETURN
      SELECT 1 AS allowed
      WHERE @tenant_id = CAST(SESSION_CONTEXT(N'tenant_id') AS nvarchar(36))
        AND CAST(SESSION_CONTEXT(N'${TYPEORM_SQLSERVER_TRANSACTION_ID_KEY}') AS bigint)
          = CURRENT_TRANSACTION_ID()`);
  await owner.query(`
    CREATE SECURITY POLICY rls.tenant_isolation
      ADD FILTER PREDICATE rls.tenant_predicate(${column}) ON dbo.${table},
      ADD BLOCK PREDICATE rls.tenant_predicate(${column}) ON dbo.${table} AFTER INSERT,
      ADD BLOCK PREDICATE rls.tenant_predicate(${column}) ON dbo.${table} AFTER UPDATE
      WITH (STATE = ON)`);
}

/** Drops the policy, so other suites can drop the table. */
export async function dropSessionContextTenantPolicy(
  owner: DataSource,
): Promise<void> {
  for (const statement of DROP_POLICY) {
    await owner.query(statement);
  }
}
