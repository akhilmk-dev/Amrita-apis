import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config.js';
import dotenv from 'dotenv';
import router from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', router);

// Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Amrita API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error Handling Middleware
app.use(errorHandler);

export default app;
