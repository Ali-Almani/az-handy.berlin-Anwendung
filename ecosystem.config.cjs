const path = require('path');

/**
 * PM2 Ecosystem – Cluster-Mode für az-handy.berlin API
 * Standard: 1 Worker (PM2_INSTANCES überschreibbar; REDIS_URL für mehrere Worker)
 */
module.exports = {
  apps: [
    {
      name: 'az-api',
      script: 'server/index.js',
      cwd: path.join(__dirname),
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES
        ? parseInt(process.env.PM2_INSTANCES, 10)
        : 1,
      env_production: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
