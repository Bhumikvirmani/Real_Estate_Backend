
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const agentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  license: {
    type: String,
    required: true,
    unique: true
  },
  company: {
    type: String
  },
  experience: {
    type: Number,
    default: 0
  },
  specialization: {
    type: String
  },
  areas: [{
    type: String
  }],
  bio: {
    type: String
  },
  verified: {
    type: Boolean,
    default: false
  },
  properties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  reviews: [reviewSchema],
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  profileImage: {
    type: String
  },
  coverImage: {
    type: String
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  }
}, {
  timestamps: true
});

// Calculate average rating when reviews are modified
agentSchema.pre('save', function(next) {
  if (this.reviews.length > 0) {
    this.rating = this.reviews.reduce((acc, item) => item.rating + acc, 0) / this.reviews.length;
    this.numReviews = this.reviews.length;
  }
  next();
});

const Agent = mongoose.model('Agent', agentSchema);
export default Agent;
