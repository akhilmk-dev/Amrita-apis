import { Router } from 'express';
import * as roleController from '../controllers/role.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Panel
 *   description: Role and Permission management
 */

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/permissions', authMiddleware, checkPermission('settings', 'manage_roles'), roleController.getAllPermissions);

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles with their permissions
 *   post:
 *     summary: Create a new role
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Role created successfully
 */
router.get('/roles', authMiddleware, checkPermission('settings', 'manage_roles'), roleController.getAllRoles);
router.post('/roles', authMiddleware, checkPermission('settings', 'manage_roles'), roleController.createRole);

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Admin Panel]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               permissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
router.put('/roles/:id', authMiddleware, checkPermission('settings', 'manage_roles'), roleController.updateRole);

export default router;
