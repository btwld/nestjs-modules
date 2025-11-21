import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FederatedOAuthService,
  FederatedCredentialsInterface,
} from '@concepta/nestjs-federated';

import {
  AUTH_GOOGLE_MODULE_SETTINGS_TOKEN,
  AUTH_GOOGLE_STRATEGY_NAME,
} from './auth-google.constants';
import { AuthGoogleStrategy } from './auth-google.strategy';
import { AuthGoogleMissingEmailException } from './exceptions/auth-google-missing-email.exception';
import { AuthGoogleMissingIdException } from './exceptions/auth-google-missing-id.exception';
import { AuthGoogleProfileInterface } from './interfaces/auth-google-profile.interface';
import { AuthGoogleSettingsInterface } from './interfaces/auth-google-settings.interface';
import { mapProfile } from './utils/auth-google-map-profile';

// Mock the PassportStrategy class
jest.mock('@nestjs/passport', () => {
  return {
    PassportStrategy: jest.fn().mockImplementation(() => {
      return class MockStrategy {
        protected options: Record<string, unknown>;

        constructor(options: Record<string, unknown>) {
          this.options = options;
        }
      };
    }),
  };
});

// Mock passport-google-oauth20
jest.mock('passport-google-oauth20', () => ({
  Strategy: jest.fn().mockImplementation(function MockStrategy(
    this: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.options = options;
    return this;
  }),
}));

// Mock the mapProfile util
jest.mock('./utils/auth-google-map-profile', () => ({
  mapProfile: jest.fn(),
}));

describe('AuthGoogleStrategy', () => {
  let strategy: AuthGoogleStrategy;
  let federatedOAuthService: jest.Mocked<FederatedOAuthService>;

  const mockSettings: AuthGoogleSettingsInterface = {
    clientID: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackURL: 'http://localhost:3000/auth/google/callback',
    scope: ['email', 'profile'],
    mapProfile,
  };

  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockProfile: AuthGoogleProfileInterface = {
    id: 'test-id',
    displayName: 'Test User',
    name: {
      familyName: 'User',
      givenName: 'Test',
    },
    emails: [{ value: 'test@example.com' }],
    _raw: '{}',
    _json: {},
  };

  const mockMappedProfile = {
    id: mockProfile.id,
    email: mockProfile.emails?.[0]?.value ?? '',
  };

  const mockUser: FederatedCredentialsInterface = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGoogleStrategy,
        {
          provide: AUTH_GOOGLE_MODULE_SETTINGS_TOKEN,
          useValue: mockSettings,
        },
        {
          provide: FederatedOAuthService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<AuthGoogleStrategy>(AuthGoogleStrategy);
    federatedOAuthService = module.get(FederatedOAuthService);

    // Mock the mapProfile util implementation
    (mapProfile as jest.Mock).mockReturnValue(mockMappedProfile);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should set the correct options', () => {
      const strategyInstance = new AuthGoogleStrategy(
        mockSettings,
        federatedOAuthService,
      );
      expect(strategyInstance).toBeDefined();
      const options = (
        strategyInstance as unknown as { options: Record<string, unknown> }
      ).options;
      expect(options).toEqual({
        clientID: mockSettings.clientID,
        clientSecret: mockSettings.clientSecret,
        callbackURL: mockSettings.callbackURL,
        scope: mockSettings.scope,
      });
    });
  });

  describe('validate', () => {
    it('should successfully validate profile and return user', async () => {
      // Arrange
      federatedOAuthService.sign.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        mockProfile,
      );

      // Assert
      expect(result).toBe(mockUser);
      expect(federatedOAuthService.sign).toHaveBeenCalledWith(
        AUTH_GOOGLE_STRATEGY_NAME,
        mockMappedProfile.email,
        mockMappedProfile.id,
      );
    });

    it('should throw UnauthorizedException when federatedOAuthService.sign returns null', async () => {
      // Arrange
      federatedOAuthService.sign.mockResolvedValue(
        null as unknown as FederatedCredentialsInterface,
      );

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw AuthGoogleMissingIdException when mapped profile has no id', async () => {
      // Arrange
      const mockMappedProfileWithoutId = {
        ...mockMappedProfile,
        id: undefined,
      };
      (mapProfile as jest.Mock).mockReturnValue(mockMappedProfileWithoutId);

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow(AuthGoogleMissingIdException);
    });

    it('should throw AuthGoogleMissingEmailException when mapped profile has no email', async () => {
      // Arrange
      const mockMappedProfileWithoutEmail = {
        ...mockMappedProfile,
        email: undefined,
      };
      (mapProfile as jest.Mock).mockReturnValue(mockMappedProfileWithoutEmail);

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow(AuthGoogleMissingEmailException);
    });

    it('should use custom mapProfile when provided', async () => {
      // Arrange
      const customMapProfile = jest.fn().mockReturnValue(mockMappedProfile);
      const customSettings = { ...mockSettings, mapProfile: customMapProfile };
      const customStrategy = new AuthGoogleStrategy(
        customSettings,
        federatedOAuthService,
      );
      federatedOAuthService.sign.mockResolvedValue(mockUser);

      // Act
      const result = await customStrategy.validate(
        mockAccessToken,
        mockRefreshToken,
        mockProfile,
      );

      // Assert
      expect(result).toBe(mockUser);
      expect(customMapProfile).toHaveBeenCalledWith(mockProfile);
      expect(mapProfile).not.toHaveBeenCalled();
    });
  });
});
