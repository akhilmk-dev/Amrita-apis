import { Router } from 'express';
import * as staffBayController from '../controllers/staffBay.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { staffBaySchema, paginationQuerySchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Staff Bays
 *   description: Staff Bay management
 */

/**
 * @swagger
 * /api/v1/staff-bays:
 *   get:
 *     summary: Get all staff bays
 *     tags: [Staff Bays]
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
 *     responses:
 *       200:
 *         description: List of staff bays with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StaffBay'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *   post:
 *     summary: Create a new staff bay
 *     tags: [Staff Bays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [floor_id, name]
 *             properties:
 *               floor_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Staff bay created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/StaffBay' */
router.get('/', authMiddleware, checkPermission('staff_bays', 'view'), validate(paginationQuerySchema), staffBayController.getAllBays);
router.post('/', authMiddleware, checkPermission('staff_bays', 'add'), validate(staffBaySchema), staffBayController.createBay);

/**
 * @swagger
 * /api/v1/staff-bays/{id}:
 *   get:
 *     summary: Get staff bay by ID or QR Code (Public for scanning)
 *     tags: [Staff Bays]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff Bay ID or QR Code identifier
 *     responses:
 *       200:
 *         description: Staff bay details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/StaffBay'
 *   put:
 *     summary: Update staff bay
 *     tags: [Staff Bays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               floor_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Staff bay updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/StaffBay'
 *   delete:
 *     summary: Delete/Deactivate staff bay
 *     tags: [Staff Bays]
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
 *         description: Staff bay deactivated
 */
router.get('/:id', staffBayController.getBayById);
router.put('/:id', authMiddleware, checkPermission('staff_bays', 'edit'), validate(staffBaySchema), staffBayController.updateBay);
router.delete('/:id', authMiddleware, checkPermission('staff_bays', 'delete'), staffBayController.deleteBay);

export default router;
