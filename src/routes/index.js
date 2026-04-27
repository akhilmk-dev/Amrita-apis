import { Router } from 'express';
import authRoutes from './auth.routes.js';
import roleRoutes from './role.routes.js';
import userRoutes from './user.routes.js';
import towerRoutes from './tower.routes.js';

const router = Router();
const v1Router = Router();

// v1 Routes
v1Router.use('/auth', authRoutes);
v1Router.use('/', roleRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/towers', towerRoutes);

// Main router
router.use('/v1', v1Router);

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

export default router;
