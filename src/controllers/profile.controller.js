import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * Get current user profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        role: true
      }
    });

    if (!user) {
      throw new ApiError('User profile not found', 404);
    }

    // Remove sensitive data
    const { password_hash, ...profile } = user;

    return successResponse(res, profile, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get delivery staff profile (restricted to delivery_staff role)
 */
export const getDeliveryProfile = async (req, res, next) => {
  try {
    if (req.user.role_key !== 'delivery_staff') {
      throw new ApiError('Access denied. This endpoint is for delivery staff only.', 403);
    }

    const userId = req.user.user_id;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        role: true,
        staff_current_status: {
          include: {
            bay: true
          }
        }
      }
    });

    if (!user) {
      throw new ApiError('Staff profile not found', 404);
    }

    const { password_hash, ...profile } = user;
    return successResponse(res, profile, 'Delivery staff profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { name, email, phone } = req.body;

    // 1. If email is changing, check for collisions
    if (email) {
      const existingUser = await prisma.users.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (existingUser) {
        throw new ApiError('Email is already in use by another account', 400);
      }
    }

    // 2. Prepare update data
    const updateData = { name, email, phone };
    if (req.file) {
      updateData.profile_image = `/public/uploads/profiles/${req.file.filename}`;
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // 3. Update in DB
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      include: { role: true }
    });

    const { password_hash, ...profile } = updatedUser;

    // 4. Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'users',
      entityId: userId,
      meta: { message: 'User updated their own profile', updatedFields: Object.keys(updateData) }
    });

    return successResponse(res, profile, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 */
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { old_password, new_password } = req.body;

    // 1. Get user with password hash
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) throw new ApiError('User not found', 404);

    // 2. Verify old password
    const isMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!isMatch) {
      throw new ApiError('Incorrect old password', 400);
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    // 4. Update password
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash }
    });

    // 5. Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'users',
      entityId: userId,
      meta: { message: 'User changed their password' }
    });

    return successResponse(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};
