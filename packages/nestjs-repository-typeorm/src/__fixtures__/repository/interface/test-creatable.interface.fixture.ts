import { type TestInterfaceFixture } from './test-entity.interface.fixture.js';

export interface TestCreatableInterfaceFixture extends Pick<
  TestInterfaceFixture,
  'firstName' | 'lastName'
> {}
