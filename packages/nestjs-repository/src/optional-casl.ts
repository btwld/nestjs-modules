/**
 * `@concepta/nestjs-repository/optional/casl`
 *
 * An authority answering from CASL rules. Requires the optional peer
 * dependency `@casl/ability`; nothing on the package's other entry points
 * imports it, so a consumer with another authority never installs it.
 */

export { CaslAuthority } from './casl/casl-authority.js';
export { CaslAuthorityRule } from './casl/interfaces/casl-authority-rule.type.js';
export { CaslAuthorityRulesInterface } from './casl/interfaces/casl-authority-rules.interface.js';
