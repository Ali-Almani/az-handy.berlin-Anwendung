/**
 * Persistenz-Konfiguration – wird zur Laufzeit gelesen (nicht beim Modul-Laden).
 * loadEnv.js setzt PERSIST_MEMORY_DATA vor allen Modellen.
 */
export const getPersist = () => process.env.PERSIST_MEMORY_DATA !== 'false';
