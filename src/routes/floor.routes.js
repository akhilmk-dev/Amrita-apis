import { Router } from 'express';
import * as floorController from '../controllers/floor.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { floorSchema, paginationQuerySchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Panel
 *   description: Administrative management APIs
 */

/**
 * @swagger
 * /api/v1/floors:
 *   get:
 *     summary: Get all floors
 *     tags: [Admin Panel]
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
 *         description: List of floors with pagination metadata
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
 *                         $ref: '#/components/schemas/Floor'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Missing permissions)
 *   post:
 *     summary: Create a new floor
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FloorCreateRequest'
 *     responses:
 *       201:
 *         description: Floor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Floor created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Floor'
 *       400:
 *         description: Bad Request (Validation error or duplicate floor number for the tower)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tower not found
 */
router.get('/', authMiddleware, checkPermission('floors', 'view'), validate(paginationQuerySchema), floorController.getAllFloors);
router.post('/', authMiddleware, checkPermission('floors', 'add'), validate(floorSchema), floorController.createFloor);

/**
 * @swagger
 * /api/v1/floors/{id}:
 *   get:
 *     summary: Get floor by ID
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Floor retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Floor'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Floor not found
 *   put:
 *     summary: Update floor
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FloorUpdateRequest'
 *     responses:
 *       200:
 *         description: Floor updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Floor updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Floor'
 *       400:
 *         description: Bad Request (Validation error or duplicate floor number for the tower)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Floor or Tower not found
 *   delete:
 *     summary: Delete/Deactivate floor
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Floor deactivated successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Floor not found
 */
router.get('/:id', authMiddleware, checkPermission('floors', 'view'), floorController.getFloorById);
router.put('/:id', authMiddleware, checkPermission('floors', 'edit'), validate(floorSchema), floorController.updateFloor);
router.delete('/:id', authMiddleware, checkPermission('floors', 'delete'), floorController.deleteFloor);

export default router;
