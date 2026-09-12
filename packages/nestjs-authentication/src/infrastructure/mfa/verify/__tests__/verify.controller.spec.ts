import { mock } from 'vitest-mock-extended';

import { type VerifyConfirmParamsInterface } from '../../../../application/services/verify/interfaces/verify-confirm-params.interface.js';
import { type VerifySendParamsInterface } from '../../../../application/services/verify/interfaces/verify-send-params.interface.js';
import { type VerifyService } from '../../../../application/services/verify/verify.service.js';

import { VerifyControllerFixture } from './fixtures/verify.controller.fixture.js';

describe(VerifyControllerFixture.name, () => {
  let controller: VerifyControllerFixture;
  let verifyService: VerifyService;
  const dto: VerifySendParamsInterface = {
    email: 'test@example.com',
  };
  const verifyUpdateDto: VerifyConfirmParamsInterface = {
    passcode: '123456',
  };
  beforeEach(() => {
    verifyService = mock<VerifyService>();
    controller = new VerifyControllerFixture(verifyService);
  });

  describe('send', () => {
    it('should call send method of VerifyService', async () => {
      void verifyService.send;
      const verifySendSpy = vi.spyOn(verifyService, 'send');

      await controller.send({}, dto);

      expect(verifySendSpy).toHaveBeenCalledWith({}, { email: dto.email });
    });
  });

  describe('confirm', () => {
    it('should call confirmUser method of VerifyService', async () => {
      void verifyService.confirmUser;
      const confirmUserSpy = vi
        .spyOn(verifyService, 'confirmUser')
        .mockResolvedValue(null);

      await controller.confirm({}, verifyUpdateDto);

      expect(confirmUserSpy).toHaveBeenCalledWith(
        {},
        {
          passcode: verifyUpdateDto.passcode,
        },
      );
    });

    it('should call confirmUser method of VerifyService', async () => {
      void verifyService.confirmUser;
      const confirmUserSpy = vi
        .spyOn(verifyService, 'confirmUser')
        .mockResolvedValue({
          id: '1',
        });

      await controller.confirm({}, verifyUpdateDto);

      expect(confirmUserSpy).toHaveBeenCalledWith(
        {},
        {
          passcode: verifyUpdateDto.passcode,
        },
      );
    });
  });
});
