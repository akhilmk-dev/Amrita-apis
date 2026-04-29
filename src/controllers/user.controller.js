import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role_id:
 *           type: integer
 *         is_active:
 *           type: boolean
 */

/**
 * Get all users
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const whereCondition = {
      role: {
        role_key: { not: 'delivery_staff' }
      }
    };

    const [count, users] = await Promise.all([
      prisma.users.count({ where: whereCondition }),
      prisma.users.findMany({
        where: whereCondition,
        skip,
        take: limit,
        include: {
          role: true
        },
        orderBy: {
          created_at: 'desc'
        }
      })
    ]);

    // Remove password_hash from response
    const formattedUsers = users.map(user => {
      const { password_hash, ...rest } = user;
      return rest;
    });

    const response = getPaginatedResponse({
      count,
      page,
      limit,
      data: formattedUsers
    });

    return successResponse(res, response, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: { role: true }
    });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const { password_hash, ...rest } = user;
    return successResponse(res, rest, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role_id, phone, employee_id } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    let profile_image = null;
    if (req.file) {
      profile_image = `/public/uploads/profiles/${req.file.filename}`;
    }

    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role_id: parseInt(role_id),
        phone,
        employee_id,
        profile_image,
        is_active: true
      },
      include: {
        role: true
      }
    });

    const response = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role_id: newUser.role_id,
      is_active: newUser.is_active,
      profile_image: newUser.profile_image,
      created_at: newUser.created_at,
      role: newUser.role,
    };

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'add',
      entityType: 'users',
      entityId: newUser.id,
      newValue: response,
      meta: response
    });

    return successResponse(res, response, 'User created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role_id, phone, employee_id, is_active } = req.body;

    // Get old value for audit
    const oldUser = await prisma.users.findUnique({ 
      where: { id: parseInt(id) },
      select: { id: true, name: true, email: true, role_id: true, is_active: true }
    });

    const data = {
      name,
      email,
      role_id: role_id ? parseInt(role_id) : undefined,
      phone,
      employee_id,
      is_active
    };

    if (req.file) {
      data.profile_image = `/public/uploads/profiles/${req.file.filename}`;
    }

    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data,
      include: {
        role: true,
      },
    });

    const response = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role_id: updatedUser.role_id,
      is_active: updatedUser.is_active,
      profile_image: updatedUser.profile_image,
      updated_at: updatedUser.updated_at,
      role: updatedUser.role,
    };

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'users',
      entityId: parseInt(id),
      oldValue: oldUser,
      newValue: response,
      meta: response
    });

    return successResponse(res, response, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (Soft delete by deactivating)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'users',
      entityId: parseInt(id),
      meta: { message: 'User deactivated' }
    });

    return successResponse(res, null, 'User deactivated successfully');
  } catch (error) {
    next(error);
  }
};
