import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import bcrypt from 'bcryptjs';

/**
 * Get all available delivery staff
 */
export const getAvailableStaff = async (req, res, next) => {
  try {
    const availableStaff = await prisma.users.findMany({
      where: {
        is_active: true,
        role: {
          role_key: 'delivery_staff'
        },
        // Layer 1: Exclude those explicitly marked as busy in status table
        NOT: {
          staff_current_status: {
            availability: { in: ['on_job', 'on_break', 'off_shift'] }
          }
        },
        // Layer 2: Exclude those with active assignments in task_agents
        task_agents: {
          none: {
            agent_status: { in: ['pending', 'accepted', 'picked_up'] }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employee_id: true,
        profile_image: true,
        staff_current_status: {
          select: {
            availability: true,
            current_bay_id: true
          }
        }
      }
    });

    return successResponse(res, availableStaff, 'Available staff retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all delivery staff (for Admin)
 * Supports search and pagination
 */
export const getAllDeliveryStaff = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search } = req.query;

    const where = {
      role: {
        role_key: 'delivery_staff'
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { employee_id: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [count, agents] = await Promise.all([
      prisma.users.count({ where }),
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employee_id: true,
          is_active: true,
          profile_image: true,
          staff_current_status: {
            select: {
              availability: true,
              current_bay_id: true,
              bay: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    const response = getPaginatedResponse({
      count,
      page,
      limit,
      data: agents
    });

    return successResponse(res, response, 'Delivery agents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new delivery staff
 */
export const createDeliveryStaff = async (req, res, next) => {
  try {
    const { name, email, password, phone, employee_id, is_active } = req.body;

    // Get delivery_staff role id
    const role = await prisma.roles.findUnique({
      where: { role_key: 'delivery_staff' }
    });
    
    if (!role) {
      throw new ApiError('Delivery staff role not found in system', 500);
    }

    // Check if email or employee_id exists
    if (email) {
      const emailExists = await prisma.users.findUnique({ where: { email } });
      if (emailExists) throw new ApiError('Email already exists', 400);
    }

    if (employee_id) {
      const empIdExists = await prisma.users.findUnique({ where: { employee_id } });
      if (empIdExists) throw new ApiError('Employee ID already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let profile_image = null;
    if (req.file) {
      profile_image = `/public/uploads/profiles/${req.file.filename}`;
    }

    const newStaff = await prisma.users.create({
      data: {
        name,
        email,
        password_hash,
        role_id: role.id,
        phone,
        employee_id,
        profile_image,
        is_active: is_active !== undefined ? is_active : true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employee_id: true,
        is_active: true,
        profile_image: true,
        created_at: true
      }
    });

    return successResponse(res, newStaff, 'Delivery staff created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing delivery staff
 */
export const updateDeliveryStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, employee_id, is_active } = req.body;

    const staffId = parseInt(id);

    // Verify staff exists and is delivery_staff
    const existingStaff = await prisma.users.findUnique({
      where: { id: staffId },
      include: { role: true }
    });

    if (!existingStaff || existingStaff.role?.role_key !== 'delivery_staff') {
      throw new ApiError('Delivery staff not found', 404);
    }

    // Check unique constraints for email and employee_id if they are being updated
    if (email && email !== existingStaff.email) {
      const emailExists = await prisma.users.findUnique({ where: { email } });
      if (emailExists) throw new ApiError('Email already exists', 400);
    }

    if (employee_id && employee_id !== existingStaff.employee_id) {
      const empIdExists = await prisma.users.findUnique({ where: { employee_id } });
      if (empIdExists) throw new ApiError('Employee ID already exists', 400);
    }

    // Prepare update data
    const updateData = {
      name,
      email,
      phone,
      employee_id,
      is_active
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (req.file) {
      updateData.profile_image = `/public/uploads/profiles/${req.file.filename}`;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedStaff = await prisma.users.update({
      where: { id: staffId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employee_id: true,
        is_active: true,
        profile_image: true,
        updated_at: true
      }
    });

    // If deactivated, we might want to also update their staff_current_status
    if (is_active === false && existingStaff.is_active === true) {
      await prisma.staff_current_status.updateMany({
        where: { staff_id: staffId },
        data: { availability: 'off_shift' }
      });
    }

    return successResponse(res, updatedStaff, 'Delivery staff updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate (soft delete) a delivery staff
 */
export const deactivateDeliveryStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(id);

    // Verify staff exists and is delivery_staff
    const existingStaff = await prisma.users.findUnique({
      where: { id: staffId },
      include: { role: true }
    });

    if (!existingStaff || existingStaff.role?.role_key !== 'delivery_staff') {
      throw new ApiError('Delivery staff not found', 404);
    }

    const updatedStaff = await prisma.users.update({
      where: { id: staffId },
      data: { is_active: false },
      select: {
        id: true,
        name: true,
        is_active: true,
      }
    });

    // Update their current status to off_shift if they are deactivated
    await prisma.staff_current_status.updateMany({
      where: { staff_id: staffId },
      data: { availability: 'off_shift' }
    });

    return successResponse(res, updatedStaff, 'Delivery staff deactivated successfully');
  } catch (error) {
    next(error);
  }
};
