import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';

import { UserProfileUpdateDto } from '../../dto/profile/user-profile-update.dto';

import { UserProfileDtoFixture } from './user-profile.dto.fixture';

export class UserProfileUpdateDtoFixture extends IntersectionType(
  UserProfileUpdateDto,
  PartialType(PickType(UserProfileDtoFixture, ['firstName'] as const)),
) {}
