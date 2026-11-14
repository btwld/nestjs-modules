import {
  ACCESS_CONTROL_MODULE_SETTINGS_TOKEN,
  ACCESS_REFUSALS,
  AccessControlContext,
  AccessControlCreateMany,
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlException,
  AccessControlFilter,
  AccessControlGrant,
  AccessControlGuard,
  AccessControlModule,
  accessGrantsProblems,
  createAccessAbility,
  AccessControlQuery,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlRecoverOne,
  AccessControlReplaceOne,
  AccessControlSoftDeleteOne,
  AccessControlService,
  AccessControlUpdateOne,
  ActorCtxResolver,
  AccessCtxDecisionSource,
  AccessRefusedException,
  AccessRulesInvalidException,
  accessFieldPaths,
  AccessContextOverlay,
  normalizeAccessFieldPath,
  StaticAccessGrantsProvider,
} from '../index.js';

describe('Index', () => {
  it('exports module and runtime classes', () => {
    expect(AccessControlModule).toEqual(expect.any(Function));
    expect(AccessControlGuard).toEqual(expect.any(Function));
    expect(AccessControlFilter).toEqual(expect.any(Function));
    expect(AccessControlContext).toEqual(expect.any(Function));
    expect(AccessControlService).toEqual(expect.any(Function));
    expect(accessGrantsProblems).toEqual(expect.any(Function));
    expect(createAccessAbility).toEqual(expect.any(Function));
    expect(ActorCtxResolver).toEqual(expect.any(Function));
    expect(AccessCtxDecisionSource).toEqual(expect.any(Function));
    expect(StaticAccessGrantsProvider).toEqual(expect.any(Function));
    expect(typeof ACCESS_CONTROL_MODULE_SETTINGS_TOKEN).toEqual('string');
  });

  it('exports the field path helpers', () => {
    expect(accessFieldPaths).toEqual(expect.any(Function));
    expect(normalizeAccessFieldPath).toEqual(expect.any(Function));
  });

  it('exports the exceptions and refusals', () => {
    expect(AccessControlException).toEqual(expect.any(Function));
    expect(AccessRefusedException).toEqual(expect.any(Function));
    expect(AccessRulesInvalidException).toEqual(expect.any(Function));
    expect(ACCESS_REFUSALS).toEqual([
      'no-actor',
      'no-grant',
      'denied',
      'field',
      'access-query',
      'authority',
    ]);
  });

  it('exports the actor overlay interceptor', () => {
    expect(AccessContextOverlay).toEqual(expect.any(Function));
  });

  it('exports all grant decorators', () => {
    expect(AccessControlGrant).toEqual(expect.any(Function));
    expect(AccessControlQuery).toEqual(expect.any(Function));
    expect(AccessControlCreateMany).toEqual(expect.any(Function));
    expect(AccessControlCreateOne).toEqual(expect.any(Function));
    expect(AccessControlDeleteOne).toEqual(expect.any(Function));
    expect(AccessControlReadMany).toEqual(expect.any(Function));
    expect(AccessControlReadOne).toEqual(expect.any(Function));
    expect(AccessControlUpdateOne).toEqual(expect.any(Function));
    expect(AccessControlRecoverOne).toEqual(expect.any(Function));
    expect(AccessControlReplaceOne).toEqual(expect.any(Function));
    expect(AccessControlSoftDeleteOne).toEqual(expect.any(Function));
  });
});
