import User from '../models/userModel.js';
import Agent from '../models/agentModel.js';
import jwt from 'jsonwebtoken';
import { validate, userSchemas } from '../middleware/validationMiddleware.js';

/**
 * Generate JWT token for user authentication
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user with role if provided
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'user' // Use provided role or default to 'user'
    });

    if (user) {
      // Generate token
      const token = generateToken(user);

      // Set HTTP-only cookie with token
      if (process.env.NODE_ENV === 'production') {
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      // If the user registered as an agent, create a placeholder agent record
      // The user will need to complete their agent profile later
      if (user.role === 'agent') {
        try {
          // Create a basic agent record with minimal required fields
          const agent = new Agent({
            user: user._id,
            license: `TEMP-${Date.now()}`, // Temporary license number
            experience: 0,
            specialization: 'General',
            areas: ['Not specified'],
            bio: 'Agent profile pending completion'
          });

          await agent.save();
          console.log(`Created placeholder agent record for user ${user._id}`);
        } catch (agentError) {
          console.error('Error creating agent record:', agentError);
        }
      }

      // Return user data and token
      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || null
        },
        token
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/users/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Verify that the user's role matches the requested role
      if (role && user.role !== role) {
        return res.status(401).json({
          success: false,
          message: `You are not registered as a ${role}. Your account role is ${user.role}.`
        });
      }

      // Generate token
      const token = generateToken(user);

      // Set HTTP-only cookie with token in production
      if (process.env.NODE_ENV === 'production') {
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      res.json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || null,
          company: user.company || null,
          avatar: user.avatar || null
        },
        token
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user._id);

    if (user) {
      // If token needs to be refreshed, generate a new one
      let token = null;
      if (req.refreshToken) {
        token = generateToken(user);

        // Set HTTP-only cookie with new token in production
        if (process.env.NODE_ENV === 'production') {
          res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          });
        }
      }

      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        company: user.company || null,
        avatar: user.avatar || null,
        verified: user.verified,
        ...(token && { token }) // Include new token if refreshed
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update user fields if provided
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.company = req.body.company !== undefined ? req.body.company : user.company;
      user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;

      // Only update password if provided
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Save updated user
      const updatedUser = await user.save();

      // Generate new token with updated info
      const token = generateToken(updatedUser);

      // Set HTTP-only cookie with new token in production
      if (process.env.NODE_ENV === 'production') {
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone || null,
          company: updatedUser.company || null,
          avatar: updatedUser.avatar || null,
          verified: updatedUser.verified
        },
        token
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating user profile',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search and filtering
    const keyword = req.query.keyword
      ? {
          $or: [
            { name: { $regex: req.query.keyword, $options: 'i' } },
            { email: { $regex: req.query.keyword, $options: 'i' } }
          ]
        }
      : {};

    // Role filtering
    const roleFilter = req.query.role ? { role: req.query.role } : {};

    // Combine filters
    const filter = { ...keyword, ...roleFilter };

    // Count total users matching filter
    const count = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      users,
      page,
      pages: Math.ceil(count / limit),
      total: count
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Validate role
    if (!['user', 'agent', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user, agent, or admin'
      });
    }

    const user = await User.findById(req.params.id);

    if (user) {
      // Prevent changing own role (admin can't demote themselves)
      if (user._id.toString() === req.user._id.toString() && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own admin role'
        });
      }

      user.role = role;
      const updatedUser = await user.save();

      res.json({
        success: true,
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Update role error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating user role',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Prevent deleting own account
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own admin account'
        });
      }

      await user.deleteOne();

      res.json({
        success: true,
        message: 'User removed successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
};
