-- Avisos automáticos de vencimiento por email (Resend), fuera de la app.
--
-- Contexto: por Apple 3.1.1 la app no puede mostrar CTAs de activación ni
-- precios adentro. El aviso de "se te vence la prueba / el plan" tiene que
-- salir por un canal externo, y ese canal es el email. Lo dispara un pg_cron
-- diario que llama a la Edge Function avisos-vencimiento.
--
-- Esta migración aporta tres cosas:
--   1. Las dos columnas de idempotencia (una por tipo de aviso).
--   2. El reseteo de esas columnas cuando un admin extiende una cuenta, para
--      que el ciclo siguiente vuelva a avisar.
--   3. La función que arma la lista de pendientes con el email del usuario.


-- ---------------------------------------------------------------------------
-- 1. Columnas de idempotencia
-- ---------------------------------------------------------------------------

-- Nullable y sin default a propósito: NULL significa "todavía no se avisó en
-- este ciclo", y es exactamente la condición que filtra la función de abajo.
-- Un default (now(), por ejemplo) dejaría a todos los usuarios existentes
-- marcados como ya avisados.

alter table public.subscriptions
  add column if not exists aviso_previo_enviado_at  timestamptz;

alter table public.subscriptions
  add column if not exists aviso_vencido_enviado_at timestamptz;

comment on column public.subscriptions.aviso_previo_enviado_at is
  'Cuando se mando el email de "esta por vencer". NULL = pendiente. Lo escribe solo la Edge Function avisos-vencimiento (service role).';

comment on column public.subscriptions.aviso_vencido_enviado_at is
  'Cuando se mando el email de "ya vencio". NULL = pendiente. Lo escribe solo la Edge Function avisos-vencimiento (service role).';

-- NO se agregan al grant update de authenticated (ver migración
-- 20260817120000). El modelo de permisos de esta tabla es por columna: el
-- usuario logueado sólo puede escribir su perfil y su progreso. Si pudiera
-- escribir estas dos, se auto-silenciaría los avisos con un PATCH a PostgREST
-- usando la publishable key, que es pública. Las escribe únicamente el service
-- role desde la Edge Function, que no pasa por estos grants.
--
-- Tampoco hace falta tocar las policies: son de fila, y las de UPDATE
-- existentes ya no alcanzan sin el privilegio de columna.


-- ---------------------------------------------------------------------------
-- 2. admin_cambiar_suscripcion: resetear los avisos al extender
-- ---------------------------------------------------------------------------

-- Sin esto, un usuario al que el admin le activa el plan queda con las dos
-- columnas en su valor viejo y no recibe ningún aviso nunca más: la condición
-- "is null" no vuelve a cumplirse jamás. Correr current_period_end al futuro
-- sin limpiar las marcas rompe el ciclo entero.
--
-- create or replace obliga a repetir el cuerpo completo — no hay forma de
-- parchear una línea. Es idéntico al de 20260817120000 salvo las dos líneas
-- nuevas del set: mismo guard de es_admin(), mismas validaciones de status y
-- de rango de días, mismo manejo de "no encontrado".

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
     set status                   = p_status,
         current_period_end       = now() + make_interval(days => p_dias),
         -- Ciclo nuevo, avisos nuevos.
         aviso_previo_enviado_at  = null,
         aviso_vencido_enviado_at = null,
         updated_at               = now()
   where user_id = p_user_id;

  -- Sin filas afectadas = el usuario no tiene suscripción. Falla explícito en
  -- vez de que el panel muestre un éxito que no ocurrió.
  if not found then
    raise exception 'No existe suscripción para el usuario %', p_user_id
      using errcode = 'no_data_found';
  end if;
end;
$$;

-- Se repiten porque create or replace no reescribe los privilegios, pero
-- dejarlos explícitos evita que una recreación futura desde cero los pierda.
revoke all     on function public.admin_cambiar_suscripcion(uuid, text, int) from public;
grant  execute on function public.admin_cambiar_suscripcion(uuid, text, int) to authenticated;


-- ---------------------------------------------------------------------------
-- 3. La lista de avisos pendientes, con el email
-- ---------------------------------------------------------------------------

-- Por qué una función y no una query desde la Edge Function:
--
--   a) PostgREST no expone el esquema auth. El email vive en auth.users y no
--      hay forma de joinearlo desde supabase-js, ni siquiera con service role.
--      La alternativa era un auth.admin.getUserById() por candidato: N
--      requests HTTP extra para la misma información.
--   b) El now() de las ventanas queda en el reloj de la base, el mismo que usa
--      current_period_end y el mismo que dispara el cron. Calcularlo en el edge
--      mete un segundo reloj en una comparación de bordes.
--   c) Los emails no quedan expuestos a nadie más: el execute va sólo a
--      service_role.
--
-- Las ventanas son deliberadamente anchas para tolerar un cron caído. El filtro
-- real de duplicados es el "is null", no la ventana: si el cron no corre un día,
-- al día siguiente los salteados siguen adentro del rango y reciben el aviso.
-- Con una ventana justa de 24h se perderían para siempre.
--
--   previo  -> (now(), now() + 3 días]     el usuario todavía tiene acceso
--   vencido -> (now() - 7 días, now()]     ya se le cortó
--
-- Los bordes no se solapan y son exhaustivos entre sí: un mismo usuario cae en
-- una rama o en la otra, nunca en las dos.

create or replace function public.avisos_vencimiento_pendientes()
returns table (
  user_id            uuid,
  email              text,
  nombre_vendedor    text,
  status             text,
  current_period_end timestamptz,
  tipo               text,
  dias_restantes     int
)
language sql
stable
security definer
set search_path = ''
as $$
  -- (a) AVISO PREVIO
  select
    s.user_id,
    u.email::text,
    s.nombre_vendedor,
    s.status,
    s.current_period_end,
    'previo'::text as tipo,
    -- ceil y no round: con 2,4 días restantes el copy dice "3 días", que es
    -- el día calendario en el que efectivamente se corta. greatest(...,1)
    -- evita un "te quedan 0 días" si el cron corre pegado al vencimiento.
    greatest(
      1,
      ceil(extract(epoch from (s.current_period_end - now())) / 86400)::int
    ) as dias_restantes
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  where s.status in ('trial', 'active')
    and s.current_period_end >  now()
    and s.current_period_end <= now() + interval '3 days'
    and s.aviso_previo_enviado_at is null
    -- Sin email no hay nada que mandar (puede pasar con altas por OAuth o
    -- cuentas de prueba). deleted_at filtra los borrados lógicos de auth.
    and u.email is not null
    and u.deleted_at is null

  union all

  -- (b) AVISO VENCIDO
  select
    s.user_id,
    u.email::text,
    s.nombre_vendedor,
    s.status,
    s.current_period_end,
    'vencido'::text as tipo,
    0 as dias_restantes
  from public.subscriptions s
  join auth.users u on u.id = s.user_id
  where s.status in ('trial', 'active')
    and s.current_period_end >  now() - interval '7 days'
    and s.current_period_end <= now()
    and s.aviso_vencido_enviado_at is null
    and u.email is not null
    and u.deleted_at is null;
$$;

-- Postgres concede execute a PUBLIC por default en toda función nueva. Sin
-- este revoke, cualquier usuario logueado (y anon, que usa la publishable key
-- que es pública) podría listar los emails de todos los que están por vencer.
revoke all     on function public.avisos_vencimiento_pendientes() from public;
revoke all     on function public.avisos_vencimiento_pendientes() from anon, authenticated;
grant  execute on function public.avisos_vencimiento_pendientes() to service_role;


-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
--
-- 1. Columnas nuevas:
--
--      select column_name, data_type, is_nullable
--      from information_schema.columns
--      where table_schema = 'public' and table_name = 'subscriptions'
--        and column_name like 'aviso_%';
--
-- 2. Que authenticated NO pueda escribirlas (debe devolver 0 filas):
--
--      select column_name from information_schema.column_privileges
--      where table_name = 'subscriptions' and privilege_type = 'UPDATE'
--        and grantee = 'authenticated' and column_name like 'aviso_%';
--
-- 3. Que sólo service_role pueda ejecutar la función:
--
--      select proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public' and p.proname = 'avisos_vencimiento_pendientes';
--
-- 4. La lista de pendientes de hoy (como postgres, en el SQL Editor):
--
--      select * from public.avisos_vencimiento_pendientes();
