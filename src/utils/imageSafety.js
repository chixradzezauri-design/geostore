const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const hasValidImageSignature = (mimeType, bytes) => {
  const starts = signature => signature.every((byte, index) => bytes[index] === byte);
  if (mimeType === 'image/jpeg') return starts([0xff, 0xd8, 0xff]);
  if (mimeType === 'image/png') return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === 'image/gif') return starts([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61;
  if (mimeType === 'image/webp') return bytes.length >= 12 && starts([0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return false;
};

export const validateImageFile = async (file, maxBytes = 5 * 1024 * 1024, allowedTypes = IMAGE_MIME_TYPES) => {
  if (!file || !allowedTypes.includes(file.type) || !Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
    throw new Error('აირჩიეთ JPG, PNG, WEBP ან GIF ფოტო, მაქსიმუმ 5 MB ზომით.');
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasValidImageSignature(file.type, header)) {
    throw new Error('ფაილის რეალური ფორმატი მითითებულ ტიპს არ ემთხვევა. აირჩიეთ ნამდვილი ფოტო.');
  }
  return file.type;
};

export const isValidImageDataUrl = (value, maxBytes = 5 * 1024 * 1024) => {
  const match = String(value || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=]+)$/i);
  if (!match) return false;
  try {
    const mimeType = match[1].toLowerCase();
    const binary = atob(match[2]);
    if (!binary.length || binary.length > maxBytes) return false;
    const header = Uint8Array.from(binary.slice(0, 12), char => char.charCodeAt(0));
    return hasValidImageSignature(mimeType, header);
  } catch {
    return false;
  }
};

export const isSafeImageUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};
