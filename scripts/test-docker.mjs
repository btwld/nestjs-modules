// Runs the `*.docker-spec.ts` suites against the databases in
// docker/compose.test.yml: starts them, runs vitest, and always stops them.
// Extra arguments go to vitest, e.g. `pnpm test:docker packages/nestjs-repository-typeorm`.
//
// Set DOCKER_TEST_KEEP=1 to leave the containers running afterwards, then
// rerun vitest directly while iterating:
//   pnpm vitest run --config ./vitest.config-docker.ts
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const compose = [
  'compose',
  '-f',
  fileURLToPath(new URL('../docker/compose.test.yml', import.meta.url)),
];

// Ctrl-C reaches the whole process group. Vitest and compose still stop on
// it; this script stays alive long enough to tear the databases down.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {});
}

function run(command, args) {
  return spawnSync(command, args, { stdio: 'inherit', shell: false }).status ?? 1;
}

let status = 1;

try {
  if (run('docker', [...compose, 'up', '-d', '--wait']) !== 0) {
    console.error(
      'Could not start the test databases. Is Docker running, and is port ' +
        '55432 free?',
    );
  } else {
    status = run('pnpm', [
      'exec',
      'vitest',
      'run',
      '--config',
      './vitest.config-docker.ts',
      ...process.argv.slice(2),
    ]);
  }
} finally {
  if (!process.env.DOCKER_TEST_KEEP) {
    run('docker', [...compose, 'down', '-v']);
  }
}

process.exit(status);
