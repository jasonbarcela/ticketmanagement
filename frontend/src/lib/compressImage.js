/**
 * Resize and compress an image file for base64 upload (max dimension 1200px, JPEG 0.7).
 * @param {File} file
 * @returns {Promise<string>} data URL (image/jpeg)
 */
export function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please select an image file.'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxDim = 1200
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } catch (err) {
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image for compression.'))
    }

    img.src = url
  })
}
