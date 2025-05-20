import Property from '../models/propertyModel.js';
import User from '../models/userModel.js';
import Agent from '../models/agentModel.js';
import {
  sendSuccess,
  sendError,
  asyncHandler,
  getPaginationParams,
  getSortParams,
  createFilterFromQuery
} from '../utils/apiUtils.js';

// Fields allowed for filtering in property queries
const ALLOWED_FILTER_FIELDS = [
  'type', 'status', 'featured', 'verified',
  'minPrice', 'maxPrice', 'location.city', 'location.state'
];

/**
 * @desc    Get all properties with filtering, sorting, and pagination
 * @route   GET /api/properties
 * @access  Public
 */
export const getProperties = asyncHandler(async (req, res) => {
  // Get pagination parameters
  const { page, limit, skip } = getPaginationParams(req.query);

  // Create filter from query parameters
  const filter = createFilterFromQuery(req.query, ALLOWED_FILTER_FIELDS);

  // Handle keyword search
  if (req.query.keyword) {
    filter.$or = [
      { title: { $regex: req.query.keyword, $options: 'i' } },
      { description: { $regex: req.query.keyword, $options: 'i' } },
      { 'location.address': { $regex: req.query.keyword, $options: 'i' } },
      { 'location.city': { $regex: req.query.keyword, $options: 'i' } }
    ];
  }

  // Get sort parameters
  const sort = getSortParams(req.query, { featured: -1, createdAt: -1 });

  // Count total properties matching filter
  const count = await Property.countDocuments(filter);

  // Get properties with pagination, sorting, and populate owner
  const properties = await Property.find(filter)
    .populate('owner', 'name email phone')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  sendSuccess(res, 200, 'Properties fetched successfully', {
    properties,
    page,
    pages: Math.ceil(count / limit),
    total: count
  });
});

/**
 * @desc    Get property by ID
 * @route   GET /api/properties/:id
 * @access  Public
 */
export const getPropertyById = asyncHandler(async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone company')
      .populate('reviews.user', 'name avatar');

    if (!property) {
      return sendError(res, 404, 'Property not found');
    }

    // Increment views count
    property.views += 1;
    await property.save();

    sendSuccess(res, 200, 'Property fetched successfully', { property });
  } catch (error) {
    console.error('Error fetching property:', error);
    sendError(res, 500, error.message || 'Error fetching property');
  }
});

/**
 * @desc    Create a new property
 * @route   POST /api/properties
 * @access  Private
 */
export const createProperty = asyncHandler(async (req, res) => {
  // Create property with owner set to current user
  const property = new Property({
    ...req.body,
    owner: req.user._id
  });

  // Save the property
  const createdProperty = await property.save();

  // If user is an agent, add property to their properties list
  const agent = await Agent.findOne({ user: req.user._id });
  if (agent) {
    agent.properties.push(createdProperty._id);
    await agent.save();
  }

  sendSuccess(res, 201, 'Property created successfully', { property: createdProperty });
});

/**
 * @desc    Update a property
 * @route   PUT /api/properties/:id
 * @access  Private (Owner or Admin)
 */
export const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return sendError(res, 404, 'Property not found');
  }

  // Check if user is owner or admin
  if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendError(res, 403, 'Not authorized to update this property');
  }

  // Update property fields
  Object.keys(req.body).forEach(key => {
    // Don't update owner field
    if (key !== 'owner') {
      property[key] = req.body[key];
    }
  });

  // Save updated property
  const updatedProperty = await property.save();

  sendSuccess(res, 200, 'Property updated successfully', { property: updatedProperty });
});

/**
 * @desc    Delete a property
 * @route   DELETE /api/properties/:id
 * @access  Private (Owner or Admin)
 */
export const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return sendError(res, 404, 'Property not found');
  }

  // Check if user is owner or admin
  if (property.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return sendError(res, 403, 'Not authorized to delete this property');
  }

  // Remove property
  await property.deleteOne();

  // If user is an agent, remove property from their properties list
  const agent = await Agent.findOne({ user: req.user._id });
  if (agent) {
    agent.properties = agent.properties.filter(
      p => p.toString() !== req.params.id
    );
    await agent.save();
  }

  sendSuccess(res, 200, 'Property deleted successfully');
});

/**
 * @desc    Get user's properties
 * @route   GET /api/properties/user
 * @access  Private
 */
export const getUserProperties = asyncHandler(async (req, res) => {
  // Get pagination parameters
  const { page, limit, skip } = getPaginationParams(req.query);

  // Count total properties owned by user
  const count = await Property.countDocuments({ owner: req.user._id });

  // Get properties with pagination and sorting
  const properties = await Property.find({ owner: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  sendSuccess(res, 200, 'User properties fetched successfully', {
    properties,
    page,
    pages: Math.ceil(count / limit),
    total: count
  });
});

/**
 * @desc    Get property categories count
 * @route   GET /api/properties/categories
 * @access  Public
 */
export const getPropertyCategories = asyncHandler(async (req, res) => {
  const categories = await Property.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        name: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);

  sendSuccess(res, 200, 'Property categories fetched successfully', { categories });
});
