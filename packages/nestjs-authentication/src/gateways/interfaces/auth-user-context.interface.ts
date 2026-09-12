import { type AuthenticatedUserInterface } from '../../domain/interfaces/authenticated-user.interface.js';

export interface AuthUserContextInterface {
  user?: AuthenticatedUserInterface;
}
