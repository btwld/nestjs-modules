import { type PhotoEntityInterfaceFixture } from './photo-entity.interface.fixture.js';

export interface PhotoUpdatableInterfaceFixture extends Pick<
  PhotoEntityInterfaceFixture,
  'name' | 'description' | 'filename' | 'isPublished' | 'views'
> {}
