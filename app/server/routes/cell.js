const express = require('express');
const router = express.Router();
const { patchCell } = require('../excel');
const { invalidateCache } = require('../cache');

router.patch('/api/cell', async (req, res) => {
  const { row, col, value } = req.body;

  if (!Number.isInteger(row) || row < 2)
    return res.status(400).json({ ok: false, error: 'row must be an integer ≥ 2' });
  if (!Number.isInteger(col) || col < 1 || col > 15)
    return res.status(400).json({ ok: false, error: 'col must be an integer 1–15' });
  if (typeof value !== 'string')
    return res.status(400).json({ ok: false, error: 'value must be a string' });

  try {
    const lastUpdated = await patchCell(row, col, value);
    invalidateCache();
    res.json({ ok: true, row, col, value, lastUpdated });
  } catch (err) {
    console.error('PATCH /api/cell:', err.message);
    res.status(err.status === 423 ? 423 : 503).json({ ok: false, error: err.message });
  }
});

module.exports = router;
