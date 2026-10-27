import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { PhotoFixture } from './photo.entity.fixture.js';

export class PhotoFactoryFixture extends Factory<PhotoFixture> {
  protected options = { entity: PhotoFixture };

  protected async entity(photo: PhotoFixture): Promise<PhotoFixture> {
    photo.id = faker.string.uuid();
    photo.filename = faker.word.noun() + '.jpg';
    photo.name = faker.word.noun();
    photo.description = faker.word.words();
    photo.isPublished = faker.datatype.boolean();
    photo.views = 0;

    return photo;
  }
}
