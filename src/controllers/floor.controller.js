import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Floor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The unique identifier for the floor.
 *         tower_id:
 *           type: integer
 *           description: The ID of the tower this floor belongs to.
 *         floor_number:
 *           type: integer
 *           description: The numeric value of the floor (e.g., 1, 2, 3).
 *         floor_name:
 *           type: string
 *           description: The descriptive name of the floor.
 *         is_active:
 *           type: boolean
 *           description: Whether the floor is active.
 *         tower:
 *           $ref: '#/components/schemas/Tower'
 *     FloorCreateRequest:
 *       type: object
 *       required: [tower_id, floor_number, floor_name]
 *       properties:
 *         tower_id:
 *           type: integer
 *         floor_number:
 *           type: integer
 *         floor_name:
 *           type: string
 *         is_active:
 *           type: boolean
 *           default: true
 *     FloorUpdateRequest:
 *       type: object
 *       properties:
 *         tower_id:
 *           type: integer
 *         floor_number:
 *           type: integer
 *         floor_name:
 *           type: string
 *         is_active:
 *           type: boolean
 */

/**
 * Get all floors
 */
export const getAllFloors = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const [count, floors] = await Promise.all([
      prisma.floors.count(),
      prisma.floors.findMany({
        skip,
        take: limit,
        include: {
          tower: true
        },
        orderBy: [
          { tower_id: 'asc' },
          { floor_number: 'asc' }
        ]
      })
    ]);

    const response = getPaginatedResponse({
      count,
      page,
      limit,
      data: floors
    });

    return successResponse(res, response, 'Floors retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get floor by ID
 */
export const getFloorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const floor = await prisma.floors.findUnique({
      where: { id: parseInt(id) },
      include: { tower: true }
    });

    if (!floor) {
      throw new ApiError('Floor not found', 404);
    }

    return successResponse(res, floor, 'Floor retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new floor
 */
export const createFloor = async (req, res, next) => {
  try {
    const { tower_id, floor_number, floor_name, is_active } = req.body;

    // Verify tower exists
    const tower = await prisma.towers.findUnique({ where: { id: parseInt(tower_id) } });
    if (!tower) {
      throw new ApiError('Tower not found', 404);
    }

    const newFloor = await prisma.floors.create({
      data: {
        tower_id: parseInt(tower_id),
        floor_number: parseInt(floor_number),
        floor_name,
        is_active: is_active !== undefined ? is_active : true
      },
      include: { tower: true }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'add',
      entityType: 'floors',
      entityId: newFloor.id,
      newValue: newFloor,
      meta: newFloor
    });

    return successResponse(res, newFloor, 'Floor created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update floor
 */
export const updateFloor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tower_id, floor_number, floor_name, is_active } = req.body;

    if (tower_id) {
      const tower = await prisma.towers.findUnique({ where: { id: parseInt(tower_id) } });
      if (!tower) {
        throw new ApiError('Tower not found', 404);
      }
    }

    // Get old value for audit
    const oldFloor = await prisma.floors.findUnique({ where: { id: parseInt(id) } });

    const updatedFloor = await prisma.floors.update({
      where: { id: parseInt(id) },
      data: {
        tower_id: tower_id ? parseInt(tower_id) : undefined,
        floor_number: floor_number !== undefined ? parseInt(floor_number) : undefined,
        floor_name,
        is_active
      },
      include: { tower: true }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'floors',
      entityId: id,
      oldValue: oldFloor,
      newValue: updatedFloor,
      meta: updatedFloor
    });

    return successResponse(res, updatedFloor, 'Floor updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete floor (Soft delete)
 */
export const deleteFloor = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.floors.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'floors',
      entityId: id,
      meta: { message: 'Floor deactivated' }
    });

    return successResponse(res, null, 'Floor deactivated successfully');
  } catch (error) {
    next(error);
  }
};
