import { JwksClient } from 'jwks-rsa';

import { Test, type TestingModule } from '@nestjs/testing';

import { type JwtVerifyServiceInterface } from '@concepta/nestjs-jwt';

import {
  AUTH_APPLE_JWT_SERVICE_TOKEN,
  AUTH_APPLE_MODULE_SETTINGS_TOKEN,
  AUTH_APPLE_TOKEN_ISSUER,
  AUTH_APPLE_VERIFY_ALGORITHM,
} from './auth-apple.constants';
import { AuthAppleService } from './auth-apple.service';
import { AuthAppleDecodeException } from './exceptions/auth-apple-decode.exception';
import { AuthAppleEmailNotVerifiedException } from './exceptions/auth-apple-email-not-verified.exception';
import { AuthAppleInvalidAudienceException } from './exceptions/auth-apple-invalid-audience.exception';
import { AuthAppleInvalidIssuerException } from './exceptions/auth-apple-invalid-issuer.exception';
import { AuthApplePublicKeyException } from './exceptions/auth-apple-public-key.exception';
import { AuthAppleTokenExpiredException } from './exceptions/auth-apple-token-expired.exception';
import { type AuthAppleProfileInterface } from './interfaces/auth-apple-profile.interface';

// Mock jwks-rsa
jest.mock('jwks-rsa');

describe(AuthAppleService.name, () => {
  let service: AuthAppleService;
  let jwtService: JwtVerifyServiceInterface;
  const mockClientId = 'test-client-id';
  const mockToken = 'mock.jwt.token';
  const mockKeyId = 'test-key-id';
  const mockPublicKey =
    '-----BEGIN PUBLIC KEY-----\nMOCKKEY\n-----END PUBLIC KEY-----';
  const mockDecodedTokenWithHeader = {
    header: { kid: mockKeyId },
    payload: { sub: 'test-subject' },
  };
  const mockValidProfile: AuthAppleProfileInterface = {
    iss: AUTH_APPLE_TOKEN_ISSUER,
    aud: mockClientId,
    exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
    iat: Math.floor(Date.now() / 1000) - 60, // Issued 1 minute ago
    sub: 'test-subject',
    email: 'test@example.com',
    email_verified: true,
    at_hash: 'test-hash',
    is_private_email: false,
    auth_time: Math.floor(Date.now() / 1000) - 60,
    nonce_supported: true,
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthAppleService,
        {
          provide: AUTH_APPLE_MODULE_SETTINGS_TOKEN,
          useValue: {
            clientID: mockClientId,
          },
        },
        {
          provide: AUTH_APPLE_JWT_SERVICE_TOKEN,
          useValue: {
            decode: jest.fn(),
            verify: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthAppleService>(AuthAppleService);
    jwtService = module.get(AUTH_APPLE_JWT_SERVICE_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(AuthAppleService.prototype.verifyIdToken.name, () => {
    it('should verify and decode the token', async () => {
      // Setup JWT decode mock to return the token with header
      jest
        .spyOn(jwtService, 'decode')
        .mockImplementation(() => mockDecodedTokenWithHeader);

      // Mock fetchPublicKey
      const mockGetSigningKey = jest.fn().mockResolvedValue({
        getPublicKey: jest.fn().mockReturnValue(mockPublicKey),
      });
      (JwksClient as jest.Mock).mockImplementation(() => ({
        getSigningKey: mockGetSigningKey,
      }));

      // Mock verifyToken
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockValidProfile);

      // Call the method
      const result = await service.verifyIdToken(mockToken);

      // Assertions
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken, {
        complete: true,
      });
      expect(JwksClient).toHaveBeenCalled();
      expect(mockGetSigningKey).toHaveBeenCalledWith(mockKeyId);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        publicKey: mockPublicKey,
        algorithms: [AUTH_APPLE_VERIFY_ALGORITHM],
      });
      expect(result).toEqual(mockValidProfile);
    });

    it('should throw an error if token cannot be decoded', async () => {
      // Mock decode to throw an error
      jest.spyOn(jwtService, 'decode').mockImplementation(() => {
        throw new Error('Decode error');
      });

      // Call the method and expect error
      await expect(service.verifyIdToken(mockToken)).rejects.toThrow(
        AuthAppleDecodeException,
      );
    });

    it('should throw an error if public key cannot be fetched', async () => {
      // Mock extractKeyId
      jest
        .spyOn(jwtService, 'decode')
        .mockImplementation(() => mockDecodedTokenWithHeader);

      // Mock fetchPublicKey to throw an error
      (JwksClient as jest.Mock).mockImplementation(() => ({
        getSigningKey: jest
          .fn()
          .mockRejectedValue(new Error('Failed to get key')),
      }));

      // Call the method and expect error
      await expect(service.verifyIdToken(mockToken)).rejects.toThrow(
        AuthApplePublicKeyException,
      );
    });
  });

  describe(AuthAppleService.prototype.validateClaims.name, () => {
    it('should validate token claims successfully', async () => {
      // Call the method with valid claims
      expect(() => service.validateClaims(mockValidProfile)).not.toThrow();
    });

    it('should throw AuthAppleInvalidIssuerException for invalid issuer', async () => {
      // Create invalid profile with wrong issuer
      const invalidProfile: AuthAppleProfileInterface = {
        ...mockValidProfile,
        iss: 'invalid-issuer',
      };

      // Call method and expect error
      expect(() => service.validateClaims(invalidProfile)).toThrow(
        AuthAppleInvalidIssuerException,
      );
    });

    it('should throw AuthAppleInvalidAudienceException for invalid audience', async () => {
      // Create invalid profile with wrong audience
      const invalidProfile: AuthAppleProfileInterface = {
        ...mockValidProfile,
        aud: 'invalid-audience',
      };

      // Call method and expect error
      expect(() => service.validateClaims(invalidProfile)).toThrow(
        AuthAppleInvalidAudienceException,
      );
    });

    it('should throw AuthAppleTokenExpiredException for expired token', async () => {
      // Create invalid profile with expired token
      const invalidProfile: AuthAppleProfileInterface = {
        ...mockValidProfile,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      // Call method and expect error
      expect(() => service.validateClaims(invalidProfile)).toThrow(
        AuthAppleTokenExpiredException,
      );
    });

    it('should throw AuthAppleEmailNotVerifiedException for unverified email', async () => {
      // Create invalid profile with unverified email
      const invalidProfile: AuthAppleProfileInterface = {
        ...mockValidProfile,
        email_verified: false,
      };

      // Call method and expect error
      expect(() => service.validateClaims(invalidProfile)).toThrow(
        AuthAppleEmailNotVerifiedException,
      );
    });
  });

  // Private methods tests using any casting to access them
  describe(AuthAppleService.prototype['extractKeyId'].name, () => {
    it('should extract key ID from token header', () => {
      // Mock the JWT service decode method
      jest
        .spyOn(jwtService, 'decode')
        .mockImplementation(() => mockDecodedTokenWithHeader);

      // Call the private method using any casting
      const kid = service['extractKeyId'](mockToken);

      // Assertions
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken, {
        complete: true,
      });
      expect(kid).toBe(mockKeyId);
    });

    it('should throw AuthAppleDecodeException if token cannot be decoded', () => {
      // Mock decode to return null (invalid token)
      jest.spyOn(jwtService, 'decode').mockImplementation(() => null);

      // Call and expect error
      expect(() => service['extractKeyId'](mockToken)).toThrow(
        AuthAppleDecodeException,
      );

      // Or if decode throws an error
      jest.spyOn(jwtService, 'decode').mockImplementation(() => {
        throw new Error('Decode error');
      });

      expect(() => service['extractKeyId'](mockToken)).toThrow(
        AuthAppleDecodeException,
      );
    });
  });

  describe(AuthAppleService.prototype['fetchPublicKey'].name, () => {
    it('should fetch public key using key ID', async () => {
      // Mock JwksClient
      const mockGetSigningKey = jest.fn().mockResolvedValue({
        getPublicKey: jest.fn().mockReturnValue(mockPublicKey),
      });

      (JwksClient as jest.Mock).mockImplementation(() => ({
        getSigningKey: mockGetSigningKey,
      }));

      // Call the private method
      const publicKey = await service['fetchPublicKey'](mockKeyId);

      // Assertions
      expect(JwksClient).toHaveBeenCalled();
      expect(mockGetSigningKey).toHaveBeenCalledWith(mockKeyId);
      expect(publicKey).toBe(mockPublicKey);
    });

    it('should throw AuthApplePublicKeyException if key cannot be fetched', async () => {
      // Mock JwksClient to throw an error
      (JwksClient as jest.Mock).mockImplementation(() => ({
        getSigningKey: jest
          .fn()
          .mockRejectedValue(new Error('Failed to get key')),
      }));

      // Call and expect error
      await expect(service['fetchPublicKey'](mockKeyId)).rejects.toThrow(
        AuthApplePublicKeyException,
      );
    });
  });

  describe(AuthAppleService.prototype['verifyToken'].name, () => {
    it('should verify token with public key', async () => {
      // Mock verifyAsync to return decoded token
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockValidProfile);

      // Call the private method
      const result = await service['verifyToken'](mockToken, mockPublicKey);

      // Assertions
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        publicKey: mockPublicKey,
        algorithms: [AUTH_APPLE_VERIFY_ALGORITHM],
      });
      expect(result).toEqual(mockValidProfile);
    });

    it('should throw AuthAppleDecodeException if token verification fails', async () => {
      // Mock verifyAsync to throw an error
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Verification failed'));

      // Call and expect the service to throw the appropriate error
      await expect(
        service['verifyToken'](mockToken, mockPublicKey),
      ).rejects.toThrow();
    });
  });
});
