import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Administrator overview and statistics
 */

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [today, weekly, monthly]
 *           default: today
 *         description: Time range filter for task statistics
 *     responses:
 *       200:
 *         description: Dashboard data including counts, available staff, and recent tasks
 */
router.get('/stats', authMiddleware, checkPermission('dashboard', 'view'), dashboardController.getDashboardStats);

export default router;
