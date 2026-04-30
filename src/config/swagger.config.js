import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Amrita PMS API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Patient Movement Services (PMS) Automation system.',
      contact: {
        name: 'Intertoons Support',
        email: 'support@intertoons.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      {
        url: 'https://amrita-apis.onrender.com',
        description: 'Production Server (Render)',
      },
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Current Environment (from API_URL env)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        PaginationMeta: {
          type: 'object',
          properties: {
            totalItems: { type: 'integer' },
            itemCount: { type: 'integer' },
            itemsPerPage: { type: 'integer' },
            totalPages: { type: 'integer' },
            currentPage: { type: 'integer' }
          }
        }
      }
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
