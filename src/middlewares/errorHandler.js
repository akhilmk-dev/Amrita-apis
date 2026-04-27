import { errorResponse } from '../utils/response.utils.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || null;

  // Log error stack trace in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${statusCode} - ${message}`);
    console.error(err.stack);
  }

  return errorResponse(res, message, statusCode, errors);
};
