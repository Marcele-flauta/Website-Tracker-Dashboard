const express = require('express');
const router = express.Router();
const { readWorkbook } = require('../excel');
const { getCache, setCache } = require('../cache');

// Forces a fresh Graph fetch regardless of cache age.
// Returns same shape as GET /api/data plus a `changed` boolean.
router.get('/api/refresh', async (req, res) => {
  try {
    const before = getCache();
    const data = await readWorkbook();
    setCache(data);
    const after = getCache();
    const changed = !before || JSON.stringify(before.clients) !== JSON.stringify(data.clients);
    res.json({ ...after, changed });
  } catch (err) {
    console.error('GET /api/refresh:', err.message);
    res.status(503).json({ ok: false, error: 'Could not reach SharePoint' });
  }
});

module.exports = router;
