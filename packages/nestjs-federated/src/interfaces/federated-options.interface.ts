import { type FederatedUserPortSettings } from '../domain/ports/federated-user.port.js';
import { type FederatedSettingsInterface } from '../infrastructure/config/interfaces/federated-settings.interface.js';

export interface FederatedOptionsInterface {
  userPort: FederatedUserPortSettings;
  settings?: FederatedSettingsInterface;
}
