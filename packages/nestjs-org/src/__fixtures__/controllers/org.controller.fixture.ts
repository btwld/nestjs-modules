import { ApiTags } from '@nestjs/swagger';

import {
  AccessControlCreateMany,
  AccessControlCreateOne,
  AccessControlDeleteOne,
  AccessControlReadMany,
  AccessControlReadOne,
  AccessControlRecoverOne,
  AccessControlUpdateOne,
} from '@concepta/nestjs-access-control';
import {
  OrgCreatableInterface,
  OrgUpdatableInterface,
  OrgEntityInterface,
} from '@concepta/nestjs-common';
import {
  CrudBody,
  CrudCreateOne,
  CrudDeleteOne,
  CrudReadOne,
  CrudRequest,
  CrudRequestInterface,
  CrudUpdateOne,
  CrudControllerInterface,
  CrudController,
  CrudCreateMany,
  CrudReadMany,
  CrudRecoverOne,
} from '@concepta/nestjs-crud';

import { OrgCreateManyDto } from '../../dto/org-create-many.dto';
import { OrgCreateDto } from '../../dto/org-create.dto';
import { OrgPaginatedDto } from '../../dto/org-paginated.dto';
import { OrgUpdateDto } from '../../dto/org-update.dto';
import { OrgDto } from '../../dto/org.dto';
import { OrgResource } from '../../org.types';
import { OrgCrudService } from '../org-crud.service';

/**
 * Org controller.
 */
@CrudController({
  path: 'org',
  model: {
    type: OrgDto,
    paginatedType: OrgPaginatedDto,
  },
})
@ApiTags('org')
export class OrgControllerFixture implements CrudControllerInterface<
  OrgEntityInterface,
  OrgCreatableInterface,
  OrgUpdatableInterface
> {
  /**
   * Constructor.
   *
   * @param orgCrudService - instance of the Org crud service
   */
  constructor(private orgCrudService: OrgCrudService) {}

  /**
   * Get many
   *
   * @param crudRequest - the CRUD request object
   */
  @CrudReadMany()
  @AccessControlReadMany(OrgResource.Many)
  async getMany(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.orgCrudService.getMany(crudRequest);
  }

  /**
   * Get one
   *
   * @param crudRequest - the CRUD request object
   */
  @CrudReadOne()
  @AccessControlReadOne(OrgResource.One)
  async getOne(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.orgCrudService.getOne(crudRequest);
  }

  /**
   * Create many
   *
   * @param crudRequest - the CRUD request object
   * @param orgCreateManyDto - org create many dto
   */
  @CrudCreateMany()
  @AccessControlCreateMany(OrgResource.Many)
  async createMany(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() orgCreateManyDto: OrgCreateManyDto,
  ) {
    // call crud service to create
    return this.orgCrudService.createMany(crudRequest, orgCreateManyDto);
  }

  /**
   * Create one
   *
   * @param crudRequest - the CRUD request object
   * @param orgCreateDto - org create dto
   */
  @CrudCreateOne()
  @AccessControlCreateOne(OrgResource.One)
  async createOne(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() orgCreateDto: OrgCreateDto,
  ) {
    // call crud service to create
    return this.orgCrudService.createOne(crudRequest, orgCreateDto);
  }

  /**
   * Update one
   *
   * @param crudRequest - the CRUD request object
   * @param orgUpdateDto - org update dto
   */
  @CrudUpdateOne()
  @AccessControlUpdateOne(OrgResource.One)
  async updateOne(
    @CrudRequest() crudRequest: CrudRequestInterface,
    @CrudBody() orgUpdateDto: OrgUpdateDto,
  ) {
    return this.orgCrudService.updateOne(crudRequest, orgUpdateDto);
  }

  /**
   * Delete one
   *
   * @param crudRequest - the CRUD request object
   */
  @CrudDeleteOne()
  @AccessControlDeleteOne(OrgResource.One)
  async deleteOne(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.orgCrudService.deleteOne(crudRequest);
  }

  /**
   * Recover one
   *
   * @param crudRequest - the CRUD request object
   */
  @CrudRecoverOne()
  @AccessControlRecoverOne(OrgResource.One)
  async recoverOne(@CrudRequest() crudRequest: CrudRequestInterface) {
    return this.orgCrudService.recoverOne(crudRequest);
  }
}
