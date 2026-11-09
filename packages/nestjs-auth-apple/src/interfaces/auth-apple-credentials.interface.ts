import {
  type ReferenceEmailInterface,
  type ReferenceIdInterface,
} from '@concepta/nestjs-common';

export interface AuthAppleCredentialsInterface
  extends ReferenceIdInterface, ReferenceEmailInterface {}
