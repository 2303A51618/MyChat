import cloudinary from '../lib/cloudinary.js';
import { compressBase64Image } from '../lib/imageUtils.js';

// Accepts base64 payload: { file: 'data:<mime>;base64,AAAA...' }
export const uploadMedia = async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) return res.status(400).json({ message: 'No file provided' });

    // Compress image server-side to save bandwidth/storage
    const { buffer, format } = await compressBase64Image(file, { maxWidth: 1280, quality: 80 });

    // upload buffer via upload_stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: 'chat_uploads', resource_type: 'image', format }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
      uploadStream.end(buffer);
    });

    return res.status(200).json({ url: result.secure_url, resource_type: result.resource_type, public_id: result.public_id });
  } catch (err) {
    console.error('Media upload error:', err.message);
    return res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};
