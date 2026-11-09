import { randomUUID } from 'crypto';

import { type LocalCredentialsInterface } from '../../interfaces/local-credentials.interface.js';

export const LOGIN_SUCCESS = {
  username: 'random_username',
  password: 'random_password',
};

export const USER_SUCCESS: LocalCredentialsInterface = {
  id: randomUUID(),
  active: true,
  passwordHash: LOGIN_SUCCESS.password,
  username: LOGIN_SUCCESS.username,
};
