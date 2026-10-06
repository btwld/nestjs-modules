import {
  type ReferenceEmailInterface,
  type ReferenceIdInterface,
  type ReferenceUsernameInterface,
} from '@concepta/nestjs-common';

import { type AuthGithubEmailsInterface } from './auth-github-emails.interface';

export interface AuthGithubProfileInterface
  extends
    ReferenceIdInterface,
    Partial<ReferenceEmailInterface>,
    Partial<ReferenceUsernameInterface> {
  displayName?: string;
  emails?: AuthGithubEmailsInterface[];
}
