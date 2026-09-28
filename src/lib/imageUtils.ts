import imageCompression from 'browser-image-compression';

/**
 * Compresses an image to a target size (in MB) and returns as a Base64 string.
 * @param dataUrl The source image as a data URL (Base64)
 * @param targetSizeMB The target maximum size in megabytes
 * @returns A promise that resolves to the compressed data URL
 */
export async function compressImageDataUrl(dataUrl: string, targetSizeMB: number = 0.055): Promise<string> {
  try {
    // 1. Convert Data URL to File
    const blob = await fetch(dataUrl).then(res => res.blob());
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

    // 2. Setup compression options
    const options = {
      maxSizeMB: targetSizeMB,
      maxWidthOrHeight: 1024, // Optional: maintain decent quality
      useWebWorker: true,
      fileType: 'image/jpeg'
    };

    // 3. Compress
    const compressedFile = await imageCompression(file, options);

    // 4. Convert back to Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    return dataUrl; // Fallback to original if compression fails
  }
}
