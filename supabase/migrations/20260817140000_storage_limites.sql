-- Limita el tamaño y el tipo de archivo que se puede subir a Storage.
--
-- Los tres buckets estaban sin file_size_limit, o sea sin tope: cualquier
-- usuario autenticado podía subir un archivo arbitrariamente grande y llenar
-- el almacenamiento del proyecto. catalogo además no tenía restricción de
-- tipo, a diferencia de avatars y vehiculos.
--
-- 5 MB es holgado para lo que sube la app: expo-image-picker entrega con
-- quality 0.7 y allowsEditing, típicamente muy por debajo de ese techo.
--
-- Alcance: esto endurece la SUBIDA, no la lectura. Los tres buckets siguen
-- siendo públicos a propósito — son fotos para mostrar (avatar del vendedor,
-- foto del vehículo), no contenido sensible, y la app las sirve con
-- getPublicUrl. Pasarlos a privados exigiría signed URLs y cambiar
-- imagenService.ts.
--
-- Nota sobre el whitelist de MIME: Storage valida el tamaño contra los bytes
-- reales, así que ese tope no se puede evadir. El tipo, en cambio, se chequea
-- contra el Content-Type declarado, que imagenService.ts arma desde
-- asset.mimeType (viene del cliente). Sirve contra accidentes y abuso casual,
-- no contra alguien que arme el request a mano. El daño real lo contiene el
-- límite de 5 MB.


-- Falla antes de tocar nada si algún bucket no existe con ese id, en vez de
-- actualizar 0 filas en silencio.
do $$
declare
  v_faltantes text;
begin
  select string_agg(e.id, ', ')
    into v_faltantes
  from (values ('avatars'), ('vehiculos'), ('catalogo')) as e(id)
  where not exists (select 1 from storage.buckets b where b.id = e.id);

  if v_faltantes is not null then
    raise exception 'Buckets no encontrados: %', v_faltantes;
  end if;
end;
$$;


-- 5 MB = 5 * 1024 * 1024
update storage.buckets
   set file_size_limit = 5242880
 where id in ('avatars', 'vehiculos', 'catalogo');


-- catalogo no tenía restricción de tipo: se le pone la lista completa.
update storage.buckets
   set allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
       ]
 where id = 'catalogo';


-- avatars y vehiculos ya venían restringidos, así que acá NO se pisa la lista
-- existente: se le suma heic/heif preservando lo que hubiera. Si por lo que
-- sea estuvieran sin restricción (null), se parte de la lista base.
--
-- El array_agg(distinct) hace la operación idempotente y evita el caso
-- molesto: si la lista ya tuviera heic pero no heif, un append a secas
-- duplicaría heic.
update storage.buckets
   set allowed_mime_types = (
         select array_agg(distinct t order by t)
         from unnest(
           coalesce(
             allowed_mime_types,
             array['image/jpeg', 'image/png', 'image/webp']::text[]
           ) || array['image/heic', 'image/heif']::text[]
         ) as t
       )
 where id in ('avatars', 'vehiculos');


-- heic/heif cubren el iPhone: con allowsEditing el picker suele devolver JPEG,
-- pero no está garantizado, y un rechazo por tipo se vería como "no puedo
-- subir la foto" (subirImagen sí hace throw del error, imagenService.ts:42).


-- Verificación (los tres con file_size_limit = 5242880 y allowed_mime_types
-- incluyendo heic/heif):
--
--   select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets
--   where id in ('avatars', 'vehiculos', 'catalogo');
