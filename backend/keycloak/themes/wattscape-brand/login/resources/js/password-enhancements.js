(() => {
  'use strict';

  const ready = (callback) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  };

  const addVisibilityToggle = (input) => {
    if (!input || input.dataset.wsVisibilityReady === 'true') return;
    input.dataset.wsVisibilityReady = 'true';
    const wrapper = input.parentElement;
    if (!wrapper) return;
    // Respect a visibility control supplied by the active Keycloak theme.
    if (wrapper.querySelector('button')) return;
    wrapper.classList.add('ws-password-control');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ws-password-toggle';
    button.textContent = 'Show';
    button.setAttribute('aria-label', 'Show password');
    button.setAttribute('aria-controls', input.id || 'password');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.textContent = reveal ? 'Hide' : 'Show';
      button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      button.setAttribute('aria-pressed', String(reveal));
      input.focus();
    });
    wrapper.appendChild(button);
  };

  const addStrengthMeter = (input) => {
    if (!input || !document.getElementById('kc-register-form') || document.getElementById('ws-password-strength')) return;
    const field = input.closest('.pf-v5-c-form__group, .form-group, .pf-v5-c-form__group-control') || input.parentElement?.parentElement;
    if (!field) return;
    const meter = document.createElement('div');
    meter.id = 'ws-password-strength';
    meter.className = 'ws-password-strength';
    meter.setAttribute('role', 'status');
    meter.setAttribute('aria-live', 'polite');
    const bars = document.createElement('div');
    bars.className = 'ws-password-strength__bars';
    for (let index = 0; index < 5; index += 1) {
      const bar = document.createElement('span');
      bar.className = 'ws-password-strength__bar';
      bars.appendChild(bar);
    }
    const label = document.createElement('span');
    label.className = 'ws-password-strength__label';
    label.textContent = 'Use at least 12 characters with upper/lowercase, a number and a symbol.';
    meter.append(bars, label);
    field.appendChild(meter);

    const update = () => {
      const value = input.value || '';
      const checks = [
        value.length >= 12,
        /[a-z]/.test(value),
        /[A-Z]/.test(value),
        /\d/.test(value),
        /[^A-Za-z0-9]/.test(value),
      ];
      const score = checks.filter(Boolean).length;
      bars.querySelectorAll('.ws-password-strength__bar').forEach((bar, index) => {
        bar.classList.toggle('is-active', index < score);
        bar.classList.toggle('is-strong', score >= 5);
      });
      label.textContent = value.length === 0
        ? 'Use at least 12 characters with upper/lowercase, a number and a symbol.'
        : score >= 5
          ? 'Strong password'
          : score >= 3
            ? 'Password strength: Getting stronger'
            : 'Password strength: Add more character variety';
    };
    input.addEventListener('input', update);
    update();
  };

  ready(() => {
    document.querySelectorAll('input[type="password"]').forEach((input) => addVisibilityToggle(input));
    addStrengthMeter(document.querySelector('#kc-register-form #password'));
  });
})();
