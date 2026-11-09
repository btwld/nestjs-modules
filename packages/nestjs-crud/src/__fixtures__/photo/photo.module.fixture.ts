import { DynamicModule, Module } from '@nestjs/common';

import { CrudModule } from '../../crud.module.js';

import { PhotoEntityInterfaceFixture } from './interfaces/photo-entity.interface.fixture.js';
import { PhotoControllerFixture } from './photo.controller.fixture.js';

@Module({})
export class PhotoModuleFixture {
  static register(): DynamicModule {
    return {
      module: PhotoModuleFixture,
      imports: [
        CrudModule.forRoot({}),
        CrudModule.forFeature<PhotoEntityInterfaceFixture>({
          crud: {
            controller: { class: PhotoControllerFixture },
          },
        }),
      ],
    };
  }
}
