import { Router } from 'express';
import authRoutes from './auth.routes.js';
import roleRoutes from './role.routes.js';
import userRoutes from './user.routes.js';
import towerRoutes from './tower.routes.js';
import floorRoutes from './floor.routes.js';
import locationRoutes from './location.routes.js';
import staffBayRoutes from './staffBay.routes.js';
import taskRoutes from './task.routes.js';
import staffRoutes from './staff.routes.js';
import rejectionReasonRoutes from './rejectionReason.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import deliveryRoutes from './delivery.routes.js';
import profileRoutes from './profile.routes.js';
import notificationRoutes from './notification.routes.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { restrictRole } from '../middlewares/permission.middleware.js';

const router = Router();
const v1Router = Router();

// v1 Routes
v1Router.use('/auth', authRoutes);
v1Router.use('/delivery', authMiddleware, deliveryRoutes);
v1Router.use('/profile', authMiddleware, profileRoutes);

// Shared / Publicly Authenticated Routes (MUST be before adminGate catch-all)
v1Router.use('/rejection-reasons', authMiddleware, rejectionReasonRoutes);
v1Router.use('/notifications', authMiddleware, notificationRoutes);

// Protect all admin/standard routes
const adminGate = restrictRole(['delivery_staff']);

v1Router.use('/', authMiddleware, adminGate, roleRoutes);
v1Router.use('/users', authMiddleware, adminGate, userRoutes);
v1Router.use('/towers', authMiddleware, adminGate, towerRoutes);
v1Router.use('/floors', authMiddleware, adminGate, floorRoutes);
v1Router.use('/locations', authMiddleware, adminGate, locationRoutes);
v1Router.use('/staff-bays', authMiddleware, adminGate, staffBayRoutes);
v1Router.use('/tasks', authMiddleware, adminGate, taskRoutes);
v1Router.use('/staff', authMiddleware, adminGate, staffRoutes);
v1Router.use('/dashboard', authMiddleware, adminGate, dashboardRoutes);

// Main router
router.use('/v1', v1Router);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

export default router;
