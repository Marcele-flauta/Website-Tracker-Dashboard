const express = require('express');
const router = express.Router();
const { appendRow } = require('../excel');
const { invalidateCache } = require('../cache');

router.post('/api/row', async (req, res) => {
  const { name, invoicePaid = 'No', stages = [] } = req.body;

  if (!name || typeof name !== 'string' || !name.trim())
    return res.status(400).json({ ok: false, error: 'name is required' });

  const normStages = Array.from({ length: 12 }, (_, i) =>
    typeof stages[i] === 'string' ? stages[i] : ''
  );

  try {
    const row = await appendRow(name.trim(), invoicePaid === 'Yes' ? 'Yes' : 'No', normStages);
    invalidateCache();
    res.json({ ok: true, row });
  } catch (err) {
    console.error('POST /api/row:', err.message);
    res.status(503).json({ ok: false, error: err.message });
  }
});

module.exports = router;
