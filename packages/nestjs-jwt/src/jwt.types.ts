export {
  NestJwtSignOptions as JwtSignOptions,
  NestJwtSignStringOptions as JwtSignStringOptions,
} from './jwt.externals';

export type JwtVerifyTokenCallback<
  ErrorType extends Error = Error,
  DecodedTokenType = unknown,
> = (
  token: string,
  done: (err?: ErrorType, decodedToken?: DecodedTokenType) => void,
) => void;
