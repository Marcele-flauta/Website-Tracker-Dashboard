/**
 * CVDropdown — reusable branded dropdown for Website Tracker Dashboard.
 * Only one instance open at a time (singleton via module-level variable).
 * Keyboard: ArrowUp/Down navigate, Enter selects, Escape closes.
 */

let _current = null;

class CVDropdown {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.anchor   - Element the dropdown anchors to
   * @param {Array}       opts.options  - [{ value, label, icon, style }]
   * @param {Function}    opts.onSelect - Called with (value, option) on selection
   * @param {number}     [opts.width]   - Dropdown width in px (default 220)
   */
  constructor({ anchor, options, onSelect, width = 220 }) {
    this.anchor   = anchor;
    this.options  = options;
    this.onSelect = onSelect;
    this.width    = width;
    this._el      = null;
    this._focusIdx = 0;
    this._onKeydown    = this._onKeydown.bind(this);
    this._onClickAway  = this._onClickAway.bind(this);
  }

  open() {
    if (_current && _current !== this) _current.close();
    _current = this;

    const el = document.createElement('div');
    el.className = 'cv-dropdown';
    el.style.width = this.width + 'px';

    this.options.forEach((opt, i) => {
      const row = document.createElement('div');
      row.className = 'cv-dropdown-option';
      if (opt.style === 'action') row.classList.add('cv-dropdown-option--action');
      if (opt.style === 'muted')  row.classList.add('cv-dropdown-option--muted');

      row.innerHTML =
        `<span class="cv-dd-icon">${opt.icon || ''}</span>` +
        `<span class="cv-dd-label">${opt.label}</span>`;

      row.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep anchor focus so blur doesn't fire prematurely
        this.close();
        this.onSelect(opt.value, opt);
      });

      el.appendChild(row);
    });

    document.body.appendChild(el);
    this._el = el;
    this._focusIdx = 0;
    this._position();

    document.addEventListener('keydown', this._onKeydown);
    // Delay click-away so the triggering click doesn't immediately close
    setTimeout(() => document.addEventListener('mousedown', this._onClickAway), 60);
  }

  close() {
    if (this._el) { this._el.remove(); this._el = null; }
    document.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('mousedown', this._onClickAway);
    if (_current === this) _current = null;
  }

  _position() {
    const el   = this._el;
    const rect = this.anchor.getBoundingClientRect();

    el.style.position = 'fixed';
    el.style.zIndex   = '10000';
    el.style.top      = (rect.bottom + 4) + 'px';
    el.style.left     = rect.left + 'px';

    // Flip right-edge overflow
    const right = rect.left + this.width;
    if (right > window.innerWidth - 8) {
      el.style.left = Math.max(8, window.innerWidth - this.width - 8) + 'px';
    }
    // Flip upward if off bottom
    requestAnimationFrame(() => {
      const elRect = el.getBoundingClientRect();
      if (elRect.bottom > window.innerHeight - 8) {
        el.style.top = Math.max(8, rect.top - elRect.height - 4) + 'px';
      }
    });
  }

  _onKeydown(e) {
    if (!this._el) return;
    const rows = this._el.querySelectorAll('.cv-dropdown-option');
    if (e.key === 'Escape')    { e.stopPropagation(); this.close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._focusIdx = Math.min(this._focusIdx + 1, rows.length - 1); this._highlight(rows); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this._focusIdx = Math.max(this._focusIdx - 1, 0); this._highlight(rows); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = this.options[this._focusIdx];
      if (opt) { this.close(); this.onSelect(opt.value, opt); }
    }
  }

  _highlight(rows) {
    rows.forEach((r, i) => r.classList.toggle('cv-dropdown-option--focused', i === this._focusIdx));
    rows[this._focusIdx]?.scrollIntoView({ block: 'nearest' });
  }

  _onClickAway(e) {
    if (this._el && !this._el.contains(e.target) && e.target !== this.anchor) {
      this.close();
    }
  }
}
