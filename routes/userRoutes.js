import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate, userSchemas } from '../middleware/validationMiddleware.js';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  updateUserRole,
  deleteUser
} from '../controllers/userController.js';

const router = express.Router();

// Public routes
router.post('/register', validate(userSchemas.register), registerUser);
router.post('/login', validate(userSchemas.login), loginUser);

// Protected routes (require authentication)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validate(userSchemas.updateProfile), updateUserProfile);

// Admin routes (require admin role)
router.get('/', protect, authorize('admin'), getUsers);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/:id', protect, authorize('admin'), deleteUser);

export default router;
