import {
  type ReferenceEmailInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-common';

export interface AuthGoogleCredentialsInterface
  extends ReferenceIdInterface, ReferenceEmailInterface {}
