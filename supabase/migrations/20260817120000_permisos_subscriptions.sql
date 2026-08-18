-- Cierra la escalada de privilegios sobre subscriptions.
--
-- Problema: anon y authenticated tenían UPDATE sobre TODAS las columnas de la
-- tabla. Combinado con la policy que deja al usuario modificar su propia fila,
-- cualquiera podía hacer un PATCH directo a PostgREST con la publishable key
-- (que es pública) y ponerse is_admin = true, status = 'active' o correr
-- current_period_end años al futuro. La RLS no ayuda acá: opera a nivel de
-- fila, no de columna. Restringir columnas requiere GRANTs explícitos.
--
-- No se tocan las policies existentes (dos de UPDATE, una de SELECT). Siguen
-- decidiendo QUÉ fila; estos grants deciden QUÉ columnas.


-- ---------------------------------------------------------------------------
-- 1. Permisos de columna
-- ---------------------------------------------------------------------------

-- El revoke de tabla va primero y es obligatorio: si el rol conserva el
-- privilegio a nivel tabla, revocar una columna suelta no tiene efecto.
revoke update on public.subscriptions from anon, authenticated;

-- anon (request sin sesión, sólo con la publishable key) no recibe nada de
-- vuelta. La fila de suscripción la crea el trigger de alta de usuario, que
-- corre con permisos propios y no depende de este grant.

-- El usuario logueado recupera únicamente lo que es su perfil y su progreso.
grant update (
  nombre_vendedor,        -- perfil.tsx
  concesionaria,          -- perfil.tsx
  marca_vehiculo,         -- perfil.tsx
  avatar_url,             -- perfil.tsx
  onboarding_completado,  -- onboarding.tsx
  tooltips_vistos,        -- tooltips.ts
  ultimo_acceso,          -- racha.ts
  racha_dias,             -- racha.ts
  meta_mensual,           -- perfil.tsx
  insignias               -- sin uso hoy; gamificación
) on public.subscriptions to authenticated;

-- Quedan fuera del alcance del usuario:
--   is_admin, status, current_period_end, plan  -> privilegios y facturación
--   user_id                                     -> reapuntar la fila a otro
--                                                  usuario le robaría la suscripción
--   id, created_at, updated_at                  -> columnas de sistema
--
-- Bloquear updated_at no rompe el trigger que la mantiene: los privilegios de
-- columna se chequean contra las columnas que nombra el UPDATE, no contra lo
-- que escribe un trigger BEFORE.


-- ---------------------------------------------------------------------------
-- 2. Cambiar el estado de una suscripción (panel admin)
-- ---------------------------------------------------------------------------

-- admin.tsx escribía status y current_period_end de otros usuarios por update
-- directo. Con el revoke de arriba eso deja de funcionar, y no hay forma de
-- mantenerlo: si authenticated puede escribir status, cualquiera puede.
--
-- security definer para que corra con los permisos del dueño de la función y
-- pueda tocar las columnas bloqueadas. El chequeo de admin va ADENTRO: es el
-- único control real, el de admin.tsx es sólo para la UI.

create or replace function public.admin_cambiar_suscripcion(
  p_user_id uuid,
  p_status  text,
  p_dias    int default 30
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar suscripciones'
      using errcode = 'insufficient_privilege';
  end if;

  if p_status not in ('trial', 'active', 'inactive') then
    raise exception 'Estado inválido: %', p_status
      using errcode = 'check_violation';
  end if;

  if p_dias < 0 or p_dias > 3650 then
    raise exception 'Cantidad de días fuera de rango: %', p_dias
      using errcode = 'check_violation';
  end if;

  update public.subscriptions
     set status             = p_status,
         current_period_end = now() + make_interval(days => p_dias),
         updated_at         = now()
   where user_id = p_user_id;

  -- Sin filas afectadas = el usuario no tiene suscripción. Falla explícito en
  -- vez de que el panel muestre un éxito que no ocurrió.
  if not found then
    raise exception 'No existe suscripción para el usuario %', p_user_id
      using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all     on function public.admin_cambiar_suscripcion(uuid, text, int) from public;
grant  execute on function public.admin_cambiar_suscripcion(uuid, text, int) to authenticated;


-- ---------------------------------------------------------------------------
-- 3. Crear la suscripción faltante de un usuario (panel admin)
-- ---------------------------------------------------------------------------

-- admin.tsx:107 (crearSuscripcion) hace un insert directo sobre subscriptions.
-- Como no existe ninguna policy de INSERT, la RLS lo viene rechazando desde
-- siempre; el error se descarta porque no se chequea, y sincronizar() informa
-- "Se crearon N suscripciones" igual. Nunca creó ninguna.
--
-- Misma solución: definer, con el chequeo de admin adentro.

create or replace function public.admin_crear_suscripcion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede crear suscripciones'
      using errcode = 'insufficient_privilege';
  end if;

  -- Sin ON CONFLICT: no asumimos que exista un índice único sobre user_id.
  insert into public.subscriptions (
    user_id, status, plan, current_period_end, is_admin, onboarding_completado
  )
  select p_user_id, 'trial', 'individual', now() + interval '14 days', false, false
  where not exists (
    select 1 from public.subscriptions where user_id = p_user_id
  );

  if not found then
    raise exception 'El usuario % ya tiene suscripción', p_user_id
      using errcode = 'unique_violation';
  end if;
end;
$$;

revoke all     on function public.admin_crear_suscripcion(uuid) from public;
grant  execute on function public.admin_crear_suscripcion(uuid) to authenticated;
