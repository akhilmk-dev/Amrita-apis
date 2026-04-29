import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Delivery App
 *   description: APIs for delivery staff to manage their tasks
 */

/**
 * @swagger
 * /api/v1/delivery/tasks/{id}/accept:
 *   post:
 *     summary: Accept a task assignment (Delivery Staff)
 *     tags: [Delivery App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task accepted
 */
router.post('/:id/accept', authMiddleware, checkPermission('delivery', 'accept_reject'), taskController.acceptTask);

/**
 * @swagger
 * /api/v1/delivery/tasks/{id}/reject:
 *   post:
 *     summary: Reject a task assignment (Delivery Staff)
 *     tags: [Delivery App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejection_reason_id:
 *                 type: integer
 *               rejection_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task rejected
 */
router.post('/:id/reject', authMiddleware, checkPermission('delivery', 'accept_reject'), taskController.rejectTask);

/**
 * @swagger
 * /api/v1/delivery/tasks/{id}/pickup:
 *   post:
 *     summary: Mark task as picked up (Delivery Staff)
 *     tags: [Delivery App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task picked up
 */
router.post('/:id/pickup', authMiddleware, checkPermission('delivery', 'update_own'), taskController.pickupTask);

/**
 * @swagger
 * /api/v1/delivery/tasks/{id}/complete:
 *   post:
 *     summary: Mark task as completed (Delivery Staff)
 *     tags: [Delivery App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task completed
 */
router.post('/:id/complete', authMiddleware, checkPermission('delivery', 'update_own'), taskController.completeTask);

export default router;
