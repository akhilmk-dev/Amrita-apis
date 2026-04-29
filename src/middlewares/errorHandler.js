import { errorResponse } from '../utils/response.utils.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Prisma Unique Constraint Errors
  if (err.code === 'P2002') {
    statusCode = 400;
    message = 'Validation Error';
    const field = err.meta?.target || 'field';
    errors = [{
      field: field.split('_').pop() || field,
      message: `${field} already exists`
    }];
  }

  // Log error stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${statusCode} - ${message}`);
    console.error(err.stack);
  }

  return errorResponse(res, message, statusCode, errors);
};
