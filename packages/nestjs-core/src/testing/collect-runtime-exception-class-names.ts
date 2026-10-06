import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Recursively finds every `*.exception.ts` file under `dir`, skipping
 * `dist` and `node_modules`.
 */
function findExceptionFiles(dir: string): string[] {
  const results: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;

    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findExceptionFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.exception.ts')) {
      results.push(full);
    }
  }

  return results;
}

/**
 * Anti-drift helper for `exception-fault.spec.ts` files: discovers every
 * class exported from a `*.exception.ts` file under `srcDir` that extends
 * `runtimeExceptionClass`, by dynamically importing each file and walking
 * its prototype chain — not by filename, so a file that happens to match
 * `*.exception.ts` but extends `Error` directly (e.g. `NotAnErrorException`)
 * is correctly excluded without special-casing.
 *
 * Uses `fs.readdirSync` + dynamic `import()` rather than a bundler glob
 * (e.g. Vite's `import.meta.glob`) so this compiles under the repo's plain
 * `tsc -b` type-check, which has no glob-import types configured.
 *
 * @param srcDir - absolute path to the package's `src` directory
 * @param runtimeExceptionClass - the `RuntimeException` base class (or a
 *   subclass) to test discovered exports against via `instanceof`
 * @returns the discovered classes' `.name` values
 */
export async function collectRuntimeExceptionClassNames(
  srcDir: string,
  runtimeExceptionClass: abstract new (...args: never[]) => unknown,
): Promise<string[]> {
  const files = findExceptionFiles(srcDir);
  const names: string[] = [];

  for (const file of files) {
    const jsSpecifier = pathToFileURL(file.replace(/\.ts$/, '.js')).href;
    const mod: Record<string, unknown> = await import(jsSpecifier);

    for (const exported of Object.values(mod)) {
      if (
        typeof exported === 'function' &&
        exported !== runtimeExceptionClass &&
        exported.prototype instanceof runtimeExceptionClass
      ) {
        names.push(exported.name);
      }
    }
  }

  return names;
}
