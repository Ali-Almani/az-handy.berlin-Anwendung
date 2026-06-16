/**
 * Socket.io-Adapter für PM2-Cluster: optional Redis (@socket.io/redis-adapter).
 * Ohne Redis erreichen io.emit()-Events nur Clients am selben Worker.
 */
export const setupSocketClusterAdapter = async (io) => {
  const redisUrl = process.env.REDIS_URL?.trim();
  const redisHost = process.env.REDIS_HOST?.trim();

  if (!redisUrl && !redisHost) {
    if (process.env.PM2_INSTANCES && process.env.PM2_INSTANCES !== '1') {
      console.warn('');
      console.warn('⚠️  PM2-Cluster ohne REDIS_URL: Socket.io-Events (news:new, imeis:updated, …)');
      console.warn('   erreichen nur Clients am selben Worker. REDIS_URL setzen oder PM2_INSTANCES=1.');
      console.warn('   Das Frontend pollt IMEI-Daten ohnehin – Echtzeit kann verzögert sein.');
      console.warn('');
    }
    return { adapter: 'local', redis: false };
  }

  try {
    const { createAdapter } = await import('@socket.io/redis-adapter');
    const { createClient } = await import('redis');

    const url = redisUrl || `redis://${redisHost}:${process.env.REDIS_PORT || 6379}`;
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Redis pub client error:', err.message));
    subClient.on('error', (err) => console.error('Redis sub client error:', err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis-Adapter aktiv (PM2-Cluster-kompatibel)');
    return { adapter: 'redis', redis: true };
  } catch (err) {
    console.error('❌ Redis-Adapter konnte nicht geladen werden:', err.message);
    console.error('   npm install @socket.io/redis-adapter redis im server/-Ordner ausführen.');
    return { adapter: 'local', redis: false, error: err.message };
  }
};
