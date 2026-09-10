import { spawnSync } from 'child_process';

export function getPgDatabaseName() {
  if (process.env.PG_DATABASE) return process.env.PG_DATABASE;
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const parsed = new URL(url.replace(/^postgresql:/, 'postgres:'));
      const name = parsed.pathname.replace(/^\//, '').split('?')[0];
      if (name) return name;
    } catch (_) {}
  }
  return 'az_handy_berlin';
}

export function runPsql(dbName, psqlArgs, stdinSql) {
  const cmd = ['-u', 'postgres', 'psql', '-d', dbName, '-v', 'ON_ERROR_STOP=1', ...psqlArgs];
  const result = spawnSync('sudo', cmd, {
    encoding: 'utf-8',
    input: stdinSql ?? undefined,
    stdio: stdinSql != null ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe']
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'psql fehlgeschlagen').trim());
  }
  return (result.stdout ?? '').trim();
}
