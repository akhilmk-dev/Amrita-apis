import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils.js';
import { successResponse, ApiError } from '../utils/response.utils.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *     LoginResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *             role_key:
 *               type: string
 *               nullable: true
 *             permissions:
 *               type: array
 *               items:
 *                 type: string
 *         accessToken:
 *           type: string
 *         refreshToken:
 *           type: string
 */

/**
 * Common login logic
 */
const performLogin = async (email, password, expectedRoleKeys = null) => {
  const user = await prisma.users.findUnique({
    where: { email },
    include: { 
      role: {
        include: {
          role_permissions: {
            include: {
              permission: true
            }
          }
        }
      } 
    }
  });

  if (!user || !user.is_active) {
    throw new ApiError('Invalid credentials or inactive account', 401);
  }

  if (expectedRoleKeys && !expectedRoleKeys.includes(user.role.role_key)) {
    throw new ApiError('Unauthorized for this login type', 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError('Invalid credentials', 401);
  }

  // Extract permissions into a flat array of "module.action"
  const permissions = user.role.role_permissions.map(rp => 
    `${rp.permission.module}.${rp.permission.action}`
  );

  const payload = {
    user_id: user.id,
    role_id: user.role_id,
    role_key: user.role.role_key,
    role_name: user.role.name,
    permissions: permissions // Added permissions to payload
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      role_key: user.role.role_key,
      permissions: permissions
    },
    accessToken,
    refreshToken
  };
};

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Staff/Admin login
 *     tags: [Admin Panel]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;


    // Standard login allows all active staff, but we could restrict here too if needed
    const result = await performLogin(email, password); 
    return successResponse(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/auth/login/delivery:
 *   post:
 *     summary: Delivery Staff login
 *     tags: [Delivery App]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 */
export const loginDelivery = async (req, res, next) => {
  try {
    const { email, password } = req.body;


    // Strictly enforce delivery_staff role_key
    const result = await performLogin(email, password, ['delivery_staff']);
    return successResponse(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Admin Panel]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;


    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new ApiError('Invalid or expired refresh token', 401);
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.user_id },
      include: { 
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true
              }
            }
          }
        } 
      }
    });

    if (!user || !user.is_active) {
      throw new ApiError('User not found or inactive', 401);
    }

    const permissions = user.role.role_permissions.map(rp => 
      `${rp.permission.module}.${rp.permission.action}`
    );

    const payload = {
      user_id: user.id,
      role_id: user.role_id,
      role_key: user.role.role_key,
      role_name: user.role.name,
      permissions
    };

    const accessToken = generateAccessToken(payload);
    return successResponse(res, { accessToken }, 'Access token refreshed');
  } catch (error) {
    next(error);
  }
};
