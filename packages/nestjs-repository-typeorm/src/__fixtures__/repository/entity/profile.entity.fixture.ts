import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { AuthorEntityFixture } from './author.entity.fixture.js';

/** A primary key that is also the join column of an owned one-to-one. */
@Entity()
export class ProfileEntityFixture {
  @PrimaryColumn()
  authorId!: string;

  @OneToOne(() => AuthorEntityFixture)
  @JoinColumn({ name: 'authorId' })
  author!: AuthorEntityFixture;

  @Column()
  bio!: string;
}
