# Amrita API

A robust Node.js/Express API built with Prisma and MySQL.

## Features
- Express.js with ES Modules
- Prisma ORM for database management
- Global Error Handling
- Security with Helmet & CORS
- Logging with Morgan
- Environment variables with Dotenv

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL database

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the `.env` file with your database credentials:
   ```env
   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
   ```

### Running the App
- **Development mode:**
  ```bash
  npm run dev
  ```
- **Production mode:**
  ```bash
  npm start
  ```

### Prisma Commands
- **Generate Prisma Client:**
  ```bash
  npx prisma generate
  ```
- **Create Migration:**
  ```bash
  npx prisma migrate dev --name init
  ```
- **Prisma Studio (GUI):**
  ```bash
  npx prisma studio
  ```

## Folder Structure
- `src/config`: Configuration files (Prisma client)
- `src/controllers`: Request handlers
- `src/middlewares`: Custom middlewares (Error handling)
- `src/routes`: API route definitions
- `src/services`: Business logic and database queries
- `src/utils`: Utility functions
- `prisma/`: Prisma schema and migrations
