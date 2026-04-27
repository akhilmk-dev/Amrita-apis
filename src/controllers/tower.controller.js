import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';

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
    const towers = await prisma.towers.findMany({
      orderBy: { sort_order: 'asc' }
    });
    return successResponse(res, towers, 'Towers retrieved successfully');
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

    if (!name || !code) {
      throw new ApiError('Name and code are required', 400);
    }

    const newTower = await prisma.towers.create({
      data: {
        name,
        code,
        sort_order: sort_order || 0,
        is_active: true
      }
    });

    return successResponse(res, newTower, 'Tower created successfully', 201);
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Tower code already exists', 400));
    }
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

    const updatedTower = await prisma.towers.update({
      where: { id: parseInt(id) },
      data: {
        name,
        code,
        sort_order,
        is_active
      }
    });

    return successResponse(res, updatedTower, 'Tower updated successfully');
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Tower code already exists', 400));
    }
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

    return successResponse(res, null, 'Tower deactivated successfully');
  } catch (error) {
    next(error);
  }
};
