import prisma from '../config/prisma.js';
import { ApiError } from '../utils/response.utils.js';

/**
 * Permission Middleware
 * Checks if the authenticated user's role has the required permission.
 * 
 * @param {string} module - The module name (e.g., 'tasks', 'users')
 * @param {string} action - The action name (e.g., 'view', 'create')
 */
export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // req.user is populated by authMiddleware
      if (!req.user) {
        throw new ApiError('Authentication required', 401);
      }

      const { role_id } = req.user;

      if (!role_id) {
        throw new ApiError('User role not identified', 403);
      }

      // Check if the role has the specific permission
      // We join roles -> role_permissions -> permissions
      const rolePermission = await prisma.role_permissions.findFirst({
        where: {
          role_id: role_id,
          permission: {
            module: module,
            action: action,
          },
        },
      });

      if (!rolePermission) {
        return next(new ApiError(`Access denied. Missing permission: ${module}.${action}`, 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Role Restriction Middleware
 * Prevents specific roles from accessing a route.
 * 
 * @param {string[]} excludedRoles - Array of role_keys to exclude
 */
export const restrictRole = (excludedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401));
    }

    if (excludedRoles.includes(req.user.role_key)) {
      return next(new ApiError(`Access denied. Role '${req.user.role_key}' is not allowed to access this resource.`, 403));
    }

    next();
  };
};
