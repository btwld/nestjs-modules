import { Test } from '@nestjs/testing';

import { CrudQueryOptionsInterface } from '../../crud/interfaces/crud-query-options.interface';
import { CrudRequestInterface } from '../../crud/interfaces/crud-request.interface';
import { CrudServiceQueryOptionsInterface } from '../../crud/interfaces/crud-service-query-options.interface';
import { SCondition } from '../../request/types/crud-request-query.types';

import { CrudQueryHelper } from './crud-query.helper';

describe('CrudQueryHelper', () => {
  let crudQueryService: CrudQueryHelper;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CrudQueryHelper],
    }).compile();

    crudQueryService = moduleRef.get<CrudQueryHelper>(CrudQueryHelper);
  });

  describe('IsDefined', () => {
    it('was CrudQueryService defined', async () => {
      expect(crudQueryService).toBeDefined();
    });
  });

  describe('modifyRequest', () => {
    describe('when adding search', () => {
      it('should add search', async () => {
        // the fake request
        const req = { parsed: {} } as CrudRequestInterface;

        req.parsed.search = {
          name: 'apple',
        };

        const options: CrudServiceQueryOptionsInterface = {
          filter: {
            name: 'pear',
          },
        };

        crudQueryService.modifyRequest(req, options);

        expect(req.parsed.search).toEqual<SCondition>({
          $and: [
            {
              name: 'apple',
            },
            {
              name: 'pear',
            },
          ],
        });
      });
    });

    describe('when adding options', () => {
      it('should add options', async () => {
        // the fake request
        const req = {
          options: { query: { alwaysPaginate: true } },
        } as CrudRequestInterface;

        const options: CrudServiceQueryOptionsInterface = {
          cache: false,
        };

        crudQueryService.modifyRequest(req, options);

        expect(req.options.query).toEqual<CrudQueryOptionsInterface>({
          alwaysPaginate: true,
          cache: false,
        });
      });
    });
  });
});
