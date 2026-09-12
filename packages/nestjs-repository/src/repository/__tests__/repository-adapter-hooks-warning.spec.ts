// This spec lives in its own file (rather than repository-adapter.spec.ts)
// specifically to get a clean module registry: the warning it asserts on is
// deduplicated once per process via a module-scoped flag, and Vitest isolates
// module state per test file by default, so this file is guaranteed to
// observe the *first* construction without a HookResolverService.

import { TestRepositoryAdapter } from './fixtures/test-repository-adapter.fixture.js';

describe('RepositoryAdapter hook resolver warning', () => {
  it('should warn once (not once per instance) when constructed without a HookResolverService', () => {
    const emitWarningSpy = vi
      .spyOn(process, 'emitWarning')
      .mockImplementation(() => undefined);

    new TestRepositoryAdapter('first-entity');
    new TestRepositoryAdapter('second-entity');
    new TestRepositoryAdapter('third-entity');

    const hooksNotWiredCalls = emitWarningSpy.mock.calls.filter(
      (call) =>
        typeof call[1] === 'object' &&
        call[1] !== null &&
        'code' in call[1] &&
        call[1].code === 'ROCKETS_HOOKS_NOT_WIRED',
    );

    expect(hooksNotWiredCalls).toHaveLength(1);

    emitWarningSpy.mockRestore();
  });
});
