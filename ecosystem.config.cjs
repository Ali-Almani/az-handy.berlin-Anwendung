/**
 * PM2 Ecosystem – Cluster-Mode für az-handy.berlin API
 * PM2_INSTANCES=1 (Standard) oder Zahl/max für mehrere Worker
 * REDIS_URL optional für Socket.io über alle Worker
 */
module.exports = {
  apps: [
    {
      name: 'az-api',
      script: 'server/index.js',
      instances: process.env.PM2_INSTANCES ?? '1',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PM2_INSTANCES: process.env.PM2_INSTANCES ?? '1'
      },
      max_memory_restart: '512M',
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
