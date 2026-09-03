-- Cierra el bypass de los guards de admin por NULL, y fija el search_path de
-- obtener_usuarios_con_email.
--
-- Problema: es_admin() estaba escrita como un select pelado
--
--   select is_admin from public.subscriptions where user_id = auth.uid()
--
-- que devuelve NULL en dos casos: el usuario no tiene fila en subscriptions, o
-- la tiene con is_admin nulo. Y en plpgsql `not NULL` evalúa a NULL, con lo cual
-- el IF no se toma y la excepción nunca se lanza:
--
--   if not public.es_admin() then          -- not NULL = NULL -> rama no tomada
--     raise exception '...';               -- nunca llega acá
--   end if;
--   update public.subscriptions ...;       -- sigue de largo y ejecuta
--
-- O sea que admin_cambiar_suscripcion y admin_crear_suscripcion (ambas
-- security definer, ambas con execute concedido a authenticated) quedaban
-- ejecutables por cualquier usuario logueado que no tuviera fila de
-- suscripción. Con la publishable key hardcodeada en src/lib/supabase.ts,
-- alcanzaba un POST a /rest/v1/rpc/admin_cambiar_suscripcion para activarse
-- la cuenta a sí mismo o desactivar la de otro.
--
-- Las policies de RLS que usan es_admin() NO estaban afectadas: en un WHERE,
-- NULL se comporta como false y la fila se filtra igual. Lo mismo vale para el
-- `where es_admin()` de obtener_usuarios_con_email — no filtraba datos. El
-- agujero era exclusivo del patrón `if not ... then raise` de plpgsql.
--
-- Se arregla en es_admin() y no en cada guard: es un solo lugar y cubre a las
-- dos funciones y a cualquier otra que se sume después. Los guards de
-- admin_cambiar_suscripcion y admin_crear_suscripcion quedan correctos tal cual
-- están una vez que es_admin() no puede devolver NULL — esta migración no las
-- toca.


-- ---------------------------------------------------------------------------
-- 1. es_admin() con exists(): nunca NULL
-- ---------------------------------------------------------------------------

-- exists() devuelve siempre true o false, incluso sin filas. Cubre además el
-- caso de la fila existente con is_admin nulo, porque `is_admin = true` no
-- matchea NULL.
--
-- create or replace y no drop/create: las policies de RLS dependen de esta
-- función y un DROP sería rechazado. El OID se conserva, así que las policies
-- siguen apuntando a la misma función sin recrearlas.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

-- Notas de las tres cláusulas, que create or replace reescribe por completo y
-- hay que repetir sí o sí (no se heredan de la definición anterior):
--
--   security definer  -> imprescindible. es_admin() se llama desde policies
--                        sobre subscriptions y lee esa misma tabla; sin definer
--                        entra en recursión de RLS.
--   search_path       -> public, pg_temp, NO ''. Con '' se rompe el panel:
--                        es lo que arregló 20260817130000. pg_temp va último
--                        para que un objeto temporal no sombree a public.
--   stable            -> sólo lee. Permite que el planner la evalúe una vez por
--                        query en vez de por fila, que es como se usa en las
--                        policies. La anterior era volatile por defecto.


-- ---------------------------------------------------------------------------
-- 2. search_path de obtener_usuarios_con_email
-- ---------------------------------------------------------------------------

-- Hoy tiene proconfig null: hereda el search_path de quien la llame. Funciona
-- porque PostgREST llama con el search_path del rol authenticated, pero deja la
-- resolución de nombres a merced del entorno de la sesión.
--
-- Se usa ALTER FUNCTION ... SET y no create or replace, igual que hizo
-- 20260817130000 con es_admin() y por el mismo motivo: no toca el cuerpo ni la
-- firma. Un create or replace exigiría repetir el returns table(...) exacto, y
-- si difiere aunque sea en el nombre o el tipo de una columna, Postgres lo
-- rechaza con "cannot change return type of existing function". ALTER no corre
-- ese riesgo y hace exactamente lo que se necesita.
--
-- El `where es_admin()` del cuerpo queda como está: ya filtraba bien, y con
-- es_admin() devolviendo false en vez de NULL ahora además es explícito.

alter function public.obtener_usuarios_con_email()
  set search_path = public, pg_temp;


-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
--
-- 1. Las cuatro deben salir DEFINER y con proconfig {search_path=public,pg_temp}:
--
--   select p.proname,
--          case when p.prosecdef then 'DEFINER' else 'INVOKER' end as seguridad,
--          p.proconfig,
--          p.provolatile
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('es_admin', 'obtener_usuarios_con_email',
--                       'admin_cambiar_suscripcion', 'admin_crear_suscripcion');
--
-- 2. es_admin() no debe devolver NULL nunca. Sin sesión (auth.uid() es null en
--    el SQL Editor) tiene que dar false, no null:
--
--   select public.es_admin() as debe_ser_false,
--          public.es_admin() is null as debe_ser_false_tambien;
--
-- 3. La prueba real, desde la app con una cuenta NO admin: llamar
--    supabase.rpc('admin_cambiar_suscripcion', {...}) tiene que devolver 42501
--    (insufficient_privilege), y supabase.rpc('obtener_usuarios_con_email')
--    tiene que devolver cero filas.
