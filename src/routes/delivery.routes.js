import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import * as shiftController from '../controllers/shift.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Delivery App
 *   description: APIs for delivery staff to manage their tasks and shifts
 */

// --- Shift / Taping (Delivery Staff Only) ---

/**
 * @swagger
 * /api/v1/delivery/tap-status:
 *   get:
 *     summary: Get available actions for the current staff based on shift state
 *     tags: [Delivery App]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available actions (shift_start, break_start, etc.)
 */
router.get('/tap-status', authMiddleware, checkPermission('delivery', 'tap'), shiftController.getTapStatus);

/**
 * @swagger
 * /api/v1/delivery/tap:
 *   post:
 *     summary: Record a bay tap event (shift/break start/end)
 *     tags: [Delivery App]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bay_id, event_type]
 *             properties:
 *               bay_id:
 *                 type: integer
 *               event_type:
 *                 type: string
 *                 enum: [shift_start, break_start, break_end, shift_end]
 *     responses:
 *       200:
 *         description: Event processed successfully
 */
router.post('/tap', authMiddleware, checkPermission('delivery', 'tap'), shiftController.handleTap);


// --- Task Actions ---

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
router.post('/tasks/:id/accept', authMiddleware, checkPermission('delivery', 'accept_reject'), taskController.acceptTask);

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
router.post('/tasks/:id/reject', authMiddleware, checkPermission('delivery', 'accept_reject'), taskController.rejectTask);

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
router.post('/tasks/:id/pickup', authMiddleware, checkPermission('delivery', 'update_own'), taskController.pickupTask);

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
router.post('/tasks/:id/complete', authMiddleware, checkPermission('delivery', 'update_own'), taskController.completeTask);

export default router;
