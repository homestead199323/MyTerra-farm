/* A photo picked on the device, shrunk to a JPEG data URL small enough to live in the saved farm. */
export async function compressPhoto(file, maxSide = 720, quality = 0.6) {
  if (!file || !String(file.type).startsWith("image/")) throw new Error("not-image");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas"), scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
