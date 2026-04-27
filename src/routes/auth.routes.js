import express from 'express';
import { login, loginDelivery, refreshToken } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication management
 */

// Staff Login
router.post('/login', login);

// Delivery Staff Login
router.post('/login/delivery', loginDelivery);

// Refresh token endpoint
router.post('/refresh', refreshToken);

export default router;
