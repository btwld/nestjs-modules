import { DataSource, type DataSourceOptions } from 'typeorm';

/** The `pnpm test:docker:oracle` database. */
export const VPD_CONNECT_STRING =
  process.env.ORACLE_CONNECT_STRING ?? 'localhost:51521/FREEPDB1';

/** The schema that owns the tables, the context package and the policies. */
const OWNER = 'rockets';

/** The user the application connects as: owns nothing, isn't exempt from VPD. */
export const VPD_APP_USER = 'vpd_app';

/** The application context's procedure, as given to the adapter. */
export const VPD_CONTEXT_PROCEDURE = `${OWNER}.vpd_ctx_pkg.set_value`;

/**
 * A value whose clearing the context package refuses, so a test can make
 * the adapter's clear fail on a real connection.
 */
export const VPD_UNCLEARABLE = 'unclearable';

/** A name the context package refuses to set. */
export const VPD_REFUSED = 'refused';

/**
 * Connects as the owner and recreates its schema for `entities`, then, as
 * SYSTEM, makes sure the application user exists and installs the README's
 * application context: a context set only through its package.
 */
export async function createVpdOwner(
  entities: DataSourceOptions['entities'],
): Promise<DataSource> {
  const owner = await connect(OWNER, OWNER, {
    entities,
    synchronize: true,
    dropSchema: true,
  });

  const system = await connect('system', 'oracle');
  await system.query(`
    BEGIN
      EXECUTE IMMEDIATE 'CREATE USER ${VPD_APP_USER} IDENTIFIED BY ${VPD_APP_USER}';
    EXCEPTION WHEN OTHERS THEN
      IF SQLCODE != -1920 THEN RAISE; END IF;
    END;`);
  await system.query(`GRANT CREATE SESSION TO ${VPD_APP_USER}`);
  await system.query(`
    CREATE OR REPLACE PACKAGE ${OWNER}.vpd_ctx_pkg AS
      PROCEDURE set_value(p_name VARCHAR2, p_value VARCHAR2);
    END;`);
  // Test-only additions to the README's package: it refuses to set
  // VPD_REFUSED, and once a session sets VPD_UNCLEARABLE, clearing anything
  // fails.
  await system.query(`
    CREATE OR REPLACE PACKAGE BODY ${OWNER}.vpd_ctx_pkg AS
      PROCEDURE set_value(p_name VARCHAR2, p_value VARCHAR2) IS
      BEGIN
        IF p_name = '${VPD_REFUSED}' THEN
          RAISE_APPLICATION_ERROR(-20002, 'refusing to set');
        END IF;
        IF p_value IS NULL
          AND SYS_CONTEXT('vpd_ctx', '${VPD_UNCLEARABLE}') IS NOT NULL THEN
          RAISE_APPLICATION_ERROR(-20001, 'refusing to clear');
        END IF;
        DBMS_SESSION.SET_CONTEXT('vpd_ctx', p_name, p_value);
      END;
    END;`);
  await system.query(
    `CREATE OR REPLACE CONTEXT vpd_ctx USING ${OWNER}.vpd_ctx_pkg`,
  );
  await system.query(
    `GRANT EXECUTE ON ${OWNER}.vpd_ctx_pkg TO ${VPD_APP_USER}`,
  );
  await system.destroy();

  return owner;
}

/**
 * The README's policy recipe on one table: `tenantColumn` must equal the
 * context's `tenant_id`, an unset value matches nothing, and the
 * application user may read and write under it through a synonym.
 */
export async function applyVpdTenantPolicy(
  owner: DataSource,
  table: string,
  tenantColumn: string,
): Promise<void> {
  await owner.query(`
    CREATE OR REPLACE FUNCTION vpd_tenant_policy(
      p_schema VARCHAR2, p_object VARCHAR2
    ) RETURN VARCHAR2 IS
    BEGIN
      RETURN '"${tenantColumn}" = SYS_CONTEXT(''vpd_ctx'', ''tenant_id'')';
    END;`);

  const system = await connect('system', 'oracle');
  await system.query(`
    BEGIN
      DBMS_RLS.ADD_POLICY(
        object_schema   => '${OWNER.toUpperCase()}',
        object_name     => '"${table}"',
        policy_name     => 'tenant_isolation',
        function_schema => '${OWNER.toUpperCase()}',
        policy_function => 'vpd_tenant_policy',
        statement_types => 'SELECT,INSERT,UPDATE,DELETE',
        update_check    => TRUE
      );
    END;`);
  await system.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ${OWNER}."${table}" TO ${VPD_APP_USER}`,
  );
  await system.query(
    `CREATE OR REPLACE SYNONYM ${VPD_APP_USER}."${table}" FOR ${OWNER}."${table}"`,
  );
  await system.destroy();
}

function connect(
  username: string,
  password: string,
  options: Pick<
    DataSourceOptions,
    'entities' | 'synchronize' | 'dropSchema'
  > = {},
): Promise<DataSource> {
  return new DataSource({
    type: 'oracle',
    connectString: VPD_CONNECT_STRING,
    username,
    password,
    ...options,
  }).initialize();
}
