import { Exclude } from 'class-transformer';

import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';

import { InvitationCreatableInterface } from '../interfaces/domain/invitation-creatable.interface';

import { InvitationDto } from './invitation.dto';

@Exclude()
export class InvitationCreateDto
  extends IntersectionType(
    PickType(InvitationDto, ['category', 'userId', 'code'] as const),
    PartialType(PickType(InvitationDto, ['constraints'] as const)),
  )
  implements InvitationCreatableInterface {}
