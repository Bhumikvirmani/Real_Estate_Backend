import cloudinary from '../config/cloudinaryConfig.js';
import fs from 'fs';

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Path to the file to upload
 * @param {string} folder - Cloudinary folder to upload to
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = async (filePath, folder = 'real-estate') => {
  try {
    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
    });

    // Delete the local file after successful upload
    fs.unlinkSync(filePath);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      success: true
    };
  } catch (error) {
    // Delete the local file if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.error('Error uploading to Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the file to delete
 * @returns {Promise<Object>} - Cloudinary delete result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
