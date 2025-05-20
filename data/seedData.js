import mongoose from 'mongoose';
import Property from '../models/Property.js';

const sampleProperties = [
  {
    type: 'House',
    location: {
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    price: 500000,
    images: ['https://example.com/image1.jpg'],
    features: {
      bedrooms: 3,
      bathrooms: 2,
      area: 2000
    }
  },
  {
    type: 'Apartment',
    location: {
      address: '456 Park Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001'
    },
    price: 300000,
    images: ['https://example.com/image2.jpg'],
    features: {
      bedrooms: 2,
      bathrooms: 1,
      area: 1200
    }
  }
];

export const seedDatabase = async () => {
  try {
    await Property.deleteMany({});
    await Property.insertMany(sampleProperties);
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};