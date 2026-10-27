import { type OAuthParamsInterface } from '../../config/interfaces/oauth-params.interface.js';
import { processOAuthParams } from '../oauth-auth-params.util.js';

describe('processOAuthParams', () => {
  describe('when all parameters are provided', () => {
    it('should process all parameters correctly', () => {
      const query: OAuthParamsInterface = {
        provider: 'google',
        scopes: 'email,profile,openid',
        state: 'original-state-123',
        redirect_to: 'https://example.com/callback',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['email', 'profile', 'openid'],
        state: JSON.stringify({
          provider: 'google',
          originalState: 'original-state-123',
        }),
        callbackURL: 'https://example.com/callback',
      });
    });
  });

  describe('when only provider is provided', () => {
    it('should create state with provider info only', () => {
      const query: OAuthParamsInterface = {
        provider: 'github',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: JSON.stringify({
          provider: 'github',
        }),
      });
    });
  });

  describe('when only scopes are provided', () => {
    it('should process scopes correctly', () => {
      const query: OAuthParamsInterface = {
        scopes: 'read:user,user:email',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['read:user', 'user:email'],
      });
    });

    it('should handle scopes with whitespace', () => {
      const query: OAuthParamsInterface = {
        scopes: ' read:user , user:email , public_repo ',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['read:user', 'user:email', 'public_repo'],
      });
    });

    it('should handle single scope', () => {
      const query: OAuthParamsInterface = {
        scopes: 'email',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['email'],
      });
    });
  });

  describe('when only state is provided', () => {
    it('should use state as is', () => {
      const query: OAuthParamsInterface = {
        state: 'custom-state-value',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: 'custom-state-value',
      });
    });
  });

  describe('when only redirect_to is provided', () => {
    it('should set callbackURL', () => {
      const query: OAuthParamsInterface = {
        redirect_to: 'https://myapp.com/auth/callback',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        callbackURL: 'https://myapp.com/auth/callback',
      });
    });
  });

  describe('when provider and state are provided', () => {
    it('should combine provider and state in JSON', () => {
      const query: OAuthParamsInterface = {
        provider: 'facebook',
        state: 'session-456',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: JSON.stringify({
          provider: 'facebook',
          originalState: 'session-456',
        }),
      });
    });
  });

  describe('when provider and scopes are provided', () => {
    it('should process both provider and scopes', () => {
      const query: OAuthParamsInterface = {
        provider: 'linkedin',
        scopes: 'r_liteprofile,r_emailaddress',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['r_liteprofile', 'r_emailaddress'],
        state: JSON.stringify({
          provider: 'linkedin',
        }),
      });
    });
  });

  describe('when provider and redirect_to are provided', () => {
    it('should process both provider and redirect_to', () => {
      const query: OAuthParamsInterface = {
        provider: 'twitter',
        redirect_to: 'https://app.com/twitter-callback',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: JSON.stringify({
          provider: 'twitter',
        }),
        callbackURL: 'https://app.com/twitter-callback',
      });
    });
  });

  describe('when scopes and state are provided (no provider)', () => {
    it('should process scopes and use state as is', () => {
      const query: OAuthParamsInterface = {
        scopes: 'user:read,user:write',
        state: 'no-provider-state',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['user:read', 'user:write'],
        state: 'no-provider-state',
      });
    });
  });

  describe('when scopes and redirect_to are provided', () => {
    it('should process both scopes and redirect_to', () => {
      const query: OAuthParamsInterface = {
        scopes: 'read,write',
        redirect_to: 'https://example.com/oauth/callback',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: ['read', 'write'],
        callbackURL: 'https://example.com/oauth/callback',
      });
    });
  });

  describe('when state and redirect_to are provided', () => {
    it('should process both state and redirect_to', () => {
      const query: OAuthParamsInterface = {
        state: 'state-with-redirect',
        redirect_to: 'https://app.com/auth/complete',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: 'state-with-redirect',
        callbackURL: 'https://app.com/auth/complete',
      });
    });
  });

  describe('when no parameters are provided', () => {
    it('should return empty object', () => {
      const query: OAuthParamsInterface = {};

      const result = processOAuthParams(query);

      expect(result).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle empty scopes string', () => {
      const query: OAuthParamsInterface = {
        scopes: '',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: undefined,
      });
    });

    it('should handle scopes with only whitespace', () => {
      const query: OAuthParamsInterface = {
        scopes: '   ',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: undefined,
      });
    });

    it('should handle empty state string', () => {
      const query: OAuthParamsInterface = {
        provider: 'google',
        state: '',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: JSON.stringify({
          provider: 'google',
        }),
      });
    });

    it('should handle empty provider string', () => {
      const query: OAuthParamsInterface = {
        provider: '',
        state: 'some-state',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: 'some-state',
      });
    });

    it('should handle empty redirect_to string', () => {
      const query: OAuthParamsInterface = {
        redirect_to: '',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        callbackURL: undefined,
      });
    });

    it('should handle complex state with special characters', () => {
      const query: OAuthParamsInterface = {
        provider: 'custom-provider',
        state: 'state-with-special-chars:!@#$%^&*()',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        state: JSON.stringify({
          provider: 'custom-provider',
          originalState: 'state-with-special-chars:!@#$%^&*()',
        }),
      });
    });

    it('should handle scopes with special characters', () => {
      const query: OAuthParamsInterface = {
        scopes: 'scope:with:colons,scope-with-dashes,scope_with_underscores',
      };

      const result = processOAuthParams(query);

      expect(result).toEqual({
        scope: [
          'scope:with:colons',
          'scope-with-dashes',
          'scope_with_underscores',
        ],
      });
    });
  });

  describe('JSON state validation', () => {
    it('should produce valid JSON for state', () => {
      const query: OAuthParamsInterface = {
        provider: 'test-provider',
        state: 'test-state',
      };

      const result = processOAuthParams(query);
      expect(result.state).toBeDefined();
      const parsedState = JSON.parse(result.state ?? '');

      expect(parsedState).toEqual({
        provider: 'test-provider',
        originalState: 'test-state',
      });
    });

    it('should handle state without originalState when no state provided', () => {
      const query: OAuthParamsInterface = {
        provider: 'test-provider',
      };

      const result = processOAuthParams(query);
      expect(result.state).toBeDefined();
      const parsedState = JSON.parse(result.state ?? '');

      expect(parsedState).toEqual({
        provider: 'test-provider',
      });
      expect(parsedState).not.toHaveProperty('originalState');
    });
  });
});
