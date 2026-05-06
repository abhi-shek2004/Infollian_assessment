'use strict';
// =============================================================
// server.js
// Entry point. Starts the HTTP server and handles graceful shutdown.
// =============================================================

const config = require('./src/config/config');
const { app, healthChecker, rateLimiter } = require('./src/app');

const server = app.listen(config.port, config.host, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│   Smart Consistent Hash Load Balancer           │');
  console.log('│   Infollion Software Developer Intern — Task 3  │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│   Server  : http://${config.host}:${config.port}               │`);
  console.log(`│   Dashboard: http://${config.host}:${config.port}/dashboard    │`);
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
});

// -----------------------------------------------------------
// Graceful shutdown — clean up intervals and close server
// -----------------------------------------------------------

function shutdown(signal) {
  console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);
  healthChecker.stop();
  rateLimiter.stop();
  server.close(() => {
    console.log('[server] HTTP server closed. Bye!');
    process.exit(0);
  });
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled promise rejections (safety net)
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Promise Rejection:', reason);
});
