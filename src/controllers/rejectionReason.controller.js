import prisma from '../config/prisma.js';
import { successResponse } from '../utils/response.utils.js';

/**
 * Get all active rejection reasons
 */
export const getAllReasons = async (req, res, next) => {
  try {
    const reasons = await prisma.rejection_reasons.findMany({
      where: { is_active: true },
      orderBy: { reason: 'asc' }
    });

    return successResponse(res, reasons, 'Rejection reasons retrieved successfully');
  } catch (error) {
    next(error);
  }
};
