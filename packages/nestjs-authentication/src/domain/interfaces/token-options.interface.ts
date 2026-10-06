import { type JwtModuleOptions } from '@nestjs/jwt';

/**
 * Token configuration options.
 *
 * Excludes `secretOrPrivateKey` (superseded by `secret`/`publicKey`/
 * `privateKey` below) and `secretOrKeyProvider`: that option is a
 * module-level construct in `@nestjs/jwt` (`JwtService`'s per-call
 * `sign`/`verify` options don't accept it — see `JwtSignOptions`/
 * `JwtVerifyOptions`), but this package always registers `NestJwtModule`
 * with empty options and resolves the key per call via `JwtService`
 * (`infrastructure/jwt/jwt.service.ts`), so a `secretOrKeyProvider` set
 * here would type-check and then silently never run. For JWKS/external
 * token verification, override at the `JwtPort` tier instead — see
 * `ports.jwt.verifyAccessTokenQuery` in the README.
 */
export interface TokenOptionsInterface extends Omit<
  JwtModuleOptions,
  'secretOrPrivateKey' | 'secret' | 'secretOrKeyProvider' | 'publicKey'
> {
  /**
   * Narrowed from jwt.Secret → string | Buffer.
   * KeyObject is not supported for per-call sign/verify options.
   */
  secret?: string | Buffer;

  /**
   * Narrowed from jwt.Secret → string | Buffer, matching `JwtVerifyOptions`'s
   * per-call type (`@nestjs/jwt`). Pair with `privateKey` for RS256/ES256
   * asymmetric-key sign/verify without a shared secret.
   */
  publicKey?: string | Buffer;
}
