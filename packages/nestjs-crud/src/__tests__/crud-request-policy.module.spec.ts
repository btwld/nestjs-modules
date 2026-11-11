import { Inject, Injectable, Module, type DynamicModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CRUD_REQUEST_POLICY_TOKEN } from '../crud.constants.js';
import { CrudModule } from '../crud.module.js';
import { CrudAllowAllPolicy } from '../infrastructure/policies/crud-allow-all.policy.js';
import { type CrudRequestPolicyInterface } from '../infrastructure/policies/interfaces/crud-request-policy.interface.js';

/** Sees the policy as a resolver in the same module does. */
@Injectable()
class PolicyProbe {
  constructor(
    @Inject(CRUD_REQUEST_POLICY_TOKEN)
    readonly policy: CrudRequestPolicyInterface,
  ) {}
}

const policy = (): CrudRequestPolicyInterface => ({ check: () => undefined });

async function probedWith(imports: DynamicModule[]) {
  @Module({ imports, providers: [PolicyProbe] })
  class FeatureModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [FeatureModule],
  }).compile();
  return moduleRef.get(PolicyProbe).policy;
}

describe('CRUD request policy registration', () => {
  it('uses the root policy in a module registering CRUD without one', async () => {
    const root = policy();

    @Module({ imports: [CrudModule.register({})], providers: [PolicyProbe] })
    class FeatureModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({ requestPolicy: root }), FeatureModule],
    }).compile();

    expect(moduleRef.select(FeatureModule).get(PolicyProbe).policy).toBe(root);
  });

  it('uses the root policy given asynchronously', async () => {
    const root = policy();

    @Module({ imports: [CrudModule.register({})], providers: [PolicyProbe] })
    class FeatureModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        CrudModule.forRootAsync({
          useFactory: () => ({ requestPolicy: root }),
        }),
        FeatureModule,
      ],
    }).compile();

    expect(moduleRef.select(FeatureModule).get(PolicyProbe).policy).toBe(root);
  });

  it('uses a registered module’s own policy when it gives one', async () => {
    const own = policy();

    @Module({
      imports: [CrudModule.register({ requestPolicy: own })],
      providers: [PolicyProbe],
    })
    class FeatureModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [CrudModule.forRoot({ requestPolicy: policy() }), FeatureModule],
    }).compile();

    expect(moduleRef.select(FeatureModule).get(PolicyProbe).policy).toBe(own);
  });

  it('lets every request run without any policy', async () => {
    expect(await probedWith([CrudModule.register({})])).toBeInstanceOf(
      CrudAllowAllPolicy,
    );
  });
});
