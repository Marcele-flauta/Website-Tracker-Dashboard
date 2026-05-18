let _cache = null;

const TTL_MS = () => parseInt(process.env.CACHE_TTL_MS || '60000', 10);

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
