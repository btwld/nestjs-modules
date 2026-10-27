import { HookNotDecoratedException } from '../../exceptions/hook-not-decorated.exception.js';
import { HOOKS_METADATA_KEY } from '../../hook.constants.js';
import { Hook } from '../hook.decorator.js';
import { UseHooks } from '../use-hooks.decorator.js';

const TYPE_KEY = 'testHook';

@Hook({ type: TYPE_KEY })
class DecoratedHook {}

class SubclassedHook extends DecoratedHook {}

class UndecoratedHook {}

describe(UseHooks.name, () => {
  it('stores decorated hooks, including subclasses of one', () => {
    @UseHooks(DecoratedHook, { hook: SubclassedHook, type: TYPE_KEY })
    class Controller {}

    expect(Reflect.getMetadata(HOOKS_METADATA_KEY, Controller)).toEqual([
      DecoratedHook,
      { hook: SubclassedHook, type: TYPE_KEY },
    ]);
  });

  it.each([
    ['a bare class', UndecoratedHook],
    ['a class with its type', { hook: UndecoratedHook, type: TYPE_KEY }],
  ])('refuses %s missing @Hook()', (_label, option) => {
    expect(() => UseHooks(option)).toThrow(HookNotDecoratedException);
  });
});
