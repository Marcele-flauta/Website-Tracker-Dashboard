(function () {
  'use strict';

  let state = { stageNames: [], clients: [], fetchedAt: null };
  let pollTimer = null;

  // ── Data fetching ────────────────────────────────────

  async function fetchData() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state = data;
      render();
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 30000);
  }

  // Immediately re-fetch when the tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchData();
  });

  // ── Rendering ────────────────────────────────────────

  function render() {
    renderHeader();
    renderBody();
  }

  function renderHeader() {
    const thead = document.getElementById('table-head');
    if (!thead) return;

    const stageCols = state.stageNames
      .map(name => `<th class="stage-col-header"><span class="stage-label-wrap">${esc(name)}</span></th>`)
      .join('');

    thead.innerHTML = `
      <tr>
        <th>Client</th>
        <th>Invoice</th>
        ${stageCols}
        <th>Progress</th>
        <th>Last Updated</th>
      </tr>`;
  }

  function renderBody() {
    const tbody = document.getElementById('client-tbody');
    if (!tbody) return;

    if (!state.clients || state.clients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="16" class="loading-cell">No clients found. Add one with "+ Add Client".</td></tr>`;
      return;
    }

    tbody.innerHTML = state.clients.map(renderRow).join('');
  }

  function renderRow(client) {
    const total     = client.stages.length;
    const skipped   = client.stages.filter(s => s === 'No').length;
    const done      = client.stages.filter(s => s && s !== 'No').length;
    const denom     = total - skipped;
    const pct       = denom > 0 ? Math.round((done / denom) * 100) : 0;
    const complete  = pct === 100;

    const invoicePaidClass = client.invoicePaid === 'Yes' ? 'paid' : 'unpaid';
    const invoiceLabel     = client.invoicePaid === 'Yes' ? '✓ Paid' : '✗ Unpaid';

    const circles = client.stages.map((val, i) => {
      const stageName = state.stageNames[i] || `Stage ${i + 1}`;
      let cls   = 'circle pending';
      let title = `${stageName}: Not started`;
      if (val === 'No') {
        cls   = 'circle na';
        title = `${stageName}: N/A`;
      } else if (val) {
        cls   = 'circle complete';
        title = `${stageName}: ${val}`;
      }
      return `<td class="stage-cell">
        <span class="${cls}" title="${esc(title)}" data-row="${client.row}" data-col="${i + 3}"></span>
      </td>`;
    }).join('');

    const lastUpdFmt = client.lastUpdated ? fmtDate(client.lastUpdated) : '—';

    return `
      <tr class="client-row${complete ? ' complete' : ''}" data-row="${client.row}">
        <td class="client-name-cell">${esc(client.name)}</td>
        <td class="invoice-cell">
          <span class="invoice-badge ${invoicePaidClass}">${invoiceLabel}</span>
        </td>
        ${circles}
        <td class="pct-cell">${pct}%</td>
        <td class="last-updated-cell">${esc(lastUpdFmt)}</td>
      </tr>`;
  }

  // ── Add client ───────────────────────────────────────
  // Base implementation: simple prompt. Replaced by the dropdowns spec.

  document.getElementById('add-client-btn').addEventListener('click', async () => {
    const name = window.prompt('New client name:');
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          invoicePaid: 'No',
          stages: Array(12).fill(''),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Unknown error');
      toast('✓ Client added', 'success');
      await fetchData();
    } catch (err) {
      toast(`✗ Could not add client — ${err.message}`, 'error');
    }
  });

  // ── Helpers ──────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-AU', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  // ── Init ─────────────────────────────────────────────

  fetchData().then(startPolling);

})();
