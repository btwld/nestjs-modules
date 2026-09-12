import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type TagEntityFixture } from '../entity/tag.entity.fixture.js';

export class TagFactoryFixture extends Factory<TagEntityFixture> {
  protected async entity(tag: TagEntityFixture): Promise<TagEntityFixture> {
    tag.label = faker.word.noun();
    return tag;
  }
}
