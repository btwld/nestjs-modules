export type JwtVerifyTokenCallback<
  ErrorType extends Error = Error,
  DecodedTokenType = unknown,
> = (
  token: string,
  done: (err?: ErrorType, decodedToken?: DecodedTokenType) => void,
) => void;
