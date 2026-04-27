import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Server ready at: http://localhost:${PORT}
⭐️ Amrita API is up and running!
  `);
});

// Keep process alive
setInterval(() => {}, 1000000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
