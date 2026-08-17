import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'

// Abre la galería, deja recortar, y devuelve el asset elegido (o null si cancela)
export async function elegirImagen(aspect: [number, number] = [4, 3]): Promise<ImagePicker.ImagePickerAsset | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permiso.granted) {
    return null
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect,
    quality: 0.7,
  })

  if (resultado.canceled || !resultado.assets?.[0]) {
    return null
  }
  return resultado.assets[0]
}

// Sube un asset a un bucket de Supabase y devuelve la URL pública
export async function subirImagen(
  asset: ImagePicker.ImagePickerAsset,
  bucket: string,
  path: string
): Promise<string> {
  // Leer el archivo como ArrayBuffer (funciona en nativo)
  const response = await fetch(asset.uri)
  const arrayBuffer = await response.arrayBuffer()

  const ext = asset.uri.split('.').pop()?.split('?')[0] || 'jpg'
  const contentType = asset.mimeType || `image/${ext}`
  const fullPath = `${path}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, arrayBuffer, { upsert: true, contentType })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath)
  return publicUrl + '?t=' + Date.now()
}
