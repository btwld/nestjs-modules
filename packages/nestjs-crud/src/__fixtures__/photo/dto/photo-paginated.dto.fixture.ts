import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { CrudResponsePaginatedDto } from '../../../crud/dto/crud-response-paginated.dto';

import { PhotoDtoFixture } from './photo.dto.fixture';

@Exclude()
export class PhotoPaginatedDtoFixture extends CrudResponsePaginatedDto<PhotoDtoFixture> {
  @ApiProperty({ type: [PhotoDtoFixture], isArray: true })
  @Expose()
  @Type(() => PhotoDtoFixture)
  data: PhotoDtoFixture[] = [];
}
