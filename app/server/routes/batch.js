const express = require('express');
const router = express.Router();
const { batchPatchCells } = require('../excel');
const { invalidateCache } = require('../cache');

router.post('/api/batch-update', async (req, res) => {
  const { clientRow, updates } = req.body;

  if (!Number.isInteger(clientRow) || clientRow < 2)
    return res.status(400).json({ ok: false, error: 'clientRow must be an integer ≥ 2' });
  if (!Array.isArray(updates) || updates.length === 0)
    return res.status(400).json({ ok: false, error: 'updates must be a non-empty array' });
  for (const u of updates) {
    if (!Number.isInteger(u.col) || u.col < 1 || u.col > 15)
      return res.status(400).json({ ok: false, error: 'each update.col must be 1–15' });
    if (typeof u.value !== 'string')
      return res.status(400).json({ ok: false, error: 'each update.value must be a string' });
  }

  try {
    const lastUpdated = await batchPatchCells(clientRow, updates);
    invalidateCache();
    res.json({ ok: true, lastUpdated });
  } catch (err) {
    console.error('POST /api/batch-update:', err.message);
    res.status(err.status === 423 ? 423 : 503).json({ ok: false, error: err.message });
  }
});

module.exports = router;
