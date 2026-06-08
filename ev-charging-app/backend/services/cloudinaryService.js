const cloudinary = require('cloudinary').v2;

/**
 * Cloudinary image upload service.
 *
 * Required env vars in backend/.env:
 *   CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   CLOUDINARY_API_KEY=your_api_key
 *   CLOUDINARY_API_SECRET=your_api_secret
 *
 * Get free credentials at https://cloudinary.com (free tier: 25 GB storage)
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer}  buffer   - File buffer from multer
 * @param {string}  mimetype - e.g. 'image/jpeg'
 * @param {string}  folder   - Cloudinary folder name
 * @returns {Promise<{secure_url, public_id}>}
 */
const uploadToCloudinary = (buffer, mimetype, folder = 'sajhacharge') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 900, crop: 'limit', quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary by URL.
 * @param {string} url - The secure_url returned on upload
 */
const deleteFromCloudinary = async (url) => {
  try {
    // Extract public_id from URL: .../folder/filename.ext → folder/filename
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('.')[0];
    const folder   = parts[parts.length - 2];
    const publicId = `${folder}/${filename}`;
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Non-fatal — log but don't throw
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
