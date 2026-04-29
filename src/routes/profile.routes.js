import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadProfileImage } from '../middlewares/upload.middleware.js';
import { updateProfileSchema, changePasswordSchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Self-service profile management for all users
 */

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details retrieved successfully
 */
router.get('/', authMiddleware, profileController.getProfile);

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     summary: Update own profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               profile_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Email already in use or validation error
 */
router.put('/', authMiddleware, uploadProfileImage.single('profile_image'), validate(updateProfileSchema), profileController.updateProfile);

/**
 * @swagger
 * /api/v1/profile/change-password:
 *   post:
 *     summary: Change own password
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [old_password, new_password]
 *             properties:
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Incorrect old password
 */
router.post('/change-password', authMiddleware, validate(changePasswordSchema), profileController.changePassword);

export default router;
