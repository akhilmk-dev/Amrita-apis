import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         module:
 *           type: string
 *         action:
 *           type: string
 *         description:
 *           type: string
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         role_key:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *         is_active:
 *           type: boolean
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Permission'
 */

/**
 * Get all available permissions
 */
export const getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await prisma.permissions.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });
    return successResponse(res, permissions, 'Permissions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all roles with their permissions
 */
export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await prisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    // Format output to be cleaner
    const formattedRoles = roles.map(role => ({
      ...role,
      permissions: role.role_permissions.map(rp => rp.permission),
      role_permissions: undefined
    }));

    return successResponse(res, formattedRoles, 'Roles retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new role with permissions
 */
export const createRole = async (req, res, next) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      throw new ApiError('Role name is required', 400);
    }

    // Use a transaction to create role and link permissions
    const newRole = await prisma.$transaction(async (tx) => {
      const role = await tx.roles.create({
        data: {
          name,
          description,
        }
      });

      if (permissionIds && permissionIds.length > 0) {
        const rolePermissionsData = permissionIds.map(pId => ({
          role_id: role.id,
          permission_id: pId
        }));

        await tx.role_permissions.createMany({
          data: rolePermissionsData
        });
      }

      return role;
    });

    return successResponse(res, newRole, 'Role created successfully', 201);
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Role name already exists', 400));
    }
    next(error);
  }
};

/**
 * Update a role and its permissions
 */
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, permissionIds } = req.body;

    const roleId = parseInt(id);

    // Check if role exists
    const existingRole = await prisma.roles.findUnique({ where: { id: roleId } });
    if (!existingRole) {
      throw new ApiError('Role not found', 404);
    }

    const updatedRole = await prisma.$transaction(async (tx) => {
      // Update role basic info
      const role = await tx.roles.update({
        where: { id: roleId },
        data: {
          name,
          description,
          is_active
        }
      });

      // Update permissions if provided
      if (permissionIds !== undefined) {
        // Delete existing permissions for this role
        await tx.role_permissions.deleteMany({
          where: { role_id: roleId }
        });

        // Add new permissions
        if (permissionIds.length > 0) {
          const rolePermissionsData = permissionIds.map(pId => ({
            role_id: roleId,
            permission_id: pId
          }));

          await tx.role_permissions.createMany({
            data: rolePermissionsData
          });
        }
      }

      return role;
    });

    return successResponse(res, updatedRole, 'Role updated successfully');
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Role name already exists', 400));
    }
    next(error);
  }
};
