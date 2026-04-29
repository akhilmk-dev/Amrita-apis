import { Router } from 'express';
import * as rejectionReasonController from '../controllers/rejectionReason.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Rejection Reasons
 *   description: Management of task rejection reasons
 */

/**
 * @swagger
 * /api/v1/rejection-reasons:
 *   get:
 *     summary: Get all active rejection reasons
 *     tags: [Rejection Reasons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rejection reasons
 */
router.get('/', authMiddleware, rejectionReasonController.getAllReasons);

export default router;
