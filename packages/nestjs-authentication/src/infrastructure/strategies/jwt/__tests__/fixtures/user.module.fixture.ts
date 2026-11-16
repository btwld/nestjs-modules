import { Global, Module } from '@nestjs/common';

import { GuardsPolicy } from '../../../../../domain/policies/guards.policy.js';

import { UserControllerFixtures } from './user.controller.fixture.js';

@Global()
@Module({
  controllers: [UserControllerFixtures],
  providers: [{ provide: GuardsPolicy, useValue: new GuardsPolicy() }],
})
export class UserModuleFixture {}
