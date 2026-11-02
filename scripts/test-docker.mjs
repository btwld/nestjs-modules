// Runs the `*.docker-spec.ts` suites against one stack of test databases:
// starts it, runs vitest on the specs under those databases' folders
// (`src/<database>/`), and always stops it.
//
//   pnpm test:docker           the open-source databases (docker/compose.test.yml)
//   pnpm test:docker:oracle    Oracle (docker/compose.test-oracle.yml)
//   pnpm test:docker:sqlserver SQL Server (docker/compose.test-sqlserver.yml)
//
// Extra arguments go to vitest, e.g. `pnpm test:docker packages/nestjs-repository-typeorm`.
//
// Set DOCKER_TEST_KEEP=1 to leave the containers running afterwards, then
// rerun vitest directly while iterating:
//   pnpm vitest run --config ./vitest.config-docker.ts                                 open-source
//   DOCKER_TEST_DATABASES=oracle pnpm vitest run --config ./vitest.config-docker.ts    Oracle
//   DOCKER_TEST_DATABASES=sqlserver pnpm vitest run --config ./vitest.config-docker.ts SQL Server
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The open-source databases are also vitest.config-docker.ts's default.
const STACKS = {
  oss: {
    file: 'compose.test.yml',
    databases: ['postgres', 'mysql', 'mariadb'],
    ports: '55432 (Postgres), 53306 (MySQL) and 53307 (MariaDB)',
  },
  oracle: {
    file: 'compose.test-oracle.yml',
    databases: ['oracle'],
    ports: '51521 (Oracle)',
  },
  sqlserver: {
    file: 'compose.test-sqlserver.yml',
    databases: ['sqlserver'],
    ports: '51433 (SQL Server)',
  },
};

const [first, ...rest] = process.argv.slice(2);
const named = first !== undefined && Object.hasOwn(STACKS, first);
const stack = STACKS[named ? first : 'oss'];
const vitestArgs = named ? rest : process.argv.slice(2);

const compose = [
  'compose',
  '-f',
  fileURLToPath(new URL(`../docker/${stack.file}`, import.meta.url)),
];

// Ctrl-C reaches the whole process group. Vitest and compose still stop on
// it; this script stays alive long enough to tear the databases down.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {});
}

function run(command, args, env) {
  return (
    spawnSync(command, args, { stdio: 'inherit', shell: false, env }).status ??
    1
  );
}

let status = 1;

try {
  if (run('docker', [...compose, 'up', '-d', '--wait']) !== 0) {
    console.error(
      'Could not start the test databases. Is Docker running, and are ports ' +
        `${stack.ports} free?`,
    );
  } else {
    status = run(
      'pnpm',
      [
        'exec',
        'vitest',
        'run',
        '--config',
        './vitest.config-docker.ts',
        ...vitestArgs,
      ],
      { ...process.env, DOCKER_TEST_DATABASES: stack.databases.join(',') },
    );
  }
} finally {
  if (!process.env.DOCKER_TEST_KEEP) {
    run('docker', [...compose, 'down', '-v']);
  }
}

process.exit(status);
