import { type PhotoEntityInterfaceFixture } from './photo-entity.interface.fixture.js';

export interface PhotoCreatableInterfaceFixture extends Pick<
  PhotoEntityInterfaceFixture,
  'name' | 'description' | 'filename' | 'isPublished'
> {}
