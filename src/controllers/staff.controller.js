import prisma from '../config/prisma.js';
import { successResponse } from '../utils/response.utils.js';

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
