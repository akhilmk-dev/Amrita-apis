import crypto from 'crypto';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import prisma from '../config/prisma.js';
import { successResponse, ApiError } from '../utils/response.utils.js';
import { getPaginationParams, getPaginatedResponse } from '../utils/pagination.utils.js';
import { createAuditLog } from '../utils/audit.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     StaffBay:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         floor_id:
 *           type: integer
 *         name:
 *           type: string
 *         qr_code:
 *           type: string
 *           description: The URL encoded in the QR code
 *         qr_image:
 *           type: string
 *           description: Base64 data URI of the QR code image
 *         is_active:
 *           type: boolean
 *         floor:
 *           $ref: '#/components/schemas/Floor'
 */

const getQrImageUrl = (req, storedQrCode) => {
  return storedQrCode; // Now storing the full URL in DB as requested
};

/**
 * Get all staff bays
 */
export const getAllBays = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const [count, bays] = await Promise.all([
      prisma.staff_bays.count(),
      prisma.staff_bays.findMany({
        skip,
        take: limit,
        include: {
          floor: {
            include: {
              tower: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      })
    ]);

    // Map the qr_image URL for each bay
    const baysWithImages = bays.map(bay => ({
      ...bay,
      qr_image: getQrImageUrl(req, bay.qr_code)
    }));

    const response = getPaginatedResponse({
      count,
      page,
      limit,
      data: baysWithImages
    });

    return successResponse(res, response, 'Staff bays retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get staff bay by ID or QR Code
 */
export const getBayById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if ID is numeric (ID) or string (QR Code URL or UUID)
    const isNumeric = /^\d+$/.test(id);

    const bay = await prisma.staff_bays.findFirst({
      where: isNumeric 
        ? { OR: [{ id: parseInt(id) }, { qr_code: { contains: id } }] }
        : { qr_code: { contains: id } },
      include: {
        floor: {
          include: {
            tower: true
          }
        }
      }
    });

    if (!bay) {
      throw new ApiError('Staff bay not found', 404);
    }

    return successResponse(res, { 
      ...bay, 
      qr_image: getQrImageUrl(req, bay.qr_code) 
    }, 'Staff bay retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createBay = async (req, res, next) => {
  try {
    const { floor_id, name, is_active } = req.body;

    const uniqueId = crypto.randomUUID();
    const protocol = req.protocol;
    const host = req.get('host');
    
    // 1. The content encoded INSIDE the QR code (Points to API to give details)
    const qrContent = `${protocol}://${host}/api/v1/staff-bays/${uniqueId}`;

    // 2. The physical file where the QR image is saved
    const fileName = `${uniqueId}.png`;
    const uploadDir = path.join(process.cwd(), 'public/uploads/qrcodes');
    const filePath = path.join(uploadDir, fileName);

    // Generate QR code image file
    await QRCode.toFile(filePath, qrContent, {
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // 3. The public URL for the image (To be saved in DB)
    const qr_code = `${protocol}://${host}/public/uploads/qrcodes/${fileName}`;

    const newBay = await prisma.staff_bays.create({
      data: {
        floor_id: parseInt(floor_id),
        name,
        qr_code, // Saving the image URL in the database
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

    const response = { ...newBay, qr_image: newBay.qr_code };

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'add',
      entityType: 'staff_bays',
      entityId: newBay.id,
      newValue: newBay,
      meta: response
    });

    return successResponse(res, response, 'Staff bay created successfully', 201);
  } catch (error) {
    next(error);
  }
};




/**
 * Update staff bay
 */
export const updateBay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { floor_id, name, is_active } = req.body;

    // Get old value for audit
    const oldBay = await prisma.staff_bays.findUnique({ where: { id: parseInt(id) } });

    // qr_code is not allowed to be updated as per requirements
    const updatedBay = await prisma.staff_bays.update({
      where: { id: parseInt(id) },
      data: {
        floor_id: floor_id ? parseInt(floor_id) : undefined,
        name,
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

    const response = { ...updatedBay, qr_image: updatedBay.qr_code };

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'edit',
      entityType: 'staff_bays',
      entityId: id,
      oldValue: oldBay,
      newValue: updatedBay,
      meta: response
    });

    return successResponse(res, response, 'Staff bay updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete staff bay (Hard delete with dependency check)
 */
export const deleteBay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bayId = parseInt(id);

    // Get bay info before deletion for audit log
    const bay = await prisma.staff_bays.findUnique({ where: { id: bayId } });
    if (!bay) throw new ApiError('Staff bay not found', 404);

    await prisma.staff_bays.delete({
      where: { id: bayId }
    });

    // Create Audit Log
    await createAuditLog({
      req,
      action: 'delete',
      entityType: 'staff_bays',
      entityId: bayId,
      meta: { message: 'Staff bay deleted', deletedBay: bay }
    });

    return successResponse(res, null, 'Staff bay deleted successfully');
  } catch (error) {
    if (error.code === 'P2003') {
      return next(new ApiError("can't delete dependencies found", 400));
    }
    next(error);
  }
};
