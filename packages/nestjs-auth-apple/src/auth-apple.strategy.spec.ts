import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FederatedCredentialsInterface,
  FederatedOAuthService,
} from '@concepta/nestjs-federated';

import {
  AUTH_APPLE_MODULE_SETTINGS_TOKEN,
  AUTH_APPLE_SERVICE_TOKEN,
} from './auth-apple.constants';
import { AuthAppleStrategy } from './auth-apple.strategy';
import { AuthAppleMissingEmailException } from './exceptions/auth-apple-missing-email.exception';
import { AuthAppleMissingIdException } from './exceptions/auth-apple-missing-id.exception';
import { AuthAppleCredentialsInterface } from './interfaces/auth-apple-credentials.interface';
import { AuthAppleProfileInterface } from './interfaces/auth-apple-profile.interface';
import { AuthAppleServiceInterface } from './interfaces/auth-apple-service.interface';
import { AuthAppleSettingsInterface } from './interfaces/auth-apple-settings.interface';
import { mapProfile } from './utils/auth-apple-map-profile';

// Mock the PassportStrategy class
jest.mock('@nestjs/passport', () => {
  return {
    PassportStrategy: jest.fn().mockImplementation(() => {
      return class MockStrategy {
        protected options: Record<string, unknown>;

        constructor(options: Record<string, unknown>) {
          // Just store options for testing
          this.options = options;
        }
      };
    }),
  };
});

// Mock passport-apple
jest.mock('passport-apple', () => ({
  Strategy: jest.fn().mockImplementation(function MockStrategy(
    this: unknown,
    options: Record<string, unknown>,
  ) {
    (this as Record<string, unknown>).options = options;
    return this;
  }),
}));

// Mock the mapProfile util
jest.mock('./utils/auth-apple-map-profile', () => ({
  mapProfile: jest.fn(),
}));

describe('AuthAppleStrategy', () => {
  let strategy: AuthAppleStrategy;
  let federatedOAuthService: jest.Mocked<FederatedOAuthService>;
  let authAppleService: jest.Mocked<AuthAppleServiceInterface>;

  const mockSettings: AuthAppleSettingsInterface = {
    clientID: 'test-client-id',
    teamID: 'test-team-id',
    keyID: 'test-key-id',
    privateKeyLocation: 'test-key-location',
    privateKeyString: 'test-key-string',
    callbackURL: 'http://localhost:3000/auth/apple/callback',
    scope: ['email', 'name'],
    mapProfile,
    passReqToCallback: false,
  };

  const mockIdToken = 'mock.id.token';
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';

  let mockProfile: AuthAppleProfileInterface;
  let mockUser: FederatedCredentialsInterface;
  let mockMappedProfile: AuthAppleCredentialsInterface;

  beforeEach(() => {
    mockProfile = {
      iss: 'https://appleid.apple.com',
      aud: 'test-client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000) - 60,
      sub: 'test-id',
      at_hash: 'test-hash',
      email: 'test@example.com',
      email_verified: true,
      is_private_email: false,
      auth_time: Math.floor(Date.now() / 1000) - 60,
      nonce_supported: true,
    };

    mockMappedProfile = {
      id: mockProfile.sub,
      email: mockProfile.email,
    };

    mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      username: 'testuser',
    };

    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthAppleStrategy,
        {
          provide: AUTH_APPLE_MODULE_SETTINGS_TOKEN,
          useValue: mockSettings,
        },
        {
          provide: FederatedOAuthService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: AUTH_APPLE_SERVICE_TOKEN,
          useValue: {
            verifyIdToken: jest.fn(),
            validateClaims: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<AuthAppleStrategy>(AuthAppleStrategy);
    federatedOAuthService = module.get(FederatedOAuthService);
    authAppleService = module.get(AUTH_APPLE_SERVICE_TOKEN);

    // Mock the mapProfile util implementation
    jest.spyOn({ mapProfile }, 'mapProfile').mockReturnValue(mockMappedProfile);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should successfully validate token and return user', async () => {
      // Setup with proper AuthAppleProfileInterface
      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());
      jest.spyOn(federatedOAuthService, 'sign').mockResolvedValue(mockUser);

      const result = await strategy.validate('token', 'refresh', 'idToken');
      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when federatedOAuthService.sign returns null', async () => {
      // Setup with proper AuthAppleProfileInterface
      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());
      jest
        .spyOn(federatedOAuthService, 'sign')
        .mockResolvedValue(null as unknown as FederatedCredentialsInterface);

      await expect(
        strategy.validate('token', 'refresh', 'idToken'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw AuthAppleMissingEmailException when mapped profile has no email', async () => {
      // Setup with proper AuthAppleProfileInterface
      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());

      const mockMappedProfileNoEmail: AuthAppleCredentialsInterface = {
        id: 'test-id',
        email: '',
      };
      jest
        .spyOn({ mapProfile }, 'mapProfile')
        .mockReturnValue(mockMappedProfileNoEmail);

      await expect(
        strategy.validate('token', 'refresh', 'idToken'),
      ).rejects.toThrow(AuthAppleMissingEmailException);
    });

    it('should throw AuthAppleMissingIdException when mapped profile has no id', async () => {
      // Setup with proper AuthAppleProfileInterface
      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());

      const mockMappedProfileNoId: AuthAppleCredentialsInterface = {
        id: '',
        email: 'test@example.com',
      };
      jest
        .spyOn({ mapProfile }, 'mapProfile')
        .mockReturnValue(mockMappedProfileNoId);

      await expect(
        strategy.validate('token', 'refresh', 'idToken'),
      ).rejects.toThrow(AuthAppleMissingIdException);
    });

    it('should not throw error for valid profile', async () => {
      // Setup with proper AuthAppleProfileInterface
      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());
      jest.spyOn(federatedOAuthService, 'sign').mockResolvedValue(mockUser);

      await expect(
        strategy.validate('token', 'refresh', 'idToken'),
      ).resolves.toBeDefined();
    });
  });

  // Tests for validateAppleProfile method
  describe('validateAppleProfile method', () => {
    it('should not throw for valid profile', async () => {
      // Setup mocks
      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(mockProfile);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());
      jest.spyOn(federatedOAuthService, 'sign').mockResolvedValue(mockUser);

      // This won't throw since the profile is valid
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockIdToken),
      ).resolves.not.toThrow();
    });

    it('should throw AuthAppleMissingIdException if id is missing', async () => {
      // Setup mocks with invalid profile (no id)
      const profileWithoutId = { ...mockProfile, sub: '' };
      const mappedProfileWithoutId: AuthAppleCredentialsInterface = {
        ...mockMappedProfile,
        id: '',
      };

      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(profileWithoutId);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());
      jest
        .spyOn({ mapProfile }, 'mapProfile')
        .mockReturnValue(mappedProfileWithoutId);

      // Will throw because of missing id
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockIdToken),
      ).rejects.toThrow(AuthAppleMissingIdException);
    });

    it('should throw AuthAppleMissingEmailException if email is missing', async () => {
      // Setup mocks with invalid profile (no email)
      const profileWithoutEmail = { ...mockProfile, email: '' };
      const mappedProfileWithoutEmail: AuthAppleCredentialsInterface = {
        ...mockMappedProfile,
        email: '',
      };

      jest
        .spyOn(authAppleService, 'verifyIdToken')
        .mockResolvedValue(profileWithoutEmail);
      jest
        .spyOn(authAppleService, 'validateClaims')
        .mockImplementation((_profile) => Promise.resolve());
      jest
        .spyOn({ mapProfile }, 'mapProfile')
        .mockReturnValue(mappedProfileWithoutEmail);

      // Will throw because of missing email
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockIdToken),
      ).rejects.toThrow(AuthAppleMissingEmailException);
    });
  });
});
