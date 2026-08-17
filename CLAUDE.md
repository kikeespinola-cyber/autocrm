# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Qué es Vendix

CRM móvil para vendedores de vehículos en Paraguay. Expo (SDK 56) + expo-router + React Native 0.85 + React 19, con Supabase como backend (auth, Postgres, storage, edge functions). Target principal Android; el proyecto tiene carpeta `android/` nativa (no es managed puro) y se buildea con EAS. `reactCompiler` y `typedRoutes` están activados en `app.json`.

## Comandos

```bash
npm start                  # expo start (dev server)
npm run android            # expo run:android — build nativo local
npm run web                # expo start --web
npx tsc --noEmit           # chequeo de tipos — es el único check real del repo

eas build --profile preview --platform android      # APK interno
eas build --profile production --platform android   # AAB para Play Store
```

- **No hay tests ni linter configurado.** `npm run lint` (`expo lint`) no tiene config de ESLint ni la dependencia instalada, y `npm run reset-project` apunta a `scripts/reset-project.js`, que no existe. El chequeo que se corre antes de dar algo por terminado es `npx tsc --noEmit`, que debe salir sin errores.
- `.npmrc` fija `legacy-peer-deps=true`; hace falta para que instale.
- La Edge Function está **excluida** de `tsconfig.json` (`"exclude": ["supabase"]`) porque corre en Deno. Si la tocás, validala con `deno check supabase/functions/sugerencia-ia/index.ts` o en el deploy de Supabase — `tsc` ya no la mira.

## Convenciones

- **Todo el código está en español**: nombres de funciones, variables, comentarios y archivos (`clientesService`, `mensajeError`, `calcularProximoContacto`). Seguí eso. La excepción son las columnas de Postgres, mayormente en inglés (`clients.name`, `sold`, `last_contact_at`) con algunas en español (`etapa`, `origen`, `comentario_clave`) — mirá `src/lib/types.ts` antes de asumir.
- Sin librería de estilos: `StyleSheet.create` al final de cada archivo, tokens de color desde `src/lib/theme.ts` (`T.bg`, `T.accent`, …). El acento de marca es `#04dedf` y el negro de texto `#1A1A2E` (este último suele redeclararse como const local `NEGRO` en cada pantalla).
- Textos de marca (nombre, slogan, WhatsApp, URLs legales) salen de `src/lib/marca.ts` — no hardcodear "Vendix" en pantallas nuevas.
- Sin state manager: cada pantalla hace fetch propio contra Supabase, típicamente dentro de `useFocusEffect` para refrescar al volver.
- Alias de imports: `@/*` → `./src/*` y `@/assets/*` → `./assets/*`, aunque el código existente usa mayormente rutas relativas.

## Estructura

```
src/
  app/          # rutas (expo-router). Un archivo = una pantalla
    _layout.tsx     # Tabs raíz + guard de sesión
    index.tsx       # "Hoy" — pantalla principal + gating de trial/onboarding
    cliente/[id].tsx, cliente/editar/[id].tsx
    …               # clientes, pipeline, reuniones, perfil, metricas, postventa,
                    # anuncios, pautas, catalogo, planes, admin, login, registro,
                    # onboarding, trial-vencido
  components/   # Toast (provider global), Tooltip
  hooks/        # useTipoCambio
  lib/          # supabase, types, theme, marca, y los servicios de dominio
supabase/
  functions/sugerencia-ia/   # Edge Function en Deno (única función)
android/        # proyecto nativo versionado
```

## Arquitectura

### Routing y gating de acceso

`src/app/_layout.tsx` es un `<Tabs>` único que hace de router y de guard de sesión a la vez. Cinco tabs visibles (Hoy / Clientes / Pipeline / Agenda / Perfil); **todas las demás pantallas se registran igual como `<Tabs.Screen>` pero con `href: null`** para quedar navegables sin aparecer en la barra. Al agregar una pantalla en `src/app/`, hay que declararla ahí o rompe.

El gating pasa por dos lugares distintos:

1. `_layout.tsx` — sesión: sin sesión redirige a `/login`; con sesión estando en login/registro redirige a `/`. Oculta tabs y header en `login`, `registro`, `onboarding` y `trial-vencido`.
2. `src/app/index.tsx` → `verificarAcceso()` — suscripción: lee `subscriptions` y redirige a `/trial-vencido` si el trial venció, o a `/onboarding` si `onboarding_completado` es false. Usa un flag de módulo `_accesoVerificado` para correr una sola vez por montaje de la app.

O sea: la lógica de trial/onboarding vive en la pantalla Hoy, no en el layout. Si hace falta gatear algo nuevo, ese es el lugar.

### Datos (Supabase)

`src/lib/supabase.ts` crea el cliente con URL y publishable key **hardcodeadas** — no hay variables de entorno en el proyecto. La sesión persiste en `expo-secure-store` en nativo y no persiste en web (`persistSession: !isWeb`).

Tablas en uso: `clients`, `interactions`, `reminders`, `reuniones`, `subscriptions`, `anuncios_historial`, `pautas`, `vehiculos_catalogo`. El aislamiento por usuario es por RLS + `user_id`; no hay migraciones versionadas en el repo, el esquema vive solo en Supabase.

`subscriptions` es la tabla de perfil además de la de suscripción: guarda `nombre_vendedor`, `concesionaria`, `marca_vehiculo`, `avatar_url`, `meta_mensual`, `racha_dias`, `ultimo_acceso`, `tooltips_vistos` e `is_admin`. Varias features chicas (racha, tooltips, admin) leen y escriben ahí.

**`src/lib/types.ts` está mantenido a mano y quedó desfasado del esquema real.** Ejemplos concretos: `Reminder` declara `fecha`/`nota`/`completado` pero `clientesService.getRemindersToday()` consulta `due_at`/`completed`; `getClients()` ordena por `updated_at` y `getClientsDueToday()` filtra por `next_contact_at`, columnas que el tipo `Client` no declara; `Subscription` no incluye `ultimo_acceso` ni `tooltips_vistos`. Verificá contra la tabla real antes de confiar en el tipo, y actualizá `types.ts` cuando toques una columna.

`src/lib/clientesService.ts` cubre sólo una parte de los accesos; la mayoría de las pantallas (sobre todo `cliente/[id].tsx`) llama `supabase.from(...)` inline. No hay una capa de datos completa — no asumas que existe una función de servicio.

### IA

Todo pasa por la Edge Function `sugerencia-ia` (`supabase/functions/sugerencia-ia/index.ts`), que llama a la API de Anthropic con `claude-haiku-4-5` y la key en `ANTHROPIC_API_KEY` del entorno de Supabase. Se invoca siempre con `supabase.functions.invoke()` para que adjunte el JWT del usuario logueado.

La función tiene dos modos según el body:

- sin `promptPersonalizado`: arma el prompt de seguimiento de cliente y devuelve `{sugerencia, mensaje}` parseando el JSON del modelo.
- con `promptPersonalizado`: usa ese prompt tal cual y devuelve el texto crudo duplicado en ambos campos.

`src/lib/ia.ts` envuelve el primer modo (y limpia markdown de la respuesta); `anuncios.tsx` usa el segundo directamente. Cualquier feature nueva de IA debería sumar un modo ahí en vez de crear otra función.

Ojo: `supabase/config.toml` tiene `verify_jwt = false` para esta función.

### Dominio: el protocolo de contacto

`src/lib/protocolo.ts` es la regla de negocio central. Según `temperature` (`hot`/`warm`/`cold`) y `contact_count`, calcula cuándo toca volver a contactar a un cliente: hot escala de hoy → día siguiente → cada 3 días; warm cada 3 días y luego semanal; cold quincenal. De ahí salen la pantalla "Hoy", el orden del pipeline y los recordatorios. Los colores y labels por temperatura están en `theme.ts` (`tempColor`, `tempDim`, `tempTextColor`, `tempLabel`).

### Utilidades transversales

- `src/lib/errores.ts` — `mensajeError(e)` traduce cualquier error (red, JWT vencido, RLS, duplicado, 5xx) a un mensaje corto en español. Usalo en todo `catch` que llegue a la UI en vez de mostrar `e.message`. `esErrorDeRed(e)` distingue el caso "sin internet".
- `src/components/Toast.tsx` — `ToastProvider` está montado en el layout raíz; se consume con `useToast().mostrarToast(msg, 'success' | 'error' | 'info')`.
- `src/lib/tooltips.ts` — onboarding contextual persistido por key en `subscriptions.tooltips_vistos`.
- `src/lib/notificaciones.ts` — un solo recordatorio diario a las 9:00; `programarRecordatorioDiario()` cancela todo lo programado antes de agendar, así que no conviven varias notificaciones.
- `src/lib/exportar.ts` (CSV + PDF de la cartera vía `expo-print`/`expo-sharing`) y `src/lib/reportePDF.ts` (reporte de cierre de mes).
- `src/lib/imagenService.ts` — picker + upload a Supabase Storage; devuelve la URL pública con `?t=timestamp` para romper caché.
- `src/lib/colorService.ts` — extrae el color dominante de la foto del vehículo y deriva un par fondo pastel / texto oscuro para las cards.
- `src/lib/racha.ts` — racha de días consecutivos e insignias, calculadas sobre `subscriptions`.
- `src/hooks/useTipoCambio.ts` — cotización USD→PYG desde `api.frankfurter.app`, con fallback a 7500. Los precios se muestran en guaraníes con el equivalente en dólares.

## Contexto de producto

Paraguay: moneda PYG, fechas en `es-PY`, WhatsApp como canal principal (hay deep links a `wa.me` en varias pantallas), copies en español con voseo. Modelo de negocio: trial de 14 días → planes pagos (`src/app/planes.tsx`), con activación manual desde `src/app/admin.tsx` por usuarios con `is_admin`.
