import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createPropertyReview,
  getPropertyReviews,
  updatePropertyReview,
  deletePropertyReview
} from '../controllers/reviewController.js';

const router = express.Router({ mergeParams: true });

// Get all reviews for a property
router.get('/', getPropertyReviews);

// Create a new review (requires authentication)
router.post('/', protect, createPropertyReview);

// Update a review (requires authentication)
router.put('/:reviewId', protect, updatePropertyReview);

// Delete a review (requires authentication)
router.delete('/:reviewId', protect, deletePropertyReview);

export default router;
