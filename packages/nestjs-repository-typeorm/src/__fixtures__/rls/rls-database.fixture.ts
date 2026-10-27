import { DataSource, type DataSourceOptions } from 'typeorm';

/**
 * Connection to the `pnpm test:docker` Postgres as its superuser, which
 * creates the schema, the policies and the seed rows.
 */
export const RLS_ADMIN_URL =
  process.env.POSTGRES_URL ??
  'postgres://postgres:postgres@localhost:55432/rockets_test';

/** The role the application connects as: owns nothing, can't bypass RLS. */
export const RLS_APP_ROLE = 'rls_app';

/** {@link RLS_ADMIN_URL} with {@link RLS_APP_ROLE}'s credentials. */
export function rlsAppUrl(): string {
  const url = new URL(RLS_ADMIN_URL);
  url.username = RLS_APP_ROLE;
  url.password = RLS_APP_ROLE;
  return url.toString();
}

/**
 * Connects as the superuser, recreates the schema for `entities`, and makes
 * sure the application role exists.
 */
export async function createRlsAdmin(
  entities: DataSourceOptions['entities'],
): Promise<DataSource> {
  const admin = await new DataSource({
    type: 'postgres',
    url: RLS_ADMIN_URL,
    entities,
    synchronize: true,
    dropSchema: true,
  }).initialize();

  await admin.query(`
    do $$ begin
      if not exists (select from pg_roles where rolname = '${RLS_APP_ROLE}') then
        create role ${RLS_APP_ROLE} login password '${RLS_APP_ROLE}'
          nosuperuser nobypassrls;
      end if;
    end $$;
  `);

  return admin;
}

/**
 * The README's policy recipe on one table: `tenantColumn` must equal the
 * `app.tenant_id` setting, an unset or empty setting matches nothing, and
 * the application role may read and write under it.
 */
export async function applyTenantPolicy(
  admin: DataSource,
  table: string,
  tenantColumn: string,
): Promise<void> {
  const tenant = `nullif(current_setting('app.tenant_id', true), '')::uuid`;

  await admin.query(`
    alter table ${table} enable row level security;
    alter table ${table} force row level security;
    create policy tenant_isolation on ${table}
      for all
      using ("${tenantColumn}" = ${tenant})
      with check ("${tenantColumn}" = ${tenant});
    grant select, insert, update, delete on ${table} to ${RLS_APP_ROLE};
  `);
}
