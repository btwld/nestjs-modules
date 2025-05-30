import { Test, TestingModule } from '@nestjs/testing';

import { PasswordStrengthEnum } from '../enum/password-strength.enum';
import { PASSWORD_MODULE_SETTINGS_TOKEN } from '../password.constants';

import { PasswordStrengthService } from './password-strength.service';

describe('PasswordStrengthService', () => {
  let service: PasswordStrengthService;
  const PASSWORD_NONE = 'password';
  const PASSWORD_WEAK = 'A12345678';
  const PASSWORD_MEDIUM = 'AS12378';
  const PASSWORD_STRONG = 'P@S645R78';
  const PASSWORD_VERY_STRONG = 'P@5_0d645s9';

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            maxPasswordAttempts: 5,
            minPasswordStrength: PasswordStrengthEnum.Medium,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);
    expect(service).toBeDefined();
  });

  it('PasswordStrengthService.isStrong-None', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            maxPasswordAttempts: 5,
            minPasswordStrength: PasswordStrengthEnum.None,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_NONE);

    expect(isStrong).toBe(true);
  });

  it('PasswordStrengthService.isStrong-Weak', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            maxPasswordAttempts: 5,
            minPasswordStrength: PasswordStrengthEnum.Weak,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_WEAK);

    expect(isStrong).toBe(true);
  });

  it('PasswordStrengthService.isStrong-Medium', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            minPasswordStrength: PasswordStrengthEnum.Medium,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_MEDIUM);

    expect(isStrong).toBe(true);
  });

  it('PasswordStrengthService.isStrong-Strong', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            minPasswordStrength: PasswordStrengthEnum.Strong,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_STRONG);

    expect(isStrong).toBe(true);
  });

  it('PasswordStrengthService.isStrong-VeryStrong', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            minPasswordStrength: PasswordStrengthEnum.Strong,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_VERY_STRONG);

    expect(isStrong).toBe(true);
  });

  it('PasswordStrengthService.isStrong-Strong_Medium', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {
            minPasswordStrength: PasswordStrengthEnum.Strong,
          },
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_MEDIUM);

    expect(isStrong).toBe(false);
  });

  it('PasswordStrengthService.isStrong-Strong_None', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PASSWORD_MODULE_SETTINGS_TOKEN,
          useValue: {},
        },
        PasswordStrengthService,
      ],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);

    const isStrong = service.isStrong(PASSWORD_NONE);

    expect(isStrong).toBe(true);
  });
});
