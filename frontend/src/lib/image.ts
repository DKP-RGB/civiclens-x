export async function compressImage(file: File, maxDimension = 1400, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG or WebP).')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image must be smaller than 8 MB.')
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available in this browser.')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    // Fallback for browsers that cannot decode the image (e.g. some HEIC files).
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read the selected image.'))
      reader.readAsDataURL(file)
    })
  }
}
