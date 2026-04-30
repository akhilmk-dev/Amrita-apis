import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config.js';
import dotenv from 'dotenv';
import router from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Add BigInt JSON serialization support
BigInt.prototype.toJSON = function () {
  return this.toString();
};

dotenv.config();

const app = express();

// Trust proxy for Render/Proxies
app.set('trust proxy', 1);

// Middlewares
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173', // Standard Vite port
  'https://amrita-apis.onrender.com',
  'https://amrita-pms.onrender.com' // Assuming this is the frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Swagger UI if needed, or configure it properly
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));

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
