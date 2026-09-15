import {
  type ReferenceEmailInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-common';

export interface AuthGithubCredentialsInterface
  extends ReferenceIdInterface, ReferenceEmailInterface {}
