import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import dayjs from 'dayjs';

/**
 * Get available tap actions for the staff
 */
export const getTapStatus = async (req, res, next) => {
  try {
    const staff_id = req.user?.user_id;
    const today = dayjs().format('YYYY-MM-DD');

    // Get today's shift
    const shift = await prisma.staff_shifts.findFirst({
      where: {
        staff_id,
        shift_date: new Date(today)
      },
      include: {
        shift_breaks: {
          where: { break_end: null }
        }
      }
    });

    let availableActions = [];

    if (!shift) {
      availableActions = ['shift_start'];
    } else if (!shift.is_complete) {
      const activeBreak = shift.shift_breaks.length > 0;
      if (activeBreak) {
        availableActions = ['break_end'];
      } else {
        availableActions = ['break_start', 'shift_end'];
      }
    } else {
      availableActions = []; // Shift completed
    }

    return successResponse(res, { availableActions, shift }, 'Available actions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Bay Tap Event
 */
export const handleTap = async (req, res, next) => {
  try {
    const { bay_id, event_type } = req.body;
    const staff_id = req.user?.user_id;
    const today = dayjs().format('YYYY-MM-DD');

    await prisma.$transaction(async (tx) => {
      // 1. Raw Log
      await tx.bay_tap_events.create({
        data: {
          staff_id,
          bay_id: parseInt(bay_id),
          event_type
        }
      });

      if (event_type === 'shift_start') {
        // Create Shift
        await tx.staff_shifts.create({
          data: {
            staff_id,
            shift_date: new Date(today),
            shift_start: new Date(),
            start_bay_id: parseInt(bay_id),
            is_complete: false
          }
        });

        // Update Status
        await tx.staff_current_status.upsert({
          where: { staff_id },
          create: { staff_id, availability: 'available', current_bay_id: parseInt(bay_id) },
          update: { availability: 'available', current_bay_id: parseInt(bay_id) }
        });

      } else if (event_type === 'break_start') {
        const shift = await tx.staff_shifts.findFirst({
          where: { staff_id, shift_date: new Date(today), is_complete: false }
        });
        if (!shift) throw new ApiError('No active shift found', 404);

        await tx.shift_breaks.create({
          data: {
            shift_id: shift.id,
            break_start: new Date()
          }
        });

        await tx.staff_current_status.update({
          where: { staff_id },
          data: { availability: 'on_break' }
        });

      } else if (event_type === 'break_end') {
        const shift = await tx.staff_shifts.findFirst({
          where: { staff_id, shift_date: new Date(today), is_complete: false }
        });
        
        const openBreak = await tx.shift_breaks.findFirst({
          where: { shift_id: shift.id, break_end: null }
        });
        if (!openBreak) throw new ApiError('No open break found', 404);

        const breakEnd = new Date();
        const duration = dayjs(breakEnd).diff(dayjs(openBreak.break_start), 'minute');

        await tx.shift_breaks.update({
          where: { id: openBreak.id },
          data: { break_end: breakEnd, duration_minutes: duration }
        });

        // Recalculate total break minutes
        const totalBreaks = await tx.shift_breaks.aggregate({
          where: { shift_id: shift.id },
          _sum: { duration_minutes: true }
        });

        await tx.staff_shifts.update({
          where: { id: shift.id },
          data: { total_break_minutes: totalBreaks._sum.duration_minutes || 0 }
        });

        await tx.staff_current_status.update({
          where: { staff_id },
          data: { availability: 'available' }
        });

      } else if (event_type === 'shift_end') {
        await tx.staff_shifts.updateMany({
          where: { staff_id, shift_date: new Date(today), is_complete: false },
          data: { 
            shift_end: new Date(),
            is_complete: true,
            updated_at: new Date()
          }
        });

        await tx.staff_current_status.update({
          where: { staff_id },
          data: { 
            availability: 'off_shift',
            current_bay_id: null,
            current_task_id: null
          }
        });
      }
    });

    return successResponse(res, null, `Event ${event_type} processed successfully`);
  } catch (error) {
    next(error);
  }
};
