let _cache = null;

// Default 5 minutes — gentler on App Service Free CPU quota.
// Override with CACHE_TTL_MS env var (e.g. 60000 for 60s in development).
const TTL_MS = () => parseInt(process.env.CACHE_TTL_MS || '300000', 10);

function getCache() {
  return _cache;
}

function setCache(data) {
  _cache = { ...data, fetchedAt: new Date().toISOString() };
}

function invalidateCache() {
  _cache = null;
}

function isCacheStale() {
  if (!_cache) return true;
  return Date.now() - new Date(_cache.fetchedAt).getTime() > TTL_MS();
}

module.exports = { getCache, setCache, invalidateCache, isCacheStale };
