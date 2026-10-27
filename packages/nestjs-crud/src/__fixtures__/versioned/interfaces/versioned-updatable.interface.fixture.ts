import { type VersionedEntityInterfaceFixture } from './versioned-entity.interface.fixture.js';

export interface VersionedUpdatableInterfaceFixture extends Pick<
  VersionedEntityInterfaceFixture,
  'name'
> {}
