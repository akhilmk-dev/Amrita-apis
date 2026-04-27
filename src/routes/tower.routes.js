import { Router } from 'express';
import * as towerController from '../controllers/tower.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin Panel
 *   description: Hospital Tower management
 */

/**
 * @swagger
 * /api/v1/towers:
 *   get:
 *     summary: Get all towers
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of towers
 *   post:
 *     summary: Create a new tower
 *     tags: [Admin Panel]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               sort_order:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Tower created successfully
 */
router.get('/', authMiddleware, checkPermission('towers', 'view'), towerController.getAllTowers);
router.post('/', authMiddleware, checkPermission('towers', 'manage'), towerController.createTower);

/**
 * @swagger
 * /api/v1/towers/{id}:
 *   get:
 *     summary: Get tower by ID
 *     tags: [Admin Panel]
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
 *         description: Tower details
 *   put:
 *     summary: Update tower
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
 *               code:
 *                 type: string
 *               sort_order:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Tower updated successfully
 *   delete:
 *     summary: Delete/Deactivate tower
 *     tags: [Towers]
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
 *         description: Tower deactivated successfully
 */
router.get('/:id', authMiddleware, checkPermission('towers', 'view'), towerController.getTowerById);
router.put('/:id', authMiddleware, checkPermission('towers', 'manage'), towerController.updateTower);
router.delete('/:id', authMiddleware, checkPermission('towers', 'manage'), towerController.deleteTower);

export default router;
