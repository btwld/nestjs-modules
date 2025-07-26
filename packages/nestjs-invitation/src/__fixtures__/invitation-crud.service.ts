import { Inject, Injectable } from '@nestjs/common';

import { InvitationEntityInterface } from '@concepta/nestjs-common';
import { CrudService } from '@concepta/nestjs-crud';
import { CrudAdapter } from '@concepta/nestjs-crud/dist/crud/adapters/crud.adapter';

import { InvitationTypeOrmCrudAdapter } from './invitation-typeorm-crud.adapter';

@Injectable()
export class InvitationCrudService extends CrudService<InvitationEntityInterface> {
  constructor(
    @Inject(InvitationTypeOrmCrudAdapter)
    crudAdapter: CrudAdapter<InvitationEntityInterface>,
  ) {
    super(crudAdapter);
  }
}
