import prisma from '../config/prisma.js';
import { successResponse } from '../utils/response.utils.js';
import dayjs from 'dayjs';

/**
 * Get Dashboard Statistics with time-based filtering
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { filter = 'today' } = req.query;
    
    // 1. Calculate Time Range
    let startDate = dayjs().startOf('day').toDate();
    if (filter === 'weekly') startDate = dayjs().subtract(7, 'day').startOf('day').toDate();
    if (filter === 'monthly') startDate = dayjs().subtract(30, 'day').startOf('day').toDate();

    const timeFilter = { created_at: { gte: startDate } };

    // 2. Task Counts by Status
    const statusCountsRaw = await prisma.tasks.groupBy({
      by: ['status'],
      where: timeFilter,
      _count: { id: true }
    });

    const statusCounts = {
      new: 0,
      delivery_assigned: 0,
      delivery_accepted: 0,
      picked_up: 0,
      completed: 0,
      cancelled: 0,
      delivery_reassigned: 0
    };

    statusCountsRaw.forEach(item => {
      statusCounts[item.status] = item._count.id;
    });

    // 3. Top 8 Available Staff
    const availableStaff = await prisma.users.findMany({
      where: {
        is_active: true,
        role: { role_key: 'delivery_staff' },
        NOT: {
          staff_current_status: {
            availability: { in: ['on_job', 'on_break', 'off_shift'] }
          }
        },
        task_agents: {
          none: {
            agent_status: { in: ['pending', 'accepted', 'picked_up'] }
          }
        }
      },
      take: 8,
      select: {
        id: true,
        name: true,
        employee_id: true,
        staff_current_status: {
          select: { availability: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // 4. Recent 5 Tasks
    const recentTasks = await prisma.tasks.findMany({
      where: timeFilter,
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        pickup_location: { select: { name: true } },
        destination_location: { select: { name: true } }
      }
    });

    // 5. Top 3 In-Progress Tasks
    const inProgressTasks = await prisma.tasks.findMany({
      where: {
        ...timeFilter,
        status: { in: ['delivery_accepted', 'picked_up'] }
      },
      take: 3,
      orderBy: { updated_at: 'desc' },
      include: {
        pickup_location: { select: { name: true } },
        destination_location: { select: { name: true } },
        task_agents: {
          where: { agent_status: { in: ['accepted', 'picked_up'] } },
          include: { staff: { select: { name: true } } }
        }
      }
    });

    return successResponse(res, {
      summary: statusCounts,
      available_staff: availableStaff,
      recent_tasks: recentTasks,
      in_progress_tasks: inProgressTasks,
      filter_applied: filter
    }, 'Dashboard statistics retrieved successfully');

  } catch (error) {
    next(error);
  }
};
