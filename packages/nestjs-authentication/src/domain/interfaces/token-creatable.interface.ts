import { type TokenType } from './token.interface.js';

export interface TokenCreatableInterface {
  sub: string;
  type: TokenType;
  scope?: string[];
  iat?: Date;
  exp: Date;
}
