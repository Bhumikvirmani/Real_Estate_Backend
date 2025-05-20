import express from 'express';
import Property from '../models/propertyModel.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { validate, propertySchemas } from '../middleware/validationMiddleware.js';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getUserProperties,
  getPropertyCategories
} from '../controllers/propertyController.js';
import { categoryCacheMiddleware, propertyDetailCacheMiddleware } from '../middleware/cacheMiddleware.js';
import reviewRoutes from './reviewRoutes.js';

const router = express.Router();

// Use review routes for property reviews
router.use('/:id/reviews', reviewRoutes);

// Public routes
// Get all properties with filtering, sorting, and pagination
router.get('/', optionalAuth, getProperties);

// Get property categories count
router.get('/categories', categoryCacheMiddleware, getPropertyCategories);

// Get featured properties (latest 6 properties)
router.get('/featured', categoryCacheMiddleware, async (_req, res) => {
  try {
    // Get the 6 most recently added properties
    const properties = await Property.find()
      .sort('-createdAt') // Sort by creation date, newest first
      .limit(6) // Limit to 6 properties
      .populate('owner', 'name email phone');

    res.json({
      success: true,
      properties
    });
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured properties'
    });
  }
});

// Get property locations for homepage
router.get('/locations', categoryCacheMiddleware, async (_req, res) => {
  try {
    const locations = await Property.aggregate([
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 },
          properties: { $push: '$$ROOT' }
        }
      },
      {
        $project: {
          city: '$_id',
          state: { $arrayElemAt: ['$properties.location.state', 0] },
          count: 1,
          image: { $arrayElemAt: ['$properties.images', 0] },
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 6
      }
    ]);

    res.json({
      success: true,
      locations
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching property locations'
    });
  }
});

// Protected routes (require authentication)
// Get user's properties
router.get('/user', protect, getUserProperties);

// Create a new property
router.post('/', protect, validate(propertySchemas.create), createProperty);

// Get property by ID - must be after all other GET routes with specific paths
router.get('/:id', propertyDetailCacheMiddleware, getPropertyById);

// Get similar properties
router.get('/:id/similar', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Find properties with similar characteristics
    const similarProperties = await Property.find({
      _id: { $ne: property._id }, // Exclude current property
      type: property.type,
      // Use more flexible criteria to ensure we get some results
      $or: [
        { status: property.status },
        { 'location.city': property.location.city }
      ],
      // Use a wider price range
      price: {
        $gte: property.price * 0.7, // Within 30% price range
        $lte: property.price * 1.3
      }
    })
    .limit(3)
    .populate('owner', 'name email');

    res.json({
      success: true,
      properties: similarProperties
    });
  } catch (error) {
    console.error('Error fetching similar properties:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching similar properties'
    });
  }
});

// Update a property
router.put('/:id', protect, validate(propertySchemas.update), updateProperty);

// Delete a property
router.delete('/:id', protect, deleteProperty);

export default router;
