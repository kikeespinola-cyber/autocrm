-- Cron de los avisos de vencimiento.
--
-- Esto NO es una migración: va a mano en el SQL Editor de Supabase, una sola
-- vez, DESPUÉS de haber aplicado 20260906000000_avisos_vencimiento.sql y de
-- haber deployado la Edge Function avisos-vencimiento.
--
-- Queda versionado acá para no perder el valor exacto de lo que está corriendo
-- en producción, pero el archivo no toca la base solo.
--
-- ANTES DE PEGAR: reemplazá PEGA_ACA_TU_CRON_SECRET por el mismo valor que
-- cargaste como secret CRON_SECRET en Edge Functions. Si no coinciden, la
-- función devuelve 401 y no manda nada.


-- ---------------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------------

-- pg_cron agenda; pg_net hace el POST. En Supabase se habilitan también desde
-- Database > Extensions, pero acá van explícitas para que el script sea
-- autosuficiente.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;


-- ---------------------------------------------------------------------------
-- 1. El job
-- ---------------------------------------------------------------------------

-- El unschedule previo hace que el script sea re-pegable: cron.schedule con un
-- nombre que ya existe lo pisa, pero si alguna vez se renombra el job quedarían
-- dos corriendo y todos recibirían el aviso duplicado. Va envuelto porque
-- unschedule tira error si el job no existe (la primera vez).

do $$
begin
  perform cron.unschedule('avisos-vencimiento');
exception
  when others then null;
end;
$$;

-- 12:00 UTC = 09:00 en Paraguay (UTC-3, sin horario de verano desde 2024).
-- Una vez por día alcanza: las ventanas de avisos_vencimiento_pendientes() son
-- de 3 y 7 días, así que nadie se pierde por correr una sola vez.

select cron.schedule(
  'avisos-vencimiento',
  '0 12 * * *',
  $$
  select net.http_post(
    url     := 'https://axkwixgbglrpkqqlgbfa.supabase.co/functions/v1/avisos-vencimiento',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'X-Cron-Secret',  'PEGA_ACA_TU_CRON_SECRET'
    ),
    body    := '{}'::jsonb,
    -- El default de pg_net son 5 segundos y no alcanza: la función manda los
    -- emails de a uno con pausa de 600 ms entre cada uno.
    timeout_milliseconds := 120000
  );
  $$
);


-- ---------------------------------------------------------------------------
-- 2. Verificación
-- ---------------------------------------------------------------------------

-- El job quedó agendado:
--
--   select jobid, jobname, schedule, active from cron.job
--   where jobname = 'avisos-vencimiento';
--
-- Las últimas corridas (status debe decir 'succeeded'; ojo que eso sólo dice
-- que el net.http_post se encoló, no que la función haya respondido 200):
--
--   select runid, status, return_message, start_time
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'avisos-vencimiento')
--   order by start_time desc limit 10;
--
-- La respuesta REAL de la función — acá se ve el 200 con {enviados, fallidos}
-- o el 401 si el secret no coincide:
--
--   select id, status_code, content, created
--   from net._http_response
--   order by created desc limit 10;


-- ---------------------------------------------------------------------------
-- 3. Para desactivarlo
-- ---------------------------------------------------------------------------
--
--   select cron.unschedule('avisos-vencimiento');
--
-- Alternativa si preferís no dejar el secret en texto plano dentro de
-- cron.job (sólo lo lee el rol postgres, pero igual): guardalo en Vault con
--
--   select vault.create_secret('EL_VALOR', 'cron_secret');
--
-- y en el body del schedule reemplazá el literal por
--
--   (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
