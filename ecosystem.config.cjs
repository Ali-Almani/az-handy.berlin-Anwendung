/**
 * PM2 Ecosystem – Cluster-Mode für az-handy.berlin API
 * Standard: 4 Worker (PM2_INSTANCES in .env überschreibbar)
 * REDIS_URL für Socket.io über alle Worker
 */
module.exports = {
  apps: [
    {
      name: 'az-api',
      script: 'server/index.js',
      exec_mode: 'cluster',
      instances: process.env.PM2_INSTANCES
        ? parseInt(process.env.PM2_INSTANCES, 10)
        : 4,
      env_production: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
