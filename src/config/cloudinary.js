const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'placeholder';

let upload;

if (isConfigured) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: file.mimetype.startsWith('image/') ? 'spreadb/images' : 'spreadb/files',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4'],
      transformation: file.mimetype.startsWith('image/') ? [{ width: 1200, crop: 'limit' }] : [],
    }),
  });

  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
  console.log('✅ Cloudinary configured');
} else {
  // Use memory storage as fallback - files won't be persisted but app won't crash
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  console.log('ℹ️  Cloudinary not configured - file uploads disabled');
}

module.exports = { cloudinary, upload };
