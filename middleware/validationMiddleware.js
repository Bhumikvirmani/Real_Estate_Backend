import Joi from 'joi';

/**
 * Validation schemas for different API endpoints
 */

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    name: Joi.string().required().min(2).max(50)
      .messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    email: Joi.string().required().email()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().required().min(6)
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long'
      }),
    phone: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    avatar: Joi.string().allow('', null)
  }),

  login: Joi.object({
    email: Joi.string().required().email()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password is required'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50)
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    email: Joi.string().email()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().min(6).allow('', null)
      .messages({
        'string.min': 'Password must be at least 6 characters long'
      }),
    phone: Joi.string().allow('', null),
    company: Joi.string().allow('', null),
    avatar: Joi.string().allow('', null)
  })
};

// Property validation schemas
export const propertySchemas = {
  create: Joi.object({
    title: Joi.string().required().min(5).max(100)
      .messages({
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters'
      }),
    description: Joi.string().required().min(20)
      .messages({
        'string.empty': 'Description is required',
        'string.min': 'Description must be at least 20 characters long'
      }),
    type: Joi.string().required().valid('house', 'apartment', 'condo', 'villa', 'land')
      .messages({
        'string.empty': 'Property type is required',
        'any.only': 'Property type must be one of: house, apartment, condo, villa, land'
      }),
    location: Joi.object({
      address: Joi.string().required()
        .messages({
          'string.empty': 'Address is required'
        }),
      city: Joi.string().required()
        .messages({
          'string.empty': 'City is required'
        }),
      state: Joi.string().required()
        .messages({
          'string.empty': 'State is required'
        }),
      zipCode: Joi.string().allow('', null),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      })
    }).required(),
    price: Joi.number().required().min(0)
      .messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price cannot be negative'
      }),
    status: Joi.string().required().valid('for sale', 'for rent', 'sold', 'rented')
      .messages({
        'string.empty': 'Status is required',
        'any.only': 'Status must be one of: for sale, for rent, sold, rented'
      }),
    features: Joi.object({
      bedrooms: Joi.number().min(0),
      bathrooms: Joi.number().min(0),
      area: Joi.number().min(0).required()
        .messages({
          'number.min': 'Area cannot be negative',
          'any.required': 'Area is required'
        }),
      furnished: Joi.boolean(),
      parking: Joi.boolean(),
      yearBuilt: Joi.number().min(1800).max(new Date().getFullYear()),
      airConditioning: Joi.boolean(),
      garden: Joi.boolean(),
      gym: Joi.boolean(),
      swimmingPool: Joi.boolean(),
      security: Joi.boolean(),
      elevator: Joi.boolean()
    }).required(),
    amenities: Joi.array().items(Joi.string()),
    images: Joi.array().items(Joi.string()).min(1)
      .messages({
        'array.min': 'At least one image is required'
      }),
    availableFrom: Joi.date().min('now'),
    featured: Joi.boolean(),
    verified: Joi.boolean()
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(100)
      .messages({
        'string.min': 'Title must be at least 5 characters long',
        'string.max': 'Title cannot exceed 100 characters'
      }),
    description: Joi.string().min(20)
      .messages({
        'string.min': 'Description must be at least 20 characters long'
      }),
    type: Joi.string().valid('house', 'apartment', 'condo', 'villa', 'land')
      .messages({
        'any.only': 'Property type must be one of: house, apartment, condo, villa, land'
      }),
    location: Joi.object({
      address: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string().allow('', null),
      coordinates: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      })
    }),
    price: Joi.number().min(0)
      .messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price cannot be negative'
      }),
    status: Joi.string().valid('for sale', 'for rent', 'sold', 'rented')
      .messages({
        'any.only': 'Status must be one of: for sale, for rent, sold, rented'
      }),
    features: Joi.object({
      bedrooms: Joi.number().min(0),
      bathrooms: Joi.number().min(0),
      area: Joi.number().min(0),
      furnished: Joi.boolean(),
      parking: Joi.boolean(),
      yearBuilt: Joi.number().min(1800).max(new Date().getFullYear()),
      airConditioning: Joi.boolean(),
      garden: Joi.boolean(),
      gym: Joi.boolean(),
      swimmingPool: Joi.boolean(),
      security: Joi.boolean(),
      elevator: Joi.boolean()
    }),
    amenities: Joi.array().items(Joi.string()),
    images: Joi.array().items(Joi.string()),
    availableFrom: Joi.date().min('now'),
    featured: Joi.boolean(),
    verified: Joi.boolean()
  })
};

// Agent validation schemas
export const agentSchemas = {
  create: Joi.object({
    license: Joi.string().required()
      .messages({
        'string.empty': 'License number is required'
      }),
    company: Joi.string().allow('', null),
    experience: Joi.number().min(0).required()
      .messages({
        'number.min': 'Experience years cannot be negative',
        'any.required': 'Years of experience is required'
      }),
    specialization: Joi.string().required()
      .messages({
        'string.empty': 'Specialization is required'
      }),
    areas: Joi.array().items(Joi.string()).min(1)
      .messages({
        'array.min': 'At least one area is required'
      }),
    bio: Joi.string().min(50)
      .messages({
        'string.min': 'Bio must be at least 50 characters long'
      }),
    profileImage: Joi.string().allow('', null),
    coverImage: Joi.string().allow('', null),
    socialMedia: Joi.object({
      facebook: Joi.string().allow('', null),
      twitter: Joi.string().allow('', null),
      instagram: Joi.string().allow('', null),
      linkedin: Joi.string().allow('', null)
    })
  })
};

/**
 * Middleware factory to validate request data against a schema
 * @param {Object} schema - Joi schema to validate against
 * @param {String} property - Request property to validate (body, query, params)
 * @returns {Function} Express middleware function
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      // Convert string values to their appropriate types when possible
      convert: true
    });

    if (!error) {
      return next();
    }

    const errors = {};

    // Format validation errors into a more usable object
    error.details.forEach((detail) => {
      const path = detail.path.join('.');
      errors[path] = detail.message;
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  };
};

// Agent validation middleware
export const agentValidation = validate(agentSchemas.create);
