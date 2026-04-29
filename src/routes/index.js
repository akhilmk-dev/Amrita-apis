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

const router = Router();
const v1Router = Router();

// v1 Routes
v1Router.use('/auth', authRoutes);
v1Router.use('/', roleRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/towers', towerRoutes);
v1Router.use('/floors', floorRoutes);
v1Router.use('/locations', locationRoutes);
v1Router.use('/staff-bays', staffBayRoutes);
v1Router.use('/tasks', taskRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/staff-shifts', shiftRoutes);
v1Router.use('/rejection-reasons', rejectionReasonRoutes);
v1Router.use('/dashboard', dashboardRoutes);

// Main router
router.use('/v1', v1Router);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

export default router;
