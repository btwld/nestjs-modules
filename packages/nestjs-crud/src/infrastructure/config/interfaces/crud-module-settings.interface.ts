/**
 * Module-wide crud settings. Currently empty — a per-route response
 * type/paginated type (`CrudResponseConfig`/`CrudSerializationOptionsInterface`)
 * is always resolved per-operation via decorators, never as a module-wide
 * default, since a single fallback schema would never be meaningful across
 * a module's distinct entities. Kept as an extension point for genuinely
 * module-wide settings, should one ever be needed.
 */
export interface CrudModuleSettingsInterface {}
