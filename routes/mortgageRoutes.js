import express from 'express';
import { validate } from '../middleware/validationMiddleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
export const mortgageSchemas = {
  calculate: Joi.object({
    principal: Joi.number().positive().required()
      .messages({
        'number.base': 'Principal must be a number',
        'number.positive': 'Principal must be a positive number',
        'any.required': 'Principal is required'
      }),
    interestRate: Joi.number().min(0).required()
      .messages({
        'number.base': 'Interest rate must be a number',
        'number.min': 'Interest rate cannot be negative',
        'any.required': 'Interest rate is required'
      }),
    loanTerm: Joi.number().integer().positive().required()
      .messages({
        'number.base': 'Loan term must be a number',
        'number.integer': 'Loan term must be an integer',
        'number.positive': 'Loan term must be a positive number',
        'any.required': 'Loan term is required'
      })
  }),

  affordability: Joi.object({
    annualIncome: Joi.number().positive().required()
      .messages({
        'number.base': 'Annual income must be a number',
        'number.positive': 'Annual income must be a positive number',
        'any.required': 'Annual income is required'
      }),
    monthlyDebts: Joi.number().min(0).required()
      .messages({
        'number.base': 'Monthly debts must be a number',
        'number.min': 'Monthly debts cannot be negative',
        'any.required': 'Monthly debts are required'
      }),
    downPayment: Joi.number().min(0).required()
      .messages({
        'number.base': 'Down payment must be a number',
        'number.min': 'Down payment cannot be negative',
        'any.required': 'Down payment is required'
      }),
    interestRate: Joi.number().min(0).required()
      .messages({
        'number.base': 'Interest rate must be a number',
        'number.min': 'Interest rate cannot be negative',
        'any.required': 'Interest rate is required'
      }),
    loanTerm: Joi.number().integer().positive().required()
      .messages({
        'number.base': 'Loan term must be a number',
        'number.integer': 'Loan term must be an integer',
        'number.positive': 'Loan term must be a positive number',
        'any.required': 'Loan term is required'
      }),
    propertyTaxRate: Joi.number().min(0).required()
      .messages({
        'number.base': 'Property tax rate must be a number',
        'number.min': 'Property tax rate cannot be negative',
        'any.required': 'Property tax rate is required'
      }),
    insuranceRate: Joi.number().min(0).required()
      .messages({
        'number.base': 'Insurance rate must be a number',
        'number.min': 'Insurance rate cannot be negative',
        'any.required': 'Insurance rate is required'
      })
  }),

  comparison: Joi.object({
    loanOptions: Joi.array().items(
      Joi.object({
        amount: Joi.number().positive().required()
          .messages({
            'number.base': 'Loan amount must be a number',
            'number.positive': 'Loan amount must be a positive number',
            'any.required': 'Loan amount is required'
          }),
        interestRate: Joi.number().min(0).required()
          .messages({
            'number.base': 'Interest rate must be a number',
            'number.min': 'Interest rate cannot be negative',
            'any.required': 'Interest rate is required'
          }),
        term: Joi.number().integer().positive().required()
          .messages({
            'number.base': 'Loan term must be a number',
            'number.integer': 'Loan term must be an integer',
            'number.positive': 'Loan term must be a positive number',
            'any.required': 'Loan term is required'
          }),
        type: Joi.string().required()
          .messages({
            'string.base': 'Loan type must be a string',
            'any.required': 'Loan type is required'
          }),
        points: Joi.number().min(0).required()
          .messages({
            'number.base': 'Points must be a number',
            'number.min': 'Points cannot be negative',
            'any.required': 'Points are required'
          }),
        fees: Joi.number().min(0).required()
          .messages({
            'number.base': 'Fees must be a number',
            'number.min': 'Fees cannot be negative',
            'any.required': 'Fees are required'
          })
      })
    ).min(1).max(3).required()
      .messages({
        'array.min': 'At least one loan option is required',
        'array.max': 'Maximum of three loan options allowed',
        'any.required': 'Loan options are required'
      })
  })
};

// Calculate mortgage payment
router.post('/calculate', validate(mortgageSchemas.calculate), (req, res) => {
  try {
    const { principal, interestRate, loanTerm } = req.body;

    // Convert annual interest rate to monthly rate
    const monthlyInterestRate = interestRate / 100 / 12;

    // Convert loan term to months
    const loanTermMonths = loanTerm * 12;

    let monthlyPayment, totalPayment, totalInterest;

    // Calculate monthly payment using mortgage formula
    if (monthlyInterestRate === 0) {
      // Simple division if interest rate is zero
      monthlyPayment = principal / loanTermMonths;
      totalPayment = principal;
      totalInterest = 0;
    } else {
      monthlyPayment = principal *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) /
        (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1);

      totalPayment = monthlyPayment * loanTermMonths;
      totalInterest = totalPayment - principal;
    }

    // Generate amortization schedule (first 12 months and last month)
    const amortizationSchedule = [];
    let remainingBalance = principal;

    for (let month = 1; month <= loanTermMonths; month++) {
      const interestPayment = remainingBalance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      // Add to schedule if it's in the first 12 months, last month, or every 12th month
      if (month <= 12 || month === loanTermMonths || month % 12 === 0) {
        amortizationSchedule.push({
          month,
          payment: monthlyPayment,
          principalPayment,
          interestPayment,
          remainingBalance: Math.max(0, remainingBalance) // Ensure non-negative
        });
      }
    }

    res.json({
      success: true,
      results: {
        monthlyPayment,
        totalPayment,
        totalInterest,
        amortizationSchedule
      }
    });
  } catch (error) {
    console.error('Error calculating mortgage:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating mortgage'
    });
  }
});

// Calculate affordability
router.post('/affordability', validate(mortgageSchemas.affordability), (req, res) => {
  try {
    const {
      annualIncome,
      monthlyDebts,
      downPayment,
      interestRate,
      loanTerm,
      propertyTaxRate,
      insuranceRate
    } = req.body;

    // Monthly income
    const monthlyIncome = annualIncome / 12;

    // Maximum recommended housing payment (28% of monthly income)
    const maxHousingPayment = monthlyIncome * 0.28;

    // Maximum total debt payment (36% of monthly income)
    const maxTotalDebtPayment = monthlyIncome * 0.36;

    // Available payment for housing after other debts
    const availableForHousing = Math.min(
      maxHousingPayment,
      maxTotalDebtPayment - monthlyDebts
    );

    // Monthly interest rate
    const monthlyInterestRate = interestRate / 100 / 12;

    // Loan term in months
    const loanTermMonths = loanTerm * 12;

    // Calculate maximum loan amount using mortgage formula
    let maxLoanAmount;
    if (monthlyInterestRate === 0) {
      maxLoanAmount = availableForHousing * loanTermMonths;
    } else {
      maxLoanAmount = availableForHousing /
        (
          (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) /
          (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1) +
          (propertyTaxRate / 100 / 12) +
          (insuranceRate / 100 / 12)
        );
    }

    // Maximum home price = loan amount + down payment
    const maxHomePrice = maxLoanAmount + downPayment;

    // Calculate monthly payment breakdown
    const loanAmount = maxHomePrice - downPayment;

    let principalAndInterest;
    if (monthlyInterestRate === 0) {
      principalAndInterest = loanAmount / loanTermMonths;
    } else {
      principalAndInterest = loanAmount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) /
        (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1);
    }

    const monthlyTaxes = (maxHomePrice * propertyTaxRate / 100) / 12;
    const monthlyInsurance = (maxHomePrice * insuranceRate / 100) / 12;
    const totalMonthlyPayment = principalAndInterest + monthlyTaxes + monthlyInsurance;

    // Calculate debt-to-income ratio
    const dti = ((totalMonthlyPayment + monthlyDebts) / monthlyIncome) * 100;

    res.json({
      success: true,
      results: {
        maxHomePrice,
        monthlyPayment: totalMonthlyPayment,
        paymentBreakdown: {
          principalAndInterest,
          taxes: monthlyTaxes,
          insurance: monthlyInsurance
        },
        debtToIncomeRatio: dti
      }
    });
  } catch (error) {
    console.error('Error calculating affordability:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating affordability'
    });
  }
});

// Compare loan options
router.post('/compare', validate(mortgageSchemas.comparison), (req, res) => {
  try {
    const { loanOptions } = req.body;

    const results = loanOptions.map(option => {
      const { amount, interestRate, term, type, points, fees } = option;

      // Calculate points cost
      const pointsCost = (points / 100) * amount;

      // Calculate monthly payment
      const monthlyInterestRate = interestRate / 100 / 12;
      const loanTermMonths = term * 12;

      let monthlyPayment;
      if (monthlyInterestRate === 0) {
        monthlyPayment = amount / loanTermMonths;
      } else {
        monthlyPayment = amount *
          (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) /
          (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1);
      }

      // Calculate total interest
      const totalPayments = monthlyPayment * loanTermMonths;
      const totalInterest = totalPayments - amount;

      // Calculate total cost (loan + interest + points + fees)
      const totalCost = amount + totalInterest + pointsCost + fees;

      return {
        ...option,
        monthlyPayment,
        totalInterest,
        totalCost
      };
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error comparing loans:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing loans'
    });
  }
});

export default router;
