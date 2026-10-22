import {
  ACCESS_CONTROL_PORT_TOKEN,
  AccessControlContext,
  AccessControlCreateMany,
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlFilter,
  AccessControlGrant,
  AccessControlGuard,
  AccessControlModule,
  AccessControlPort,
  AccessControlQuery,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlRecoverOne,
  AccessControlReplaceOne,
  AccessControlService,
  AccessControlUpdateOne,
  CheckAccessHandler,
  CheckAccessQuery,
  DEFAULT_ACCESS_CONTROL_PORT_SETTINGS,
  FilterResponseAttributesHandler,
  FilterResponseAttributesQuery,
  PossessionEnum,
  ResolveUserRolesHandler,
  ResolveUserRolesQuery,
} from '../index.js';

describe('Index', () => {
  it('exports module and runtime classes', () => {
    expect(AccessControlModule).toEqual(expect.any(Function));
    expect(AccessControlGuard).toEqual(expect.any(Function));
    expect(AccessControlFilter).toEqual(expect.any(Function));
    expect(AccessControlContext).toEqual(expect.any(Function));
    expect(AccessControlService).toEqual(expect.any(Function));
  });

  it('exports the access-control port surface', () => {
    expect(AccessControlPort).toEqual(expect.any(Function));
    expect(typeof ACCESS_CONTROL_PORT_TOKEN).toEqual('symbol');
    expect(DEFAULT_ACCESS_CONTROL_PORT_SETTINGS).toEqual({
      checkAccessQuery: CheckAccessQuery,
      filterResponseAttributesQuery: FilterResponseAttributesQuery,
      resolveUserRolesQuery: ResolveUserRolesQuery,
    });
  });

  it('exports all CQRS queries and handlers', () => {
    expect(CheckAccessQuery).toEqual(expect.any(Function));
    expect(CheckAccessHandler).toEqual(expect.any(Function));
    expect(FilterResponseAttributesQuery).toEqual(expect.any(Function));
    expect(FilterResponseAttributesHandler).toEqual(expect.any(Function));
    expect(ResolveUserRolesQuery).toEqual(expect.any(Function));
    expect(ResolveUserRolesHandler).toEqual(expect.any(Function));
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
  });

  it('exports the possession enum', () => {
    expect(PossessionEnum).toEqual(expect.any(Object));
  });
});
