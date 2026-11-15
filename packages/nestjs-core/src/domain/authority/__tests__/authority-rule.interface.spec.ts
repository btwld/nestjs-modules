import { type ActionEnum } from '../../enums/action.enum.js';
import { type AuthorityRuleInterface } from '../interfaces/authority-rule.interface.js';

// These cases are checked by the compiler: the package's build type-checks
// its specs, so a `@ts-expect-error` that no longer errors fails the build.
describe('AuthorityRuleInterface', () => {
  it('should accept the six actions by default', () => {
    const rules: AuthorityRuleInterface[] = [
      { action: 'read', subject: 'invoice' },
      {
        action: ['create', 'update', 'delete', 'softDelete', 'restore'],
        subject: 'invoice',
      },
    ];

    expect(rules).toHaveLength(2);
  });

  it('should fail to compile a mistyped verb by default', () => {
    const rule: AuthorityRuleInterface = {
      // @ts-expect-error a mistyped verb is none of the six actions
      action: 'raed',
      subject: 'invoice',
    };

    expect(rule.subject).toEqual('invoice');
  });

  it('should accept verbs of your own once widened', () => {
    const rule: AuthorityRuleInterface<`${ActionEnum}` | 'approve'> = {
      action: ['approve', 'read'],
      subject: 'invoice',
    };

    expect(rule.action).toEqual(['approve', 'read']);
  });

  it('should fail to compile a verb left out once narrowed', () => {
    const rule: AuthorityRuleInterface<'read' | 'update'> = {
      // @ts-expect-error `delete` is not among the verbs allowed
      action: 'delete',
      subject: 'invoice',
    };

    expect(rule.subject).toEqual('invoice');
  });
});
