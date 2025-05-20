import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const propertySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: {
      values: ['house', 'apartment', 'condo', 'villa', 'land'],
      message: '{VALUE} is not a valid property type'
    },
    lowercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: String
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['for sale', 'for rent', 'sold', 'rented'],
      message: '{VALUE} is not a valid property status'
    },
    lowercase: true,
    default: 'for sale'
  },
  features: {
    bedrooms: {
      type: Number,
      min: [0, 'Number of bedrooms cannot be negative']
    },
    bathrooms: {
      type: Number,
      min: [0, 'Number of bathrooms cannot be negative']
    },
    area: {
      type: Number,
      min: [0, 'Area cannot be negative']
    },
    furnished: Boolean,
    parking: Boolean,
    yearBuilt: Number
  },
  amenities: [String],
  images: [String],
  featured: {
    type: Boolean,
    default: false
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
    }
  ],
  averageRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

propertySchema.plugin(mongoosePaginate);

// Prevent model recompilation error
const Property = mongoose.models.Property || mongoose.model('Property', propertySchema);

export default Property;
