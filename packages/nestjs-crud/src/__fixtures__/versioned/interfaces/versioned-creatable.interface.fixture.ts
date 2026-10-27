import { type VersionedEntityInterfaceFixture } from './versioned-entity.interface.fixture.js';

export interface VersionedCreatableInterfaceFixture extends Pick<
  VersionedEntityInterfaceFixture,
  'name'
> {}
