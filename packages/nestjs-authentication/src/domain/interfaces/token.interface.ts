export type TokenType = 'access' | 'refresh';

export interface TokenInterface {
  sub: string;
  type: TokenType;
  scope: string[];
  iat: Date;
  exp: Date;
  revokedAt?: Date;
}
