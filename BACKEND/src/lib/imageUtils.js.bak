// Accepts a base64 data URL or raw base64 string and returns a compressed Buffer and inferred format
export async function compressBase64Image(base64Data, options = {}) {
  // options: { maxWidth, quality }
  const maxWidth = options.maxWidth || 1280;
  const quality = options.quality || 80;

  // if data URL like 'data:image/png;base64,AAAA'
  let matches = base64Data.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.*)$/i);
  let buffer;
  let inputFormat = 'jpeg';
  if (matches) {
    const mime = matches[1];
    const b64 = matches[3];
    buffer = Buffer.from(b64, 'base64');
    if (/png/i.test(mime)) inputFormat = 'png';
    else if (/webp/i.test(mime)) inputFormat = 'webp';
    else inputFormat = 'jpeg';
  } else {
    // assume raw base64
    buffer = Buffer.from(base64Data, 'base64');
  }

  // Try to dynamically import sharp; if it's not available, fall back to returning the raw buffer
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default || sharpModule;

    // Use sharp to resize and encode
    let transformer = sharp(buffer).rotate().resize({ width: maxWidth, withoutEnlargement: true });

    // If image supported transparency (png/webp), convert to webp for better compression
    if (inputFormat === 'png' || inputFormat === 'webp') {
      transformer = transformer.webp({ quality });
      return { buffer: await transformer.toBuffer(), format: 'webp' };
    }

    // otherwise output jpeg
    transformer = transformer.jpeg({ quality });
    return { buffer: await transformer.toBuffer(), format: 'jpeg' };
  } catch (err) {
    // sharp not installed or failed to load; return original buffer and best-effort format
    console.warn('[imageUtils] sharp not available, skipping compression. Install sharp to enable server-side compression.');
    return { buffer, format: inputFormat === 'png' ? 'png' : (inputFormat === 'webp' ? 'webp' : 'jpeg') };
  }
}
