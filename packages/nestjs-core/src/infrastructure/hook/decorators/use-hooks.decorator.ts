import { SetMetadata } from '@nestjs/common';

import { HOOKS_METADATA_KEY } from '../hook.constants.js';
import { type HookOption } from '../hook.types.js';

/**
 * Decorator to specify hooks for a controller class or method.
 *
 * The HookContextOverlay (registered globally via CoreModule) gathers hooks from
 * this decorator and attaches them to the request context.
 *
 * When applied to a class, the hooks apply to all methods in that class.
 * When applied to a method, the hooks apply only to that method.
 *
 * Method-level decorators are merged with class-level decorators.
 *
 * @param hooks - Hook configurations (class or `{ hook, spec }` objects)
 *
 * @example
 * ```typescript
 * // Class-level - applies to all methods
 * @UseHooks(TenantHook, AuditHook)
 * @Controller('users')
 * class UserController {
 *   @Get()
 *   findAll() { ... }  // TenantHook and AuditHook apply
 *
 *   @Post()
 *   create() { ... }   // TenantHook and AuditHook apply
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Method-level additions
 * @UseHooks(TenantHook)
 * @Controller('users')
 * class UserController {
 *   @Get()
 *   findAll() { ... }  // Only TenantHook (from class)
 *
 *   @UseHooks(AdminHook)  // Adds to class-level hooks
 *   @Delete(':id')
 *   delete() { ... }   // TenantHook and AdminHook
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With specification objects
 * @UseHooks(
 *   { hook: TenantHook, spec: Spec.isQuery() },
 *   { hook: AuditHook, spec: Spec.isMutation() },
 * )
 * @Controller('orders')
 * class OrderController { ... }
 * ```
 */
export function UseHooks(
  ...hooks: HookOption[]
): ClassDecorator & MethodDecorator {
  return SetMetadata(HOOKS_METADATA_KEY, hooks);
}
