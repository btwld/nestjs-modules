import { Column, Entity } from 'typeorm';

import { CommonSqliteEntity } from '../../../entities/common/common-sqlite.entity.js';
import { TestInterfaceFixture } from '../interface/test-entity.interface.fixture.js';

@Entity()
export class TestEntityFixture
  extends CommonSqliteEntity
  implements TestInterfaceFixture
{
  @Column()
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;
}
