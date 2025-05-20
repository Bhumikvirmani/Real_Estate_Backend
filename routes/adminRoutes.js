
import express from 'express';
import User from '../models/userModel.js';
import Property from '../models/propertyModel.js';
import Agent from '../models/agentModel.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to ensure admin access
router.use(protect, authorize('admin'));

// Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const propertyCount = await Property.countDocuments();
    const agentCount = await Agent.countDocuments();
    
    // Count new users and properties in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const newProperties = await Property.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Count properties by type
    const propertiesByType = await Property.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Count properties by status
    const propertiesByStatus = await Property.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    res.json({
      userCount,
      propertyCount,
      agentCount,
      newUsers,
      newProperties,
      propertiesByType,
      propertiesByStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all properties (admin view)
router.get('/properties', async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    
    const count = await Property.countDocuments();
    const properties = await Property.find()
      .populate('owner', 'name email')
      .sort('-createdAt')
      .limit(pageSize)
      .skip(pageSize * (page - 1));
    
    res.json({
      properties,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending agent verifications
router.get('/agents/pending', async (req, res) => {
  try {
    const pendingAgents = await Agent.find({ verified: false })
      .populate('user', 'name email phone')
      .sort('-createdAt');
    
    res.json(pendingAgents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify an agent
router.put('/agents/:id/verify', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    agent.verified = true;
    await agent.save();
    
    res.json({ message: 'Agent verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a property
router.delete('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    await property.deleteOne();
    res.json({ message: 'Property removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
