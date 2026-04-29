import { Router } from 'express';
import * as staffController from '../controllers/staff.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { paginationQuerySchema, createDeliveryStaffSchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Staff management and availability
 */

/**
 * @swagger
 * /api/v1/staff/available:
 *   get:
 *     summary: Get all available delivery staff
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available staff
 */

/**
 * @swagger
 * /api/v1/staff/delivery-agents:
 *   get:
 *     summary: Get all delivery staff (Admin)
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, employee ID, email or phone
 *     responses:
 *       200:
 *         description: List of delivery agents with status
 */
router.get('/delivery-agents', authMiddleware, checkPermission('staff', 'view'), validate(paginationQuerySchema), staffController.getAllDeliveryStaff);

router.get('/available', authMiddleware, checkPermission('staff', 'view'), staffController.getAvailableStaff);

/**
 * @swagger
 * /api/v1/staff:
 *   post:
 *     summary: Create a new delivery staff
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *               employee_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Delivery staff created successfully
 *       400:
 *         description: Validation error or Email/Employee ID exists
 *       403:
 *         description: Forbidden
 */
router.post('/', authMiddleware, checkPermission('staff', 'create'), validate(createDeliveryStaffSchema), staffController.createDeliveryStaff);

export default router;
