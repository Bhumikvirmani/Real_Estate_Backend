import express from 'express';
import Message from '../models/messageModel.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all messages for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('property', 'title images')
    .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a new message
router.post('/', protect, async (req, res) => {
  try {
    const { subject, message, phone, propertyId, recipient } = req.body;

    // Validate required fields
    if (!subject || !message || !propertyId || !recipient) {
      return res.status(400).json({
        message: 'Missing required fields. Subject, message, propertyId, and recipient are required.'
      });
    }

    const newMessage = new Message({
      subject,
      message,
      phone,
      property: propertyId, // Make sure propertyId is mapped to property field
      sender: req.user._id,
      recipient,
    });

    const savedMessage = await newMessage.save();

    const populatedMessage = await Message.findById(savedMessage._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email')
      .populate('property', 'title images');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark message as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only recipient can mark message as read
    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.read = true;
    await message.save();

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete message
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender or recipient can delete the message
    if (message.sender.toString() !== req.user._id.toString() &&
        message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await message.deleteOne();
    res.json({ message: 'Message removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread message count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversation between two users about a property
router.get('/conversation/:propertyId/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      property: req.params.propertyId,
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ]
    })
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('property', 'title images')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
