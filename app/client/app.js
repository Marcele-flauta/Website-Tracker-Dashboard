(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────────────────────
  let state = { stageNames: [], clients: [], fetchedAt: null };
  let lastSyncTime = null;
  let pollTimer = null;

  // ── Dropdown option sets ────────────────────────────────────────────────
  const STAGE_OPTIONS = [
    { value: '',      label: 'Not started yet',       icon: '○', style: 'normal' },
    { value: 'today', label: 'Mark as done — today',  icon: '✓', style: 'action' },
    { value: 'pick',  label: 'Pick a specific date',  icon: '📅', style: 'normal' },
    { value: 'No',    label: 'Not applicable / N/A',  icon: '—', style: 'muted'  },
  ];

  const INVOICE_OPTIONS = [
    { value: 'Yes', label: 'Invoice paid',     icon: '✓', style: 'action' },
    { value: 'No',  label: 'Invoice not paid', icon: '✗', style: 'muted'  },
  ];

  const QUICK_OPTIONS = [
    { value: 'mark-all', label: 'Mark all stages done today', icon: '✓', style: 'action' },
    { value: 'clear-all', label: 'Clear all stages (reset)',  icon: '↩', style: 'muted'  },
    { value: 'copy',      label: 'Copy progress to clipboard', icon: '📋', style: 'normal' },
  ];

  // ── Data helpers ────────────────────────────────────────────────────────
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function clientByRow(rowNum) {
    return state.clients.find(c => c.row === rowNum);
  }
  function clientIdxByRow(rowNum) {
    return state.clients.findIndex(c => c.row === rowNum);
  }

  // ── Fetch / polling ─────────────────────────────────────────────────────
  async function fetchData() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state = await res.json();
      lastSyncTime = Date.now();
      render();
    } catch (err) {
      console.error('Poll error:', err.message);
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (!document.hidden) fetchData(); }, 30000);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fetchData();
  });

  // ── PATCH single cell ───────────────────────────────────────────────────
  async function apiPatchCell(row, col, newVal, rollback) {
    try {
      const res = await fetch('/api/cell', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row, col, value: newVal }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed');
      const client = clientByRow(row);
      if (client && data.lastUpdated) client.lastUpdated = data.lastUpdated;
      renderBody();
    } catch (err) {
      rollback();
      renderBody();
      toast(`✗ ${err.message}`, 'error');
    }
  }

  // ── PATCH batch ─────────────────────────────────────────────────────────
  async function apiBatchUpdate(clientRow, updates, rollback) {
    try {
      const res = await fetch('/api/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientRow, updates }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed');
      const client = clientByRow(clientRow);
      if (client && data.lastUpdated) client.lastUpdated = data.lastUpdated;
      toast('✓ Saved', 'success');
      renderBody();
    } catch (err) {
      rollback();
      renderBody();
      toast(`✗ ${err.message}`, 'error');
    }
  }

  // ── Apply a stage value (optimistic) ────────────────────────────────────
  function applyStageValue(row, col, clientIdx, stageIdx, newVal) {
    const oldVal = state.clients[clientIdx].stages[stageIdx];
    if (oldVal === newVal) return;
    state.clients[clientIdx].stages[stageIdx] = newVal;
    renderBody();
    apiPatchCell(row, col, newVal, () => {
      state.clients[clientIdx].stages[stageIdx] = oldVal;
    });
  }

  // ── Flatpickr inline date picker ─────────────────────────────────────────
  function openDatePicker(anchor, onPick) {
    const input = document.createElement('input');
    input.type = 'text';
    Object.assign(input.style, {
      position: 'fixed', opacity: '0', pointerEvents: 'none', width: '1px', height: '1px',
    });
    const rect = anchor.getBoundingClientRect();
    input.style.top  = rect.bottom + 'px';
    input.style.left = rect.left + 'px';
    document.body.appendChild(input);

    const fp = flatpickr(input, {
      dateFormat: 'Y-m-d',
      defaultDate: 'today',
      onChange(_, dateStr) {
        if (dateStr) {
          fp.destroy();
          input.remove();
          onPick(dateStr);
        }
      },
      onClose() {
        // small delay so onChange fires first on a real pick
        setTimeout(() => { try { fp.destroy(); } catch {} input.remove(); }, 100);
      },
    });
    fp.open();
  }

  // ── Inline confirm overlay ───────────────────────────────────────────────
  function showInlineConfirm(rowEl, message, onYes) {
    if (rowEl.querySelector('.inline-confirm')) return;

    const bar = document.createElement('div');
    bar.className = 'inline-confirm';
    bar.innerHTML =
      `<span class="confirm-msg">${esc(message)}</span>` +
      `<button class="confirm-yes">Yes</button>` +
      `<button class="confirm-cancel">Cancel</button>`;

    rowEl.appendChild(bar);

    bar.querySelector('.confirm-yes').addEventListener('click', () => {
      bar.remove();
      onYes();
    });
    bar.querySelector('.confirm-cancel').addEventListener('click', () => bar.remove());
  }

  // ── Interaction handlers ────────────────────────────────────────────────

  function handleStageClick(el) {
    const row      = parseInt(el.dataset.row, 10);
    const col      = parseInt(el.dataset.col, 10);
    const clientIdx = clientIdxByRow(row);
    if (clientIdx === -1) return;
    const stageIdx = col - 3;

    new CVDropdown({
      anchor: el,
      options: STAGE_OPTIONS,
      onSelect(value) {
        if (value === 'pick') {
          openDatePicker(el, (dateStr) => applyStageValue(row, col, clientIdx, stageIdx, dateStr));
          return;
        }
        const resolved = value === 'today' ? todayISO() : value;
        applyStageValue(row, col, clientIdx, stageIdx, resolved);
      },
    }).open();
  }

  function handleInvoiceClick(el) {
    const rowEl    = el.closest('[data-row]');
    const row      = parseInt(rowEl.dataset.row, 10);
    const clientIdx = clientIdxByRow(row);
    if (clientIdx === -1) return;
    const oldVal   = state.clients[clientIdx].invoicePaid;

    new CVDropdown({
      anchor: el,
      options: INVOICE_OPTIONS,
      onSelect(value) {
        if (value === oldVal) return;
        state.clients[clientIdx].invoicePaid = value;
        renderBody();
        apiPatchCell(row, 2, value, () => {
          state.clients[clientIdx].invoicePaid = oldVal;
        });
      },
    }).open();
  }

  function handleNameClick(td) {
    if (td.querySelector('input')) return;
    const row      = parseInt(td.closest('[data-row]').dataset.row, 10);
    const clientIdx = clientIdxByRow(row);
    if (clientIdx === -1) return;
    const oldName  = state.clients[clientIdx].name;

    const input = document.createElement('input');
    input.type      = 'text';
    input.className = 'name-edit-input';
    input.value     = oldName;
    td.textContent  = '';
    td.appendChild(input);
    input.focus();
    input.select();

    let committed = false;

    function commit() {
      if (committed) return;
      committed = true;
      const newName = input.value.trim();
      if (!newName || newName === oldName) {
        state.clients[clientIdx].name = oldName;
        renderBody();
        return;
      }
      state.clients[clientIdx].name = newName;
      renderBody();
      apiPatchCell(row, 1, newName, () => {
        state.clients[clientIdx].name = oldName;
      });
      toast('✓ Client name updated', 'success');
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { commit(); }
      if (e.key === 'Escape') { committed = true; state.clients[clientIdx].name = oldName; renderBody(); }
    });
    input.addEventListener('blur', commit);
  }

  function handleQuickAction(btn) {
    const row      = parseInt(btn.dataset.row, 10);
    const clientIdx = clientIdxByRow(row);
    if (clientIdx === -1) return;
    const client   = state.clients[clientIdx];

    new CVDropdown({
      anchor: btn,
      options: QUICK_OPTIONS,
      width: 250,
      onSelect(value) {
        const rowEl = document.querySelector(`.client-row[data-row="${row}"]`);
        if (value === 'mark-all') {
          showInlineConfirm(rowEl, `Mark all 12 stages as done for ${client.name}?`, () => doMarkAll(row, clientIdx));
        } else if (value === 'clear-all') {
          showInlineConfirm(rowEl, `Clear all stage dates for ${client.name}? This cannot be undone.`, () => doClearAll(row, clientIdx));
        } else if (value === 'copy') {
          copyProgress(client);
        }
      },
    }).open();
  }

  async function doMarkAll(row, clientIdx) {
    const client  = state.clients[clientIdx];
    const today   = todayISO();
    const updates = [];

    client.stages.forEach((val, i) => {
      if (!val) updates.push({ col: i + 3, value: today });
    });

    if (!updates.length) { toast('All stages already completed', 'neutral'); return; }

    const oldStages = [...client.stages];
    updates.forEach(({ col, value }) => { client.stages[col - 3] = value; });
    renderBody();

    apiBatchUpdate(row, updates, () => {
      state.clients[clientIdx].stages = oldStages;
    });
  }

  async function doClearAll(row, clientIdx) {
    const client    = state.clients[clientIdx];
    const updates   = Array.from({ length: 12 }, (_, i) => ({ col: i + 3, value: '' }));
    const oldStages = [...client.stages];

    client.stages = Array(12).fill('');
    renderBody();

    apiBatchUpdate(row, updates, () => {
      state.clients[clientIdx].stages = oldStages;
    });
  }

  function copyProgress(client) {
    const lines = state.stageNames.map((name, i) => {
      const v = client.stages[i];
      const status = !v ? '○ Not started' : v === 'No' ? '— N/A' : `✓ ${v}`;
      return `${name}: ${status}`;
    });
    const text = `${client.name}\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text)
      .then(() => toast('📋 Copied to clipboard', 'neutral'))
      .catch(()  => toast('✗ Could not copy', 'error'));
  }

  // ── Add Client ──────────────────────────────────────────────────────────
  function handleAddClient() {
    if (document.querySelector('.add-client-row')) return;

    let pendingInvoice = 'No';

    const tr = document.createElement('tr');
    tr.className = 'add-client-row';

    const emptyCircles = Array(12).fill('')
      .map(() => `<td class="stage-cell"><span class="circle pending"></span></td>`)
      .join('');

    tr.innerHTML =
      `<td class="client-name-cell">` +
        `<input type="text" class="add-name-input" placeholder="Client name…" />` +
      `</td>` +
      `<td class="invoice-cell">` +
        `<span class="invoice-badge unpaid add-invoice-badge">✗ Unpaid</span>` +
      `</td>` +
      emptyCircles +
      `<td class="pct-cell">—</td>` +
      `<td class="add-client-actions" colspan="2">` +
        `<button class="btn-primary btn-sm add-save-btn">Add Client</button>` +
        `<a class="cancel-link add-cancel-link">Cancel</a>` +
      `</td>`;

    document.getElementById('client-tbody').appendChild(tr);
    tr.querySelector('.add-name-input').focus();

    // Invoice dropdown on the add row
    tr.querySelector('.add-invoice-badge').addEventListener('click', (e) => {
      new CVDropdown({
        anchor: e.currentTarget,
        options: INVOICE_OPTIONS,
        onSelect(value) {
          pendingInvoice = value;
          const badge = tr.querySelector('.add-invoice-badge');
          if (value === 'Yes') {
            badge.textContent = '✓ Paid';
            badge.className   = 'invoice-badge paid add-invoice-badge';
          } else {
            badge.textContent = '✗ Unpaid';
            badge.className   = 'invoice-badge unpaid add-invoice-badge';
          }
        },
      }).open();
    });

    async function saveNewClient() {
      const nameInput = tr.querySelector('.add-name-input');
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }

      try {
        const res = await fetch('/api/row', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, invoicePaid: pendingInvoice, stages: Array(12).fill('') }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Unknown error');
        toast('✓ Client added', 'success');
        await fetchData();
      } catch (err) {
        toast(`✗ Could not add client — ${err.message}`, 'error');
      }
    }

    tr.querySelector('.add-save-btn').addEventListener('click', saveNewClient);
    tr.querySelector('.add-cancel-link').addEventListener('click', () => tr.remove());
    tr.querySelector('.add-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  saveNewClient();
      if (e.key === 'Escape') tr.remove();
    });
  }

  // ── Refresh button ──────────────────────────────────────────────────────
  async function handleRefresh() {
    const btn   = document.getElementById('refresh-btn');
    const icon  = btn.querySelector('.refresh-icon');
    const label = btn.querySelector('.refresh-label');

    btn.disabled = true;
    icon.classList.add('spinning');
    label.textContent = 'SYNCING...';

    try {
      const res = await fetch('/api/refresh');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const changed = data.changed;
      delete data.changed;
      state = data;
      lastSyncTime = Date.now();
      render();
      toast(changed ? '✓ Dashboard updated' : '↻ Already up to date', changed ? 'success' : 'neutral');
    } catch (err) {
      toast('✗ Could not reach SharePoint — check connection', 'error');
    } finally {
      btn.disabled = false;
      icon.classList.remove('spinning');
      label.textContent = 'REFRESH DATA';
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────
  function render() {
    renderHeader();
    renderBody();
    updateSyncBar();
  }

  function renderHeader() {
    const thead = document.getElementById('table-head');
    if (!thead) return;

    const stageCols = state.stageNames
      .map(n => `<th class="stage-col-header"><span class="stage-label-wrap">${esc(n)}</span></th>`)
      .join('');

    thead.innerHTML =
      `<tr>` +
        `<th>Client</th>` +
        `<th>Invoice</th>` +
        stageCols +
        `<th>Progress</th>` +
        `<th>Last Updated</th>` +
        `<th></th>` +  // quick-action column
      `</tr>`;
  }

  function renderBody() {
    // Don't clobber an active add-client-row or inline name edit
    if (document.querySelector('.add-client-row, .name-edit-input')) return;

    const tbody = document.getElementById('client-tbody');
    if (!tbody) return;

    if (!state.clients || !state.clients.length) {
      tbody.innerHTML = `<tr><td colspan="17" class="loading-cell">No clients found. Add one with "+ Add Client".</td></tr>`;
      return;
    }

    tbody.innerHTML = state.clients.map(renderRow).join('');
  }

  function renderRow(client) {
    const total   = client.stages.length;
    const skipped = client.stages.filter(s => s === 'No').length;
    const done    = client.stages.filter(s => s && s !== 'No').length;
    const denom   = total - skipped;
    const pct     = denom > 0 ? Math.round((done / denom) * 100) : 0;

    const paidClass  = client.invoicePaid === 'Yes' ? 'paid' : 'unpaid';
    const paidLabel  = client.invoicePaid === 'Yes' ? '✓ Paid' : '✗ Unpaid';

    const circles = client.stages.map((val, i) => {
      const name  = state.stageNames[i] || `Stage ${i + 1}`;
      let cls     = 'circle pending';
      let title   = `${name}: Not started`;
      if (val === 'No')   { cls = 'circle na';       title = `${name}: N/A`; }
      else if (val)       { cls = 'circle complete';  title = `${name}: ${val}`; }
      return `<td class="stage-cell">` +
        `<span class="${cls}" title="${esc(title)}" data-row="${client.row}" data-col="${i + 3}"></span>` +
        `</td>`;
    }).join('');

    return (
      `<tr class="client-row${pct === 100 ? ' complete' : ''}" data-row="${client.row}">` +
        `<td class="client-name-cell" data-row="${client.row}">${esc(client.name)}</td>` +
        `<td class="invoice-cell">` +
          `<span class="invoice-badge ${paidClass}" data-row="${client.row}">${paidLabel}</span>` +
        `</td>` +
        circles +
        `<td class="pct-cell">${pct}%</td>` +
        `<td class="last-updated-cell">${esc(client.lastUpdated ? fmtDate(client.lastUpdated) : '—')}</td>` +
        `<td class="quick-action-cell">` +
          `<button class="quick-action-btn" title="Quick actions" data-row="${client.row}">⌄</button>` +
        `</td>` +
      `</tr>`
    );
  }

  // ── Sync bar ────────────────────────────────────────────────────────────
  function updateSyncBar() {
    const el = document.getElementById('sync-bar');
    if (!el) return;
    if (!lastSyncTime) { el.textContent = 'Auto-syncing every 30 seconds · Last sync: —'; return; }

    const secs = Math.floor((Date.now() - lastSyncTime) / 1000);
    const ago  = secs < 5 ? 'just now' : `${secs} seconds ago`;
    el.textContent = `Auto-syncing every 30 seconds · Last sync: ${ago}`;

    el.style.color = secs > 300 ? 'var(--sys-error)'
                   : secs > 120 ? 'var(--sys-warn)'
                   : 'var(--sys-muted)';
  }

  // ── Event delegation ─────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const circle = e.target.closest('.circle');
    if (circle && !circle.closest('.add-client-row')) { handleStageClick(circle); return; }

    const badge = e.target.closest('.invoice-badge');
    if (badge && !badge.classList.contains('add-invoice-badge')) { handleInvoiceClick(badge); return; }

    const nameTd = e.target.closest('.client-name-cell');
    if (nameTd && nameTd.dataset.row) { handleNameClick(nameTd); return; }

    const qBtn = e.target.closest('.quick-action-btn');
    if (qBtn) { handleQuickAction(qBtn); return; }
  });

  document.getElementById('add-client-btn').addEventListener('click', handleAddClient);
  document.getElementById('refresh-btn').addEventListener('click', handleRefresh);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  setInterval(updateSyncBar, 1000);
  fetchData().then(startPolling);

})();
