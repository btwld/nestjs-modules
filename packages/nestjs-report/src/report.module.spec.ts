import { type DynamicModule, type ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  ReportStatusEnum,
  getDynamicRepositoryToken,
  type ReportEntityInterface,
  type RepositoryInterface,
} from '@concepta/nestjs-common';
import { FileModule } from '@concepta/nestjs-file';
import {
  TypeOrmExtModule,
  TypeOrmRepositoryAdapter,
} from '@concepta/nestjs-typeorm-ext';

import { REPORT_MODULE_REPORT_ENTITY_KEY } from './report.constants';
import { ReportModule } from './report.module';
import { ReportService } from './services/report.service';
import { delay } from './utils/delay.util';

import { AwsStorageService } from './__fixtures__/aws-storage.service';
import {
  REPORT_KEY_FIXTURE,
  REPORT_NAME_FIXTURE,
  REPORT_SHORT_DELAY_KEY_FIXTURE,
} from './__fixtures__/constants.fixture';
import { FileEntityFixture } from './__fixtures__/file/file-entity.fixture';
import { MyReportGeneratorShortDelayService } from './__fixtures__/my-report-generator-short-delay.service';
import { MyReportGeneratorService } from './__fixtures__/my-report-generator.service';
import { ReportEntityFixture } from './__fixtures__/report/report-entity.fixture';
import { ReportGeneratorModuleFixture } from './__fixtures__/report-generator.module.fixture';
import { UserEntityFixture } from './__fixtures__/user/entities/user.entity.fixture';

describe(ReportModule, () => {
  let testModule: TestingModule;
  let reportModule: ReportModule;
  let reportService: ReportService;
  let reportDynamicRepo: RepositoryInterface<ReportEntityInterface>;

  describe(ReportModule.forRootAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          ReportModule.forRootAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                report: {
                  entity: ReportEntityFixture,
                },
              }),
            ],
            inject: [
              MyReportGeneratorService,
              MyReportGeneratorShortDelayService,
            ],
            useFactory: (
              myGeneratorService: MyReportGeneratorService,
              myGeneratorWithDelay: MyReportGeneratorService,
            ) => ({
              reportGeneratorServices: [
                myGeneratorService,
                myGeneratorWithDelay,
              ],
            }),
          }),
        ]),
      ).compile();
      commonVars();
    });

    afterAll(async () => {
      await delay(1000);
      testModule.close();
    });

    it('module should be loaded', async () => {
      commonTests();
    });

    /**
     * generate report with success
     */
    const generateReport = async () => {
      const result = await reportService.generate({
        name: REPORT_NAME_FIXTURE,
        serviceKey: REPORT_KEY_FIXTURE,
        // TODO: check if proceesing should be defined here or automatically
        status: ReportStatusEnum.Processing,
      });
      return result;
    };

    /**
     * generate report that will throw timeout exception
     */
    const generateReportWithTimeout = async () => {
      const result = await reportService.generate({
        name: REPORT_NAME_FIXTURE,
        serviceKey: REPORT_SHORT_DELAY_KEY_FIXTURE,
        status: ReportStatusEnum.Processing,
      });
      return result;
    };

    const fetchReport = async (id: string) => {
      const report = await reportService.fetch({
        id: id,
      });
      return report;
    };

    it('generate with success ', async () => {
      const result = await generateReport();
      expect(result.serviceKey).toBe(REPORT_KEY_FIXTURE);
      expect(result.name).toBe(REPORT_NAME_FIXTURE);

      // add a delay to ensure generator will complete
      await delay(2000);
      const report = await fetchReport(result.id);

      expect(report.id).toBe(result.id);
      expect(report.status).toBe(ReportStatusEnum.Complete);
    });

    it('generate with processing ', async () => {
      const result = await generateReport();
      expect(result.serviceKey).toBe(REPORT_KEY_FIXTURE);
      expect(result.name).toBe(REPORT_NAME_FIXTURE);

      // since there is no delay status will still be processing
      const report = await fetchReport(result.id);
      expect(report.id).toBe(result.id);
      expect(report.status).toBe(ReportStatusEnum.Processing);
    });
    it('generator with timeout', async () => {
      const result = await generateReportWithTimeout();
      expect(result.serviceKey).toBe(REPORT_SHORT_DELAY_KEY_FIXTURE);
      expect(result.name).toBe(REPORT_NAME_FIXTURE);

      // add a delay to get wait for timeout error
      await delay(200);

      const report = await fetchReport(result.id);
      expect(report.id).toBe(result.id);
      expect(report.status).toBe(ReportStatusEnum.Error);
    });
  });

  describe(ReportModule.registerAsync, () => {
    beforeEach(async () => {
      testModule = await Test.createTestingModule(
        testModuleFactory([
          ReportModule.registerAsync({
            imports: [
              TypeOrmExtModule.forFeature({
                report: {
                  entity: ReportEntityFixture,
                },
              }),
            ],
            inject: [MyReportGeneratorService],
            useFactory: (awsStorageService: MyReportGeneratorService) => ({
              reportGeneratorServices: [awsStorageService],
            }),
          }),
        ]),
      ).compile();
    });
    it('module should be loaded', async () => {
      commonVars();
      commonTests();
    });
  });

  const commonVars = () => {
    reportModule = testModule.get(ReportModule);
    reportService = testModule.get(ReportService);
    reportDynamicRepo = testModule.get(
      getDynamicRepositoryToken(REPORT_MODULE_REPORT_ENTITY_KEY),
    );
  };

  const commonTests = async () => {
    expect(reportModule).toBeInstanceOf(ReportModule);
    expect(reportService).toBeInstanceOf(ReportService);
    expect(reportDynamicRepo).toBeInstanceOf(TypeOrmRepositoryAdapter);

    const result = await reportService.generate({
      name: REPORT_NAME_FIXTURE,
      serviceKey: REPORT_KEY_FIXTURE,
      status: ReportStatusEnum.Processing,
    });
    expect(result.serviceKey).toBe(REPORT_KEY_FIXTURE);
    expect(result.name).toBe(REPORT_NAME_FIXTURE);

    const report = await reportService.fetch({
      id: result.id,
    });
    expect(report.id).toBe(report.id);
    expect(report.status).toBe(ReportStatusEnum.Processing);
  };
});

function testModuleFactory(
  extraImports: DynamicModule['imports'] = [],
): ModuleMetadata {
  return {
    imports: [
      TypeOrmExtModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        synchronize: true,
        entities: [UserEntityFixture, FileEntityFixture, ReportEntityFixture],
      }),
      TypeOrmExtModule.forFeature({
        file: {
          entity: FileEntityFixture,
        },
      }),
      FileModule.forRoot({
        storageServices: [new AwsStorageService()],
      }),
      ReportGeneratorModuleFixture,
      ...extraImports,
    ],
  };
}
