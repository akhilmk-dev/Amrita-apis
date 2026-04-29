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
import shiftRoutes from './shift.routes.js';
import rejectionReasonRoutes from './rejectionReason.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import deliveryRoutes from './delivery.routes.js';
import { restrictRole } from '../middlewares/permission.middleware.js';

const router = Router();
const v1Router = Router();

// v1 Routes
v1Router.use('/auth', authRoutes);
v1Router.use('/delivery/tasks', deliveryRoutes);

// Protect all admin/standard routes from delivery_staff
const adminGate = restrictRole(['delivery_staff']);

v1Router.use('/', adminGate, roleRoutes);
v1Router.use('/users', adminGate, userRoutes);
v1Router.use('/towers', adminGate, towerRoutes);
v1Router.use('/floors', adminGate, floorRoutes);
v1Router.use('/locations', adminGate, locationRoutes);
v1Router.use('/staff-bays', adminGate, staffBayRoutes);
v1Router.use('/tasks', adminGate, taskRoutes);
v1Router.use('/staff', adminGate, staffRoutes);
v1Router.use('/staff-shifts', adminGate, shiftRoutes);
v1Router.use('/rejection-reasons', adminGate, rejectionReasonRoutes);
v1Router.use('/dashboard', adminGate, dashboardRoutes);

// Main router
router.use('/v1', v1Router);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

export default router;
