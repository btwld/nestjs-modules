import { GuardsPolicy } from '../guards.policy.js';

describe(GuardsPolicy.name, () => {
  it('should default enable to true and disable to always-false fn', () => {
    const policy = new GuardsPolicy();

    expect(policy.enable).toBe(true);
    expect(policy.disable({} as never, {} as never)).toBe(false);
  });

  it('should apply provided enable flag', () => {
    const policy = new GuardsPolicy({ enable: false });

    expect(policy.enable).toBe(false);
  });

  it('should apply provided disable function', () => {
    const disableFn = vi.fn().mockReturnValue(true);
    const policy = new GuardsPolicy({ disable: disableFn });

    const result = policy.disable({} as never, {} as never);

    expect(result).toBe(true);
    expect(disableFn).toHaveBeenCalledTimes(1);
  });

  it('should create with empty settings object', () => {
    const policy = new GuardsPolicy({});

    expect(policy.enable).toBe(true);
    expect(policy.disable({} as never, {} as never)).toBe(false);
  });
});
