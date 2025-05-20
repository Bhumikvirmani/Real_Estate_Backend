
import express from 'express';
import Agent from '../models/agentModel.js';
import User from '../models/userModel.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { agentValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;
    
    const keyword = req.query.keyword
      ? {
          $or: [
            { company: { $regex: req.query.keyword, $options: 'i' } },
            { specialization: { $regex: req.query.keyword, $options: 'i' } },
            { areas: { $elemMatch: { $regex: req.query.keyword, $options: 'i' } } }
          ]
        }
      : {};
    
    const count = await Agent.countDocuments({ ...keyword });
    
    const agents = await Agent.find({ ...keyword })
      .populate('user', 'name email phone')
      .populate('properties')
      .sort({ rating: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));
    
    res.json({
      agents,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('properties');
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register as an agent (protected)
router.post('/register', protect, agentValidation, async (req, res) => {
  try {
    // Check if user is already registered as an agent
    const existingAgent = await Agent.findOne({ user: req.user._id });
    if (existingAgent) {
      return res.status(400).json({ message: 'User is already registered as an agent' });
    }
    
    const {
      license,
      company,
      experience,
      specialization,
      areas,
      bio,
      profileImage,
      coverImage,
      socialMedia
    } = req.body;
    
    const agent = new Agent({
      user: req.user._id,
      license,
      company,
      experience,
      specialization,
      areas: areas || [],
      bio,
      profileImage,
      coverImage,
      socialMedia: socialMedia || {}
    });
    
    const createdAgent = await agent.save();
    
    // Update user role to 'agent'
    await User.findByIdAndUpdate(req.user._id, { role: 'agent' });
    
    res.status(201).json(createdAgent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update agent profile (protected)
router.put('/profile', protect, async (req, res) => {
  try {
    const agent = await Agent.findOne({ user: req.user._id });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found' });
    }
    
    const {
      company,
      experience,
      specialization,
      areas,
      bio,
      profileImage,
      coverImage,
      socialMedia
    } = req.body;
    
    agent.company = company || agent.company;
    agent.experience = experience || agent.experience;
    agent.specialization = specialization || agent.specialization;
    agent.areas = areas || agent.areas;
    agent.bio = bio || agent.bio;
    agent.profileImage = profileImage || agent.profileImage;
    agent.coverImage = coverImage || agent.coverImage;
    agent.socialMedia = socialMedia || agent.socialMedia;
    
    const updatedAgent = await agent.save();
    res.json(updatedAgent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get agent reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json(agent.reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add review for agent (protected)
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }
    
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Check if user already reviewed this agent
    const alreadyReviewed = agent.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Agent already reviewed' });
    }
    
    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment
    };
    
    agent.reviews.push(review);
    await agent.save();
    
    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify agent (admin only)
router.put('/:id/verify', protect, authorize('admin'), async (req, res) => {
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

export default router;
