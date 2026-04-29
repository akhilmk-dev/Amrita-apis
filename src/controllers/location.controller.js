import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The unique identifier for the location.
 *         floor_id:
 *           type: integer
 *           description: The ID of the floor this location belongs to.
 *         name:
 *           type: string
 *           description: The descriptive name of the location.
 *         code:
 *           type: string
 *           nullable: true
 *           description: The optional code for the location.
 *         is_active:
 *           type: boolean
 *           description: Whether the location is active.
 *         external_id:
 *           type: string
 *           nullable: true
 *           description: The unique identifier from external systems.
 *         floor:
 *           $ref: '#/components/schemas/Floor'
 *     LocationCreateRequest:
 *       type: object
 *       required: [floor_id, name]
 *       properties:
 *         floor_id:
 *           type: integer
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         external_id:
 *           type: string
 *         is_active:
 *           type: boolean
 *           default: true
 *     LocationUpdateRequest:
 *       type: object
 *       properties:
 *         floor_id:
 *           type: integer
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         external_id:
 *           type: string
 *         is_active:
 *           type: boolean
 */

/**
 * Get all locations
 */
export const getAllLocations = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const [count, locations] = await Promise.all([
      prisma.locations.count(),
      prisma.locations.findMany({
        skip,
        take: limit,
        include: {
          floor: {
            include: {
              tower: true
            }
          }
        },
        orderBy: [
          { floor_id: 'asc' },
          { name: 'asc' }
        ]
      })
    ]);

    const response = getPaginatedResponse({
      count,
      page,
      limit,
      data: locations
    });

    return successResponse(res, response, 'Locations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active locations for dropdown list
 */
export const getActiveLocationsList = async (req, res, next) => {
  try {
    const locations = await prisma.locations.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        floor: {
          select: {
            floor_name: true,
            tower: { select: { name: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return successResponse(res, locations, 'Active locations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get location by ID
 */
export const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await prisma.locations.findUnique({
      where: { id: parseInt(id) },
      include: {
        floor: {
          include: {
            tower: true
          }
        }
      }
    });

    if (!location) {
      throw new ApiError('Location not found', 404);
    }

    return successResponse(res, location, 'Location retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new location
 */
export const createLocation = async (req, res, next) => {
  try {
    const { floor_id, name, code, external_id, is_active } = req.body;

    // Verify floor exists
    const floor = await prisma.floors.findUnique({ where: { id: parseInt(floor_id) } });
    if (!floor) {
      throw new ApiError('Floor not found', 404);
    }

    const newLocation = await prisma.locations.create({
      data: {
        floor_id: parseInt(floor_id),
        name,
        code,
        external_id,
        is_active: is_active !== undefined ? is_active : true
      },
      include: {
        floor: {
          include: {
            tower: true
          }
        }
      }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'add',
      entityType: 'locations',
      entityId: newLocation.id,
      newValue: newLocation,
      meta: newLocation
    });

    return successResponse(res, newLocation, 'Location created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update location
 */
export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { floor_id, name, code, external_id, is_active } = req.body;

    if (floor_id) {
      const floor = await prisma.floors.findUnique({ where: { id: parseInt(floor_id) } });
      if (!floor) {
        throw new ApiError('Floor not found', 404);
      }
    }

    // Get old value for audit
    const oldLocation = await prisma.locations.findUnique({ where: { id: parseInt(id) } });

    const updatedLocation = await prisma.locations.update({
      where: { id: parseInt(id) },
      data: {
        floor_id: floor_id ? parseInt(floor_id) : undefined,
        name,
        code,
        external_id,
        is_active
      },
      include: {
        floor: {
          include: {
            tower: true
          }
        }
      }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'locations',
      entityId: id,
      oldValue: oldLocation,
      newValue: updatedLocation,
      meta: updatedLocation
    });

    return successResponse(res, updatedLocation, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete location (Hard delete with dependency check)
 */
export const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const locationId = parseInt(id);

    // Get location info before deletion for audit log
    const location = await prisma.locations.findUnique({ where: { id: locationId } });
    if (!location) throw new ApiError('Location not found', 404);

    await prisma.locations.delete({
      where: { id: locationId }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'locations',
      entityId: locationId,
      meta: { message: 'Location deleted', deletedLocation: location }
    });

    return successResponse(res, null, 'Location deleted successfully');
  } catch (error) {
    if (error.code === 'P2003') {
      return next(new ApiError("can't delete dependencies found", 400));
    }
    next(error);
  }
};
