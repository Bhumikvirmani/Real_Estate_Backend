import express from 'express';
import Favorite from '../models/favoriteModel.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user's favorite properties
router.get('/', protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate({
        path: 'property',
        populate: {
          path: 'owner',
          select: 'name email phone'
        }
      })
      .sort('-createdAt');
    
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if a property is in user's favorites
router.get('/:propertyId/check', protect, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      user: req.user._id,
      property: req.params.propertyId
    });
    
    res.json({ isFavorite: !!favorite });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add property to favorites
router.post('/:propertyId', protect, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    
    // Check if already in favorites
    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      property: propertyId
    });
    
    if (existingFavorite) {
      return res.status(400).json({ message: 'Property already in favorites' });
    }
    
    const favorite = new Favorite({
      user: req.user._id,
      property: propertyId
    });
    
    await favorite.save();
    
    res.status(201).json({ message: 'Property added to favorites' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove property from favorites
router.delete('/:propertyId', protect, async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    
    const favorite = await Favorite.findOneAndDelete({
      user: req.user._id,
      property: propertyId
    });
    
    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }
    
    res.json({ message: 'Property removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
