(function () {
  const container = document.createElement('div');
  container.id = 'toast-container';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);

  const VARIANTS = {
    success: '#2e7d32',
    error:   '#c0392b',
    neutral: '#555555',
  };

  window.toast = function (message, variant = 'neutral') {
    if (container.children.length >= 3) container.removeChild(container.children[0]);

    const el = document.createElement('div');
    Object.assign(el.style, {
      background: VARIANTS[variant] || VARIANTS.neutral,
      color: '#fff',
      padding: '10px 16px',
      borderRadius: '6px',
      fontFamily: "'Source Sans Pro', sans-serif",
      fontWeight: '300',
      fontSize: '14px',
      letterSpacing: '0.025em',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      maxWidth: '320px',
      opacity: '1',
      transition: 'opacity 0.3s ease',
    });
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 320);
    }, 3000);
  };
})();
