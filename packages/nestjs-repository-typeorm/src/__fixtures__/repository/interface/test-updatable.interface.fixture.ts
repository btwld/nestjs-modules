import { type TestInterfaceFixture } from './test-entity.interface.fixture.js';

export interface TestUpdatableInterfaceFixture
  extends
    Pick<TestInterfaceFixture, 'id'>,
    Partial<Pick<TestInterfaceFixture, 'firstName' | 'lastName'>> {}
