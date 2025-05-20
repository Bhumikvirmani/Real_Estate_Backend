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
    enum: ['House', 'Apartment', 'Condo', 'Villa', 'Land']
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
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['For Sale', 'For Rent', 'Sold', 'Rented'],
    default: 'For Sale'
  },
  features: {
    bedrooms: Number,
    bathrooms: Number,
    area: Number,
    furnished: Boolean,
    parking: Boolean,
    yearBuilt: Number
  },
  amenities: [String],
  images: [String],
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

propertySchema.plugin(mongoosePaginate);
export default mongoose.model('Property', propertySchema);