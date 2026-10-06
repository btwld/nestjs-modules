import { faker } from '@faker-js/faker';

import { Factory } from '@concepta/typeorm-seeding';

import { type PostEntityFixture } from '../entity/post.entity.fixture.js';

export class PostFactoryFixture extends Factory<PostEntityFixture> {
  protected async entity(post: PostEntityFixture): Promise<PostEntityFixture> {
    post.title = faker.lorem.sentence();
    return post;
  }
}
