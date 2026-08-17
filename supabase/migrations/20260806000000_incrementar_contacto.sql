-- Incremento atómico del contador de contactos de un cliente.
--
-- Reemplaza el patrón leer-y-sumar desde el cliente, que pierde incrementos si
-- dos contactos se registran casi al mismo tiempo (dos dispositivos, doble tap).
-- Acá el +1 y la fecha se aplican en una sola sentencia.
--
-- security invoker (el default): la función corre con los permisos de quien la
-- llama, así que las policies de RLS de clients siguen aplicando y un usuario no
-- puede tocar clientes de otro.

create or replace function public.incrementar_contacto(p_client_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.clients
     set contact_count   = coalesce(contact_count, 0) + 1,
         last_contact_at = now()
   where id = p_client_id;

  -- Sin filas afectadas = el cliente no existe o RLS lo bloqueó. Falla explícito
  -- en vez de dejar la interacción registrada y el contador sin moverse.
  if not found then
    raise exception 'Cliente % no encontrado o sin permiso', p_client_id
      using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all     on function public.incrementar_contacto(uuid) from public;
grant  execute on function public.incrementar_contacto(uuid) to authenticated;
