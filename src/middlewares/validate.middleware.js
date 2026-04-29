import { z } from 'zod';
import { ApiError } from '../utils/response.utils.js';

/**
 * Middleware to validate request data against a Zod schema
 * @param {import('zod').ZodSchema} schema 
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => ({
        field: err.path.length > 1 ? err.path[1] : err.path[0],
        message: err.message,
      }));
      return next(new ApiError('Validation Error', 400, errors));
    }
    next(error);
  }
};
