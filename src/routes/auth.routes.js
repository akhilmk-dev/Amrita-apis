import express from 'express';
import { login, loginDelivery, refreshToken } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, refreshTokenSchema } from '../validations/schemas.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

// Staff Login
router.post('/login', validate(loginSchema), login);

// Delivery Staff Login
router.post('/login/delivery', validate(loginSchema), loginDelivery);

// Refresh token endpoint
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

export default router;
