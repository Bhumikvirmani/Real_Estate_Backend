import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * @route   POST /api/upload/property
 * @desc    Upload property images
 * @access  Private
 */
router.post('/property', protect, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }

    const uploadPromises = req.files.map(file => 
      uploadToCloudinary(file.path, 'real-estate/properties')
    );

    const results = await Promise.all(uploadPromises);
    
    // Check if any uploads failed
    const failedUploads = results.filter(result => !result.success);
    if (failedUploads.length > 0) {
      return res.status(500).json({
        success: false,
        message: 'Some images failed to upload',
        errors: failedUploads.map(f => f.error)
      });
    }

    // Return successful uploads
    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      images: results.map(result => ({
        url: result.url,
        public_id: result.public_id
      }))
    });
  } catch (error) {
    console.error('Error in property image upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/upload/profile
 * @desc    Upload user profile image
 * @access  Private
 */
router.post('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const result = await uploadToCloudinary(req.file.path, 'real-estate/profiles');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload profile image',
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      image: {
        url: result.url,
        public_id: result.public_id
      }
    });
  } catch (error) {
    console.error('Error in profile image upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile image',
      error: error.message
    });
  }
});

export default router;
