import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { paginationQuerySchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Real-time and push notification management
 */

/**
 * @swagger
 * /api/v1/notifications/stream:
 *   get:
 *     summary: SSE stream for real-time notifications (Admin Web Panel)
 *     tags: [Notifications]
 *     description: >
 *       Opens a persistent Server-Sent Events (SSE) connection.
 *       Use `@microsoft/fetch-event-source` in React with the `Authorization` header.
 *       The server sends a heartbeat comment every 30 seconds to keep the connection alive.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSE stream opened successfully
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/stream', authMiddleware, notificationController.streamNotifications);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get notifications for the logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter to show only unread notifications
 *     responses:
 *       200:
 *         description: Paginated notification list with unread_count
 */
router.get('/', authMiddleware, validate(paginationQuerySchema), notificationController.getNotifications);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', authMiddleware, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID (BigInt as string)
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', authMiddleware, notificationController.markAsRead);

export default router;
