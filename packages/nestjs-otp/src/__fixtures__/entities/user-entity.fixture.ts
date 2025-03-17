import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ReferenceIdInterface } from '@concepta/nestjs-common';
import { UserOtpEntityFixture } from './user-otp-entity.fixture';

/**
 * User Entity Fixture
 */
@Entity()
export class UserEntityFixture implements ReferenceIdInterface {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: false })
  isActive!: boolean;

  @OneToMany(() => UserOtpEntityFixture, (userOtp) => userOtp.assignee)
  userOtps!: UserOtpEntityFixture[];
}
