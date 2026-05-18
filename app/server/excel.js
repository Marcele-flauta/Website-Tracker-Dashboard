const { graphRequest } = require('./graph');

function workbookBase() {
  return `/drives/${process.env.SHAREPOINT_DRIVE_ID}/items/${process.env.EXCEL_FILE_ID}/workbook`;
}

function wsBase() {
  const name = encodeURIComponent(process.env.EXCEL_WORKSHEET_NAME || 'Website Tracker');
  return `${workbookBase()}/worksheets('${name}')`;
}

// Create a workbook session, run fn(sessionId), then close the session.
// All cell writes in fn share one session — more efficient than per-request sessions.
async function withSession(fn) {
  const session = await graphRequest(`${workbookBase()}/createSession`, {
    method: 'POST',
    body: { persistChanges: true },
  });
  try {
    return await fn(session.id);
  } finally {
    try {
      await graphRequest(`${workbookBase()}/closeSession`, {
        method: 'POST',
        body: {},
        sessionId: session.id,
      });
    } catch { /* ignore close errors — session expires on its own */ }
  }
}

// Convert Excel date serial number to YYYY-MM-DD.
// Excel counts days since Jan 0 1900 (with a known 1900 leap-year bug for serials ≤ 60).
function excelSerialToISO(serial) {
  const date = new Date(Math.round((serial - 25569) * 86400000));
  return date.toISOString().slice(0, 10);
}

// Normalise a raw cell value from Graph to one of: '', 'No', or 'YYYY-MM-DD'
function normaliseStage(v) {
  if (v === null || v === undefined || v === '') return '';
  const s = String(v).trim();
  if (s === '' || s === 'No') return s;
  // Excel serial date (integer in the 40k–60k range for modern dates)
  if (/^\d{4,5}$/.test(s) && Number(s) > 25569) {
    return excelSerialToISO(Number(s));
  }
  // Graph may return ISO-like strings for Date-formatted cells
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

// Column letter from 1-based index (1=A … 15=O). Works for cols 1–26.
function colLetter(n) {
  return String.fromCharCode(64 + n);
}

async function readWorkbook() {
  const data = await graphRequest(`${wsBase()}/usedRange`);
  const values = data.values || [];

  if (values.length < 2) return { stageNames: [], clients: [] };

  // Row 1 (index 0): headers — [Client, Invoice Paid, stage1..12, Last Updated]
  const headerRow = values[0];
  const stageNames = Array.from({ length: 12 }, (_, i) =>
    String(headerRow[i + 2] || `Stage ${i + 1}`)
  );

  const clients = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const name = String(row[0] || '').trim();
    if (!name) continue;

    clients.push({
      row: i + 1, // 1-indexed workbook row
      name,
      invoicePaid: String(row[1] || 'No').trim(),
      stages: Array.from({ length: 12 }, (_, j) => normaliseStage(row[j + 2])),
      lastUpdated: String(row[14] || '').trim(),
    });
  }

  return { stageNames, clients };
}

// Patch a single cell and update col O (Last Updated) in one workbook session.
async function patchCell(row, col, value) {
  const cellAddr = `${colLetter(col)}${row}`;
  const lastUpdAddr = `O${row}`;
  const now = new Date().toISOString();

  await withSession(async (sessionId) => {
    await graphRequest(`${wsBase()}/range(address='${cellAddr}')`, {
      method: 'PATCH',
      body: { values: [[value]] },
      sessionId,
    });
    await graphRequest(`${wsBase()}/range(address='${lastUpdAddr}')`, {
      method: 'PATCH',
      body: { values: [[now]] },
      sessionId,
    });
  });

  return now;
}

// Append a new client row at the first empty row after the used range.
async function appendRow(name, invoicePaid, stages) {
  const used = await graphRequest(`${wsBase()}/usedRange`);
  const nextRow = (used.rowCount || 1) + 1;
  const now = new Date().toISOString();

  // A–O: name, invoicePaid, 12 stages, lastUpdated
  const rowValues = [name, invoicePaid, ...stages.slice(0, 12), now];
  const address = `A${nextRow}:O${nextRow}`;

  await withSession(async (sessionId) => {
    await graphRequest(`${wsBase()}/range(address='${address}')`, {
      method: 'PATCH',
      body: { values: [rowValues] },
      sessionId,
    });
  });

  return nextRow;
}

module.exports = { readWorkbook, patchCell, appendRow };
