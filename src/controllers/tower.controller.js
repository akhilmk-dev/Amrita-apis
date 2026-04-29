import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Tower:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         is_active:
 *           type: boolean
 */

/**
 * Get all towers
 */
export const getAllTowers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const [count, towers] = await Promise.all([
      prisma.towers.count(),
      prisma.towers.findMany({
        skip,
        take: limit,
        orderBy: { sort_order: 'asc' }
      })
    ]);

    const response = getPaginatedResponse({
      count,
      page,
      limit,
      data: towers
    });

    return successResponse(res, response, 'Towers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get tower by ID
 */
export const getTowerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tower = await prisma.towers.findUnique({
      where: { id: parseInt(id) }
    });

    if (!tower) {
      throw new ApiError('Tower not found', 404);
    }

    return successResponse(res, tower, 'Tower retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new tower
 */
export const createTower = async (req, res, next) => {
  try {
    const { name, code, sort_order } = req.body;

    const newTower = await prisma.towers.create({
      data: {
        name,
        code,
        sort_order: sort_order || 0,
        is_active: true
      }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'add',
      entityType: 'towers',
      entityId: newTower.id,
      newValue: newTower,
      meta: newTower
    });

    return successResponse(res, newTower, 'Tower created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update tower
 */
export const updateTower = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, sort_order, is_active } = req.body;

    // Get old value for audit
    const oldTower = await prisma.towers.findUnique({ where: { id: parseInt(id) } });

    const updatedTower = await prisma.towers.update({
      where: { id: parseInt(id) },
      data: {
        name,
        code,
        sort_order,
        is_active
      }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'towers',
      entityId: id,
      oldValue: oldTower,
      newValue: updatedTower,
      meta: updatedTower
    });

    return successResponse(res, updatedTower, 'Tower updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tower (Soft delete)
 */
export const deleteTower = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.towers.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'towers',
      entityId: id,
      meta: { message: 'Tower deactivated' }
    });

    return successResponse(res, null, 'Tower deactivated successfully');
  } catch (error) {
    next(error);
  }
};
