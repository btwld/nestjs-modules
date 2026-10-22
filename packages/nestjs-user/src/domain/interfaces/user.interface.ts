import {
  type ReferenceActiveInterface,
  type ReferenceEmailInterface,
  type ReferenceUsernameInterface,
} from '@concepta/nestjs-core';

export interface UserInterface
  extends
    ReferenceEmailInterface,
    ReferenceUsernameInterface,
    ReferenceActiveInterface {}
