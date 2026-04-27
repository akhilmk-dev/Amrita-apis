import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';

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
    const users = await prisma.users.findMany({
      include: {
        role: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Remove password_hash from response
    const formattedUsers = users.map(user => {
      const { password_hash, ...rest } = user;
      return rest;
    });

    return successResponse(res, formattedUsers, 'Users retrieved successfully');
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

    if (!name || !email || !password || !role_id) {
      throw new ApiError('Missing required fields', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        password_hash: hashedPassword,
        role_id: parseInt(role_id),
        phone,
        employee_id,
        is_active: true
      }
    });

    const { password_hash, ...rest } = newUser;
    return successResponse(res, rest, 'User created successfully', 201);
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Email or Employee ID already exists', 400));
    }
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

    const data = {
      name,
      email,
      role_id: role_id ? parseInt(role_id) : undefined,
      phone,
      employee_id,
      is_active
    };

    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data
    });

    const { password_hash, ...rest } = updatedUser;
    return successResponse(res, rest, 'User updated successfully');
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ApiError('Email or Employee ID already exists', 400));
    }
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

    return successResponse(res, null, 'User deactivated successfully');
  } catch (error) {
    next(error);
  }
};
