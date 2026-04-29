import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema, paginationQuerySchema } from '../validations/schemas.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Panel
 *   description: Administrative management APIs
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users with pagination metadata
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
 *                         $ref: '#/components/schemas/User'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *   post:
 *     summary: Create a new user
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role_id]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role_id:
 *                 type: integer
 *               phone:
 *                 type: string
 *               employee_id:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.get('/', authMiddleware, checkPermission('staff', 'view'), validate(paginationQuerySchema), userController.getAllUsers);
router.post('/', authMiddleware, checkPermission('staff', 'manage'), validate(createUserSchema), userController.createUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 *   put:
 *     summary: Update user
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role_id:
 *                 type: integer
 *               phone:
 *                 type: string
 *               employee_id:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete/Deactivate user
 *     tags: [Users]
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
 *         description: User deactivated successfully
 */
router.get('/:id', authMiddleware, checkPermission('staff', 'view'), userController.getUserById);
router.put('/:id', authMiddleware, checkPermission('staff', 'manage'), validate(updateUserSchema), userController.updateUser);
router.delete('/:id', authMiddleware, checkPermission('staff', 'manage'), userController.deleteUser);

export default router;
