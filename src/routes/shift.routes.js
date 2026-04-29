import { Router } from 'express';
import * as shiftController from '../controllers/shift.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Staff Shifts
 *   description: Shift and break management via QR/Bay taps
 */

/**
 * @swagger
 * /api/v1/staff-shifts/tap-status:
 *   get:
 *     summary: Get available actions for the current staff based on shift state
 *     tags: [Staff Shifts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available actions (shift_start, break_start, etc.)
 */
router.get('/tap-status', authMiddleware, shiftController.getTapStatus);

/**
 * @swagger
 * /api/v1/staff-shifts/tap:
 *   post:
 *     summary: Record a bay tap event (shift/break start/end)
 *     tags: [Staff Shifts]
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
router.post('/tap', authMiddleware, shiftController.handleTap);

export default router;
