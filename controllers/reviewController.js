import Property from '../models/propertyModel.js';
import { 
  sendSuccess, 
  sendError, 
  asyncHandler 
} from '../utils/apiUtils.js';

/**
 * @desc    Create a new review for a property
 * @route   POST /api/properties/:id/reviews
 * @access  Private
 */
export const createPropertyReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const propertyId = req.params.id;

  // Validate input
  if (!rating || !comment) {
    return sendError(res, 400, 'Rating and comment are required');
  }

  // Find property
  const property = await Property.findById(propertyId);
  
  if (!property) {
    return sendError(res, 404, 'Property not found');
  }

  // Check if user already reviewed this property
  const alreadyReviewed = property.reviews.find(
    review => review.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    return sendError(res, 400, 'You have already reviewed this property');
  }

  // Create new review
  const review = {
    user: req.user._id,
    rating: Number(rating),
    comment
  };

  // Add review to property
  property.reviews.push(review);
  
  // Update property review stats
  property.numReviews = property.reviews.length;
  property.averageRating = property.reviews.reduce((acc, item) => item.rating + acc, 0) / property.reviews.length;

  // Save property with new review
  await property.save();

  sendSuccess(res, 201, 'Review added successfully', { review });
});

/**
 * @desc    Get all reviews for a property
 * @route   GET /api/properties/:id/reviews
 * @access  Public
 */
export const getPropertyReviews = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate('reviews.user', 'name avatar');
  
  if (!property) {
    return sendError(res, 404, 'Property not found');
  }

  sendSuccess(res, 200, 'Reviews fetched successfully', { 
    reviews: property.reviews,
    averageRating: property.averageRating,
    numReviews: property.numReviews
  });
});

/**
 * @desc    Update a review
 * @route   PUT /api/properties/:id/reviews/:reviewId
 * @access  Private
 */
export const updatePropertyReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const { id, reviewId } = req.params;

  // Validate input
  if (!rating && !comment) {
    return sendError(res, 400, 'Please provide rating or comment to update');
  }

  // Find property
  const property = await Property.findById(id);
  
  if (!property) {
    return sendError(res, 404, 'Property not found');
  }

  // Find review
  const review = property.reviews.id(reviewId);
  
  if (!review) {
    return sendError(res, 404, 'Review not found');
  }

  // Check if user is the review owner
  if (review.user.toString() !== req.user._id.toString()) {
    return sendError(res, 403, 'Not authorized to update this review');
  }

  // Update review
  if (rating) review.rating = Number(rating);
  if (comment) review.comment = comment;

  // Update property review stats
  property.averageRating = property.reviews.reduce((acc, item) => item.rating + acc, 0) / property.reviews.length;

  // Save property with updated review
  await property.save();

  sendSuccess(res, 200, 'Review updated successfully', { review });
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/properties/:id/reviews/:reviewId
 * @access  Private
 */
export const deletePropertyReview = asyncHandler(async (req, res) => {
  const { id, reviewId } = req.params;

  // Find property
  const property = await Property.findById(id);
  
  if (!property) {
    return sendError(res, 404, 'Property not found');
  }

  // Find review
  const review = property.reviews.id(reviewId);
  
  if (!review) {
    return sendError(res, 404, 'Review not found');
  }

  // Check if user is the review owner or admin
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendError(res, 403, 'Not authorized to delete this review');
  }

  // Remove review
  property.reviews = property.reviews.filter(r => r._id.toString() !== reviewId);
  
  // Update property review stats
  property.numReviews = property.reviews.length;
  property.averageRating = property.reviews.length > 0
    ? property.reviews.reduce((acc, item) => item.rating + acc, 0) / property.reviews.length
    : 0;

  // Save property with review removed
  await property.save();

  sendSuccess(res, 200, 'Review deleted successfully');
});
