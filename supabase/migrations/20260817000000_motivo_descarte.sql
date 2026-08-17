-- Motivo de descarte de un cliente.
--
-- La ficha del cliente (cliente/[id].tsx) ya escribia este campo junto con
-- temperature = 'cold', pero la columna no existia. PostgREST rechazaba el
-- update completo y, como el codigo no chequea el error, fallaba en silencio:
-- no se guardaba el motivo y tampoco se enfriaba el cliente, porque las dos
-- asignaciones viajaban en la misma sentencia.
--
-- Sin default ni not null: un cliente sin descartar simplemente la tiene en
-- null. Las policies de RLS de clients ya cubren la columna nueva.

alter table public.clients
  add column if not exists motivo_descarte text;
