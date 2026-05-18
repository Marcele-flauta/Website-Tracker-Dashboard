const express = require('express');
const router = express.Router();
const { readWorkbook } = require('../excel');
const { getCache, setCache, isCacheStale } = require('../cache');

router.get('/api/data', async (req, res) => {
  try {
    if (!isCacheStale()) return res.json(getCache());

    const data = await readWorkbook();
    setCache(data);
    res.json(getCache());
  } catch (err) {
    console.error('GET /api/data:', err.message);
    const cached = getCache();
    if (cached) return res.json(cached); // serve stale rather than error
    res.status(503).json({ ok: false, error: 'Could not reach SharePoint' });
  }
});

module.exports = router;
