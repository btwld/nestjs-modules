import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  FederatedOAuthService,
  FederatedCredentialsInterface,
} from '@concepta/nestjs-federated';

import {
  AUTH_GITHUB_MODULE_SETTINGS_TOKEN,
  AUTH_GITHUB_STRATEGY_NAME,
} from './auth-github.constants';
import { AuthGithubStrategy } from './auth-github.strategy';
import { AuthGithubMissingEmailException } from './exceptions/auth-github-missing-email.exception';
import { AuthGithubMissingIdException } from './exceptions/auth-github-missing-id.exception';
import { AuthGithubProfileInterface } from './interfaces/auth-github-profile.interface';
import { AuthGithubSettingsInterface } from './interfaces/auth-github-settings.interface';
import { mapProfile } from './utils/auth-github-map-profile';

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

// Mock passport-github
jest.mock('passport-github', () => ({
  Strategy: jest.fn().mockImplementation(function MockStrategy(
    this: Record<string, unknown>,
    options: Record<string, unknown>,
  ) {
    this.options = options;
    return this;
  }),
}));

// Mock the mapProfile util
jest.mock('./utils/auth-github-map-profile', () => ({
  mapProfile: jest.fn(),
}));

describe('AuthGithubStrategy', () => {
  let strategy: AuthGithubStrategy;
  let federatedOAuthService: jest.Mocked<FederatedOAuthService>;

  const mockSettings: AuthGithubSettingsInterface = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackURL: 'http://localhost:3000/auth/github/callback',
    mapProfile,
  };

  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';
  const mockProfile: AuthGithubProfileInterface = {
    id: 'test-id',
    displayName: 'Test User',
    username: 'testuser',
    emails: [{ value: 'test@example.com' }],
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
        AuthGithubStrategy,
        {
          provide: AUTH_GITHUB_MODULE_SETTINGS_TOKEN,
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

    strategy = module.get<AuthGithubStrategy>(AuthGithubStrategy);
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
      const strategyInstance = new AuthGithubStrategy(
        mockSettings,
        federatedOAuthService,
      );
      expect(strategyInstance).toBeDefined();
      const options = (
        strategyInstance as unknown as { options: Record<string, unknown> }
      ).options;
      expect(options).toEqual({
        clientID: mockSettings.clientId,
        clientSecret: mockSettings.clientSecret,
        callbackURL: mockSettings.callbackURL,
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
        AUTH_GITHUB_STRATEGY_NAME,
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

    it('should throw AuthGithubMissingIdException when mapped profile has no id', async () => {
      // Arrange
      const mockMappedProfileWithoutId = {
        ...mockMappedProfile,
        id: undefined,
      };
      (mapProfile as jest.Mock).mockReturnValue(mockMappedProfileWithoutId);

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow(AuthGithubMissingIdException);
    });

    it('should throw AuthGithubMissingEmailException when mapped profile has no email', async () => {
      // Arrange
      const mockMappedProfileWithoutEmail = {
        ...mockMappedProfile,
        email: undefined,
      };
      (mapProfile as jest.Mock).mockReturnValue(mockMappedProfileWithoutEmail);

      // Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile),
      ).rejects.toThrow(AuthGithubMissingEmailException);
    });

    it('should use custom mapProfile when provided', async () => {
      // Arrange
      const customMapProfile = jest.fn().mockReturnValue(mockMappedProfile);
      const customSettings = { ...mockSettings, mapProfile: customMapProfile };
      const customStrategy = new AuthGithubStrategy(
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
