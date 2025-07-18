import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { CrudCreateManyDto } from '../../../crud/dto/crud-create-many.dto';

import { PhotoCreateDtoFixture } from './photo-create.dto.fixture';
import { PhotoDtoFixture } from './photo.dto.fixture';

@Exclude()
export class PhotoCreateManyDtoFixture extends CrudCreateManyDto<PhotoCreateDtoFixture> {
  @Expose()
  @ApiProperty({ type: [PhotoDtoFixture], isArray: true })
  @Type(() => PhotoCreateDtoFixture)
  bulk: PhotoCreateDtoFixture[] = [];
}
