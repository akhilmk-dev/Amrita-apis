import { Router } from 'express';
import * as locationController from '../controllers/location.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { locationSchema, paginationQuerySchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * /api/v1/locations:
 *   get:
 *     summary: Get all locations
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
 *         description: List of locations with pagination metadata
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
 *                         $ref: '#/components/schemas/Location'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   post:
 *     summary: Create a new location
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationCreateRequest'
 *     responses:
 *       201:
 *         description: Location created successfully
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
 *                   example: "Location created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       400:
 *         description: Bad Request (Validation error)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Floor not found
 */
router.get('/', authMiddleware, checkPermission('locations', 'view'), validate(paginationQuerySchema), locationController.getAllLocations);
router.post('/', authMiddleware, checkPermission('locations', 'add'), validate(locationSchema), locationController.createLocation);

/**
 * @swagger
 * /api/v1/locations/list:
 *   get:
 *     summary: Get all active locations for dropdown
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active locations (id, name, floor, tower)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       floor:
 *                         type: object
 *                         properties:
 *                           floor_name:
 *                             type: string
 *                           tower:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/list', authMiddleware, checkPermission('locations', 'view'), locationController.getActiveLocationsList);

/**
 * @swagger
 * /api/v1/locations/{id}:
 *   get:
 *     summary: Get location by ID
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location details
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
 *                   example: "Location retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Location not found
 *   put:
 *     summary: Update location
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationUpdateRequest'
 *     responses:
 *       200:
 *         description: Location updated successfully
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
 *                   example: "Location updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Location'
 *       400:
 *         description: Bad Request (Validation error)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Location or Floor not found
 *   delete:
 *     summary: Delete/Deactivate location
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Location ID
 *     responses:
 *       200:
 *         description: Location deactivated successfully
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
 *                   example: "Location deactivated successfully"
 *                 data:
 *                   type: object
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Location not found
 */
router.get('/:id', authMiddleware, checkPermission('locations', 'view'), locationController.getLocationById);
router.put('/:id', authMiddleware, checkPermission('locations', 'edit'), validate(locationSchema), locationController.updateLocation);
router.delete('/:id', authMiddleware, checkPermission('locations', 'delete'), locationController.deleteLocation);

export default router;
