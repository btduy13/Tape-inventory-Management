const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const domActions = require('../js/domActions.js');

function getJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeAttribute(value) {
  return value.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

test('index has no duplicate element ids', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  assert.deepEqual(duplicates, []);
});

test('every data-action handler resolves to an application function', () => {
  const handlers = [...html.matchAll(/\bdata-action-([a-z]+)="([^"]*)"/g)]
    .map(match => ({ type: match[1], name: match[2] }));
  assert.ok(handlers.length > 100, 'expected the converted handlers to be present');

  const unknownEvents = [...new Set(handlers.map(h => h.type).filter(type => !domActions.EVENT_MAP[type]))];
  assert.deepEqual(unknownEvents, []);

  const sources = getJavaScriptFiles(path.join(root, 'js'))
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const missing = [...new Set(handlers.map(h => h.name))].filter(name => {
    if (Object.prototype.hasOwnProperty.call(domActions.namedHandlers, name)) return false;
    const [base, ...rest] = name.split('.');
    const escaped = escapeRegExp(base);
    if (!rest.length) {
      return !new RegExp(`(?:async\\s+)?function\\s+${escaped}\\s*\\(|(?:const|let|var)\\s+${escaped}\\s*=|window\\.${escaped}\\s*=`).test(sources);
    }
    const member = escapeRegExp(rest[rest.length - 1]);
    return !new RegExp(`(?:const|let|var)\\s+${escaped}\\s*=`).test(sources)
      || !new RegExp(`\\b${member}\\s*(?::|\\()`).test(sources);
  });
  assert.deepEqual(missing, []);
});

test('every data-args attribute is a valid JSON array', () => {
  const raw = [...html.matchAll(/\bdata-args(?:-[a-z]+)?='([^']*)'/g)].map(match => decodeAttribute(match[1]));
  assert.ok(raw.length > 0);
  for (const value of raw) assert.ok(Array.isArray(domActions.parseArgs(value)), value);
});

test('index.html has no inline event handler attributes', () => {
  const offenders = [...html.matchAll(/<[a-zA-Z][^>]*?\s(on[a-z]+)\s*=/g)].map(match => match[1]);
  assert.deepEqual(offenders, []);
});

test('index.html has no inline <script> blocks or javascript: URLs', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0);
  const inline = scripts.filter(([, attrs, body]) => !/\bsrc\s*=/.test(attrs) || body.trim() !== '');
  assert.deepEqual(inline.map(match => match[0].slice(0, 80)), []);
  assert.equal(/javascript:/i.test(html), false);
});

test('index.html loads no remote scripts and uses the vendored Chart.js', () => {
  const remote = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1])
    .filter(src => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src));
  assert.deepEqual(remote, []);
  assert.match(html, /<script src="assets\/vendor\/chart\.umd\.js"><\/script>/);
  assert.ok(fs.existsSync(path.join(root, 'assets', 'vendor', 'chart.umd.js')));
});

test('domActions.js loads before the application scripts', () => {
  const order = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  const dispatcher = order.indexOf('js/domActions.js');
  assert.ok(dispatcher >= 0, 'js/domActions.js must be loaded');
  for (const src of order.filter(item => item.startsWith('js/') && item !== 'js/domActions.js')) {
    assert.ok(order.indexOf(src) > dispatcher, `${src} must load after js/domActions.js`);
  }
});

test('CSP script-src disallows inline scripts and remote origins', () => {
  const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
  assert.ok(meta, 'CSP meta tag is required');
  const directives = Object.fromEntries(meta[1].split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const [name, ...values] = part.split(/\s+/);
    return [name, values];
  }));
  assert.deepEqual(directives['script-src'], ["'self'"]);
  assert.equal(meta[1].includes('cdn.jsdelivr.net'), false);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['base-uri'], ["'self'"]);
  assert.deepEqual(directives['form-action'], ["'self'"]);
});

test('quote PDF preview iframe is fully sandboxed', () => {
  assert.match(html, /<iframe id="quote-pdf-preview-frame" sandbox=""/);
});

test('app, dashboard, email and Excel modules generate no inline event handlers (CSP)', () => {
  const files = ['js/app.js', 'js/utils.js', 'js/domActions.js', 'js/modules/dashboard.js', 'js/modules/emailDialog.js', 'js/modules/excelImport.js', 'js/modules/updateManager.js'];
  const offenders = files.flatMap(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    return [...source.matchAll(/\bon[a-z]+\s*=\s*["']/g)].map(match => `${file}: ${match[0]}`);
  });
  assert.deepEqual(offenders, []);
});

// --- domActions dispatcher unit tests (fake DOM) ---

function fakeElement(attrs = {}, props = {}) {
  return {
    nodeType: 1,
    parentNode: null,
    attrs: { ...attrs },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name); },
    getAttribute(name) { return this.hasAttribute(name) ? this.attrs[name] : null; },
    ...props
  };
}

class FakeEvent {
  constructor(target) {
    this.target = target;
    this.cancelBubble = false;
    this.defaultPrevented = false;
  }
  get currentTarget() { return null; }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.cancelBubble = true; }
}

function withProbe(fn) {
  const calls = [];
  const previous = globalThis.__domActionsProbe;
  globalThis.__domActionsProbe = (...args) => calls.push(args);
  try {
    fn(calls);
  } finally {
    if (previous === undefined) delete globalThis.__domActionsProbe;
    else globalThis.__domActionsProbe = previous;
  }
}

test('domActions.parseArgs accepts JSON arrays and rejects other shapes', () => {
  assert.deepEqual(domActions.parseArgs(null), []);
  assert.deepEqual(domActions.parseArgs(''), []);
  assert.deepEqual(domActions.parseArgs('["dashboard", false, 2]'), ['dashboard', false, 2]);
  assert.throws(() => domActions.parseArgs('{"a":1}'), TypeError);
});

test('domActions.resolveArgs maps special tokens to event and element values', () => {
  const element = fakeElement({}, { value: 'Arial', checked: true });
  const event = new FakeEvent(element);
  const state = { dispatching: true };
  const [evt, self, value, checked, literal] = domActions.resolveArgs(
    ['$event', '$this', '$this.value', '$this.checked', 'quote'], event, element, state
  );
  assert.equal(self, element);
  assert.equal(value, 'Arial');
  assert.equal(checked, true);
  assert.equal(literal, 'quote');
  assert.equal(evt.target, element);
  assert.equal(evt.currentTarget, element, 'currentTarget must be the declaring element during dispatch');
  evt.preventDefault();
  assert.equal(event.defaultPrevented, true);
  state.dispatching = false;
  assert.equal(evt.currentTarget, null, 'currentTarget is null after dispatch, like inline handlers');
});

test('domActions.resolveAction resolves globals, dotted paths and named handlers', () => {
  const utilsObj = { resolveConfirmAction() {} };
  const scope = { switchTab() {}, utils: utilsObj };
  assert.equal(domActions.resolveAction('switchTab', scope).fn, scope.switchTab);
  const dotted = domActions.resolveAction('utils.resolveConfirmAction', scope);
  assert.equal(dotted.fn, utilsObj.resolveConfirmAction);
  assert.equal(dotted.thisArg, utilsObj);
  assert.equal(domActions.resolveAction('clickAttachFileInput', scope).fn, domActions.namedHandlers.clickAttachFileInput);
  assert.equal(domActions.resolveAction('doesNotExist', scope), null);
  assert.equal(domActions.resolveAction('utils.missing', scope), null);
});

test('domActions listener dispatches to the declaring ancestor with args', () => {
  withProbe(calls => {
    const button = fakeElement({ 'data-action-click': '__domActionsProbe', 'data-args': '["dashboard","$this"]' });
    const icon = fakeElement();
    icon.parentNode = button;
    domActions.createListener('click', true)(new FakeEvent(icon));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], ['dashboard', button]);
  });
});

test('domActions listener honours per-event args, prevent-default and non-bubbling focus', () => {
  withProbe(calls => {
    const input = fakeElement({
      'data-action-keydown': '__domActionsProbe',
      'data-args-keydown': '["$event"]',
      'data-args': '["shared"]',
      'data-prevent-default': ''
    });
    const event = new FakeEvent(input);
    domActions.createListener('keydown', true)(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(calls[0][0].target, input);

    const wrapper = fakeElement({ 'data-action-focus': '__domActionsProbe' });
    const child = fakeElement();
    child.parentNode = wrapper;
    domActions.createListener('focus', false)(new FakeEvent(child));
    assert.equal(calls.length, 1, 'focus must not be delegated from descendants');
    domActions.createListener('focus', false)(new FakeEvent(wrapper));
    assert.equal(calls.length, 2);
  });
});

test('domActions logs console.error for unknown handler names instead of throwing', () => {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    const button = fakeElement({ 'data-action-click': 'definitelyMissingHandler' });
    assert.doesNotThrow(() => domActions.createListener('click', true)(new FakeEvent(button)));
    assert.equal(logged.length, 1);
    assert.match(String(logged[0][0]), /definitelyMissingHandler/);
  } finally {
    console.error = original;
  }
});

test('domActions registers one capture listener per event type on document', () => {
  const registered = [];
  domActions.install({ addEventListener: (type, listener, capture) => registered.push([type, capture]) });
  const types = registered.map(([type]) => type);
  assert.equal(new Set(types).size, types.length);
  assert.ok(types.includes('focusin') && types.includes('submit') && types.includes('click'));
  assert.ok(registered.every(([, capture]) => capture === true));
});

function silenceConsoleError(fn) {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    fn(logged);
  } finally {
    console.error = original;
  }
}

test('domActions always prevents native submit, even when the handler is missing', () => {
  silenceConsoleError(logged => {
    const form = fakeElement({ 'data-action-submit': 'definitelyMissingSubmitHandler' });
    const event = new FakeEvent(form);
    domActions.createListener('submit', true)(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(logged.length, 1);
  });
});

test('domActions prevents native submit and logs when data-args is malformed', () => {
  const originalReportError = globalThis.reportError;
  const reported = [];
  globalThis.reportError = error => reported.push(error);
  try {
    silenceConsoleError(logged => {
      withProbe(calls => {
        const form = fakeElement({ 'data-action-submit': '__domActionsProbe', 'data-args': '{not json' });
        const event = new FakeEvent(form);
        domActions.createListener('submit', true)(event);
        assert.equal(event.defaultPrevented, true);
        assert.equal(calls.length, 0);
        assert.equal(logged.length, 1);
        assert.equal(reported.length, 1);
      });
    });
  } finally {
    if (originalReportError === undefined) delete globalThis.reportError;
    else globalThis.reportError = originalReportError;
  }
});

test('domActions does not prevent default for click without data-prevent-default', () => {
  withProbe(() => {
    const button = fakeElement({ 'data-action-click': '__domActionsProbe' });
    const event = new FakeEvent(button);
    domActions.createListener('click', true)(event);
    assert.equal(event.defaultPrevented, false);
  });
});

// --- Accessibility contract ---

test('every modal overlay is a labelled aria-modal dialog', () => {
  const modals = [...html.matchAll(/<div id="(modal-[^"]+)" class="modal-overlay[^"]*"([^>]*)>/g)];
  assert.ok(modals.length >= 10);
  for (const [, id, attrs] of modals) {
    assert.match(attrs, /role="dialog"/, id);
    assert.match(attrs, /aria-modal="true"/, id);
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(attrs);
    assert.ok(labelledBy || /aria-label="[^"]+"/.test(attrs), `${id} needs a label`);
    if (labelledBy) assert.match(html, new RegExp(`id="${labelledBy[1]}"`), `${id} label target`);
  }
});

test('× close buttons have an accessible name and type="button"', () => {
  const closes = [...html.matchAll(/<button[^>]*class="modal-close"[^>]*>/g)].map(match => match[0]);
  assert.ok(closes.length > 0);
  for (const button of closes) {
    assert.match(button, /aria-label="[^"]+"/, button);
    assert.match(button, /type="button"/, button);
  }
});

test('toast container is a polite live region', () => {
  assert.match(html, /id="toast-container" role="status" aria-live="polite"/);
});

test('sidebar navigation and breadcrumb are keyboard reachable', () => {
  const links = [...html.matchAll(/<a\b[^>]*data-action-click="switchTab"[^>]*>/g)].map(match => match[0]);
  assert.equal(links.length, 5);
  for (const link of links) {
    assert.match(link, /href="#"/);
    assert.match(link, /role="button"/);
    assert.match(link, /data-prevent-default/);
  }
  assert.match(html, /<span class="breadcrumb-item" role="button" tabindex="0" data-action-click="switchTab"/);
});

test('form labels directly followed by a control are associated via for=', () => {
  const pattern = /<label([^>]*)>((?:(?!<\/label>|<label|<input|<select|<textarea)[\s\S])*?)<\/label>\s*<(?:input|select|textarea)\b[^>]*?\bid="([^"]+)"/g;
  const unassociated = [...html.matchAll(pattern)]
    .filter(match => !/checkbox-container/.test(match[1]))
    .filter(match => !new RegExp(`for="${escapeRegExp(match[3])}"`).test(match[1]))
    .map(match => match[3]);
  assert.deepEqual(unassociated, []);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const dangling = [...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map(match => match[1]).filter(id => !ids.has(id));
  assert.deepEqual(dangling, []);
});

test('new-axis "Chu vi" inputs are optional', () => {
  for (const id of ['bki-truc-chu-vi', 'q-bki-truc-chu-vi']) {
    const tag = new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(html);
    assert.ok(tag, id);
    assert.doesNotMatch(tag[0], /\brequired\b/, id);
  }
});

test('email dialog contains the collapsible SMTP settings section', () => {
  const start = html.indexOf('<div id="modal-email-dialog"');
  const end = html.indexOf('<div id="modal-order-export"');
  const dialog = html.slice(start, end);
  assert.match(dialog, /<div id="email-smtp-settings"[^>]*\bhidden\b/);
  for (const id of ['smtp-server', 'smtp-port', 'smtp-username', 'smtp-password', 'smtp-sender']) {
    assert.match(dialog, new RegExp(`id="${id}"`), id);
  }
  assert.match(dialog, /<input type="password" id="smtp-password"[^>]*autocomplete="off"/);
  for (const action of ['toggleEmailSmtpSettings', 'saveEmailSmtpSettings', 'testEmailSmtpSettings']) {
    assert.match(dialog, new RegExp(`<button type="button"[^>]*data-action-click="${action}"`), action);
  }
});

test('command palette exposes listbox semantics', () => {
  assert.match(html, /id="command-palette-input" role="combobox"[^>]*aria-controls="command-palette-results"/);
  assert.match(html, /id="command-palette-results" role="listbox"/);
  assert.match(html, /data-action-input="onCommandPaletteInput"/);
});

test('voucher print CSS hides the whole modal header and other modals', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const print = css.slice(css.indexOf('@media print'));
  assert.match(print, /#modal-view-voucher \.modal-header/);
  assert.match(print, /\.modal-overlay:not\(#modal-view-voucher\)/);
  assert.match(print, /#voucher-print-area/);
});
