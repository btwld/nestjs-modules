import { ApiTags } from '@nestjs/swagger';

import { CrudCreateMany } from '../../crud/decorators/actions/crud-create-many.decorator';
import { CrudCreateOne } from '../../crud/decorators/actions/crud-create-one.decorator';
import { CrudDeleteOne } from '../../crud/decorators/actions/crud-delete-one.decorator';
import { CrudReadAll } from '../../crud/decorators/actions/crud-read-all.decorator';
import { CrudReadOne } from '../../crud/decorators/actions/crud-read-one.decorator';
import { CrudRecoverOne } from '../../crud/decorators/actions/crud-recover-one.decorator';
import { CrudReplaceOne } from '../../crud/decorators/actions/crud-replace-one.decorator';
import { CrudUpdateOne } from '../../crud/decorators/actions/crud-update-one.decorator';
import { CrudController } from '../../crud/decorators/controller/crud-controller.decorator';
import { CrudBody } from '../../crud/decorators/params/crud-body.decorator';
import { CrudRequest } from '../../crud/decorators/params/crud-request.decorator';
import { CrudSoftDelete } from '../../crud/decorators/routes/crud-soft-delete.decorator';
import { CrudControllerInterface } from '../../crud/interfaces/crud-controller.interface';
import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';

import { PhotoCreateManyDtoFixture } from './dto/photo-create-many.dto.fixture';
import { PhotoCreateDtoFixture } from './dto/photo-create.dto.fixture';
import { PhotoPaginatedDtoFixture } from './dto/photo-paginated.dto.fixture';
import { PhotoUpdateDtoFixture } from './dto/photo-update.dto.fixture';
import { PhotoDtoFixture } from './dto/photo.dto.fixture';
import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture';
import { PhotoServiceFixture } from './photo.service.fixture';

/**
 * Photo controller.
 */
@CrudController({
  path: 'photo',
  model: {
    type: PhotoDtoFixture,
    paginatedType: PhotoPaginatedDtoFixture,
  },
})
@ApiTags('photo')
export class PhotoControllerFixture
  implements
    CrudControllerInterface<
      PhotoEntityInterfaceFixture,
      PhotoCreateDtoFixture,
      PhotoUpdateDtoFixture
    >
{
  /**
   * Constructor.
   *
   * @param photoService instance of the photo crud service
   */
  constructor(private photoService: PhotoServiceFixture) {}

  /**
   * Get many
   *
   * @param crudRequest the CRUD request object
   */
  @CrudReadAll()
  async getMany(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.photoService.getMany(crudRequest);
  }

  /**
   * Get one
   *
   * @param crudRequest the CRUD request object
   */
  @CrudReadOne()
  async getOne(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.photoService.getOne(crudRequest);
  }

  /**
   * Create many
   *
   * @param crudRequest the CRUD request object
   * @param photoCreateManyDto photo create many dto
   */
  @CrudCreateMany()
  async createMany(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
    @CrudBody() photoCreateManyDto: PhotoCreateManyDtoFixture,
  ) {
    return this.photoService.createMany(crudRequest, photoCreateManyDto);
  }

  /**
   * Create one
   *
   * @param crudRequest the CRUD request object
   * @param photoCreateDto photo create dto
   */
  @CrudCreateOne()
  async createOne(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
    @CrudBody() photoCreateDto: PhotoCreateDtoFixture,
  ) {
    return this.photoService.createOne(crudRequest, photoCreateDto);
  }

  /**
   * Update one
   *
   * @param crudRequest the CRUD request object
   * @param photoUpdateDto photo update dto
   */
  @CrudUpdateOne()
  async updateOne(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
    @CrudBody() photoUpdateDto: PhotoUpdateDtoFixture,
  ) {
    return this.photoService.updateOne(crudRequest, photoUpdateDto);
  }

  /**
   * Replace one
   *
   * @param crudRequest the CRUD request object
   */
  @CrudReplaceOne()
  async replaceOne(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
    @CrudBody() photoCreateDto: PhotoCreateDtoFixture,
  ) {
    return this.photoService.replaceOne(crudRequest, photoCreateDto);
  }

  /**
   * Delete one
   *
   * @param crudRequest the CRUD request object
   */
  @CrudDeleteOne()
  async deleteOne(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.photoService.deleteOne(crudRequest);
  }

  /**
   * Delete one (soft)
   *
   * @param crudRequest the CRUD request object
   */
  @CrudDeleteOne({ path: 'soft/:id' })
  @CrudSoftDelete(true)
  async deleteOneSoft(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.photoService.deleteOne(crudRequest);
  }

  /**
   * Recover one
   *
   * @param crudRequest the CRUD request object
   */
  @CrudRecoverOne()
  async recoverOne(
    @CrudRequest()
    crudRequest: CrudRequestInterface<PhotoEntityInterfaceFixture>,
  ) {
    return this.photoService.recoverOne(crudRequest);
  }
}
