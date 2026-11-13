/**
 * `@concepta/nestjs-repository/optional/casl`
 *
 * An authority answering from rules (`AuthorityRuleInterface`, from
 * `@concepta/nestjs-core`), decided by CASL. Requires the optional peer
 * dependency `@casl/ability`; nothing on the package's other entry points
 * imports it, so a consumer with another authority never installs it.
 */

export { CaslAuthority } from './casl/casl-authority.js';
export { CaslAuthorityRulesInterface } from './casl/interfaces/casl-authority-rules.interface.js';
export { CaslAuthorityRulesInvalidException } from './casl/exceptions/casl-authority-rules-invalid.exception.js';
