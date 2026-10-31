// Bộ điều phối sự kiện uỷ quyền, tương thích CSP (script-src 'self', không 'unsafe-inline').
//
// Thay thế các thuộc tính sự kiện nội tuyến (on<sự kiện> = "fn('a')") bằng thuộc tính dữ liệu khai báo:
//   data-action-<sự kiện>="tenHam"          ví dụ data-action-click="switchTab"
//   data-args='["dashboard"]'               đối số dạng mảng JSON (dùng chung)
//   data-args-<sự kiện>='[...]'             đối số riêng cho từng sự kiện (ưu tiên hơn data-args)
//   data-prevent-default                    gọi event.preventDefault() (tương đương `return false`)
//
// Token đặc biệt trong mảng đối số:
//   "$event"        -> đối tượng sự kiện (currentTarget trỏ tới phần tử khai báo, như handler nội tuyến)
//   "$this"         -> phần tử khai báo
//   "$this.value"   -> giá trị phần tử tại thời điểm sự kiện
//   "$this.checked" -> trạng thái checked tại thời điểm sự kiện
//
// Tên hàm được tra cứu lúc sự kiện xảy ra: trước hết trong các handler có tên của module này,
// sau đó trên window (hàm toàn cục do các script sau khai báo), hỗ trợ đường dẫn dạng "utils.fn".
// Mỗi loại sự kiện chỉ đăng ký MỘT listener trên document, ở pha capture, để handler khai báo
// chạy trước các listener gắn trực tiếp vào phần tử (giống thứ tự của thuộc tính nội tuyến).
(function (root) {
  'use strict';

  // Sự kiện khai báo -> sự kiện DOM thực tế lắng nghe trên document.
  // focus/blur không nổi bọt nên dùng focusin/focusout và chỉ khớp chính phần tử đích.
  const EVENT_MAP = {
    click: { domType: 'click', bubbles: true },
    dblclick: { domType: 'dblclick', bubbles: true },
    contextmenu: { domType: 'contextmenu', bubbles: true },
    change: { domType: 'change', bubbles: true },
    input: { domType: 'input', bubbles: true },
    submit: { domType: 'submit', bubbles: true },
    keydown: { domType: 'keydown', bubbles: true },
    keyup: { domType: 'keyup', bubbles: true },
    focus: { domType: 'focusin', bubbles: false },
    blur: { domType: 'focusout', bubbles: false }
  };

  const TOKENS = new Set(['$event', '$this', '$this.value', '$this.checked']);

  // Handler có tên cho các biểu thức không diễn đạt được bằng dạng gọi hàm chung.
  const namedHandlers = {
    // Tương đương: document.getElementById('attach-file-input').click()
    clickAttachFileInput() {
      document.getElementById('attach-file-input').click();
    }
  };

  // Các biến toàn cục khai báo bằng const/let (không nằm trên window) nhưng được handler dùng tới.
  function resolveLexicalGlobal(name) {
    if (name === 'utils') return typeof utils !== 'undefined' ? utils : undefined; // eslint-disable-line no-undef
    return undefined;
  }

  function parseArgs(raw) {
    if (raw == null || raw === '') return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError('data-args phải là mảng JSON');
    return parsed;
  }

  // Trả về { fn, thisArg } hoặc null nếu không tìm thấy hàm.
  function resolveAction(name, scope) {
    if (typeof name !== 'string' || !name) return null;
    if (Object.prototype.hasOwnProperty.call(namedHandlers, name)) {
      return { fn: namedHandlers[name], thisArg: undefined };
    }
    const parts = name.split('.');
    const globalScope = scope || root;
    let owner;
    let value = globalScope && parts[0] in Object(globalScope)
      ? globalScope[parts[0]]
      : resolveLexicalGlobal(parts[0]);
    for (let i = 1; i < parts.length; i += 1) {
      if (value == null) return null;
      owner = value;
      value = value[parts[i]];
    }
    if (typeof value !== 'function') return null;
    return { fn: value, thisArg: owner };
  }

  // Bọc sự kiện để currentTarget là phần tử khai báo trong lúc gọi đồng bộ (sau đó là null,
  // đúng như event.currentTarget của handler nội tuyến sau khi dispatch kết thúc).
  function wrapEvent(event, element, state) {
    if (typeof Proxy !== 'function') return event;
    return new Proxy(event, {
      get(target, prop) {
        if (prop === 'currentTarget') return state.dispatching ? element : null;
        const value = Reflect.get(target, prop, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, prop, value) {
        return Reflect.set(target, prop, value, target);
      }
    });
  }

  function resolveArgs(args, event, element, state) {
    let wrapped;
    return args.map(arg => {
      if (typeof arg !== 'string' || !TOKENS.has(arg)) return arg;
      if (arg === '$event') return wrapped || (wrapped = wrapEvent(event, element, state));
      if (arg === '$this') return element;
      if (arg === '$this.value') return element.value;
      return element.checked;
    });
  }

  function reportHandlerError(error) {
    if (typeof root.reportError === 'function') root.reportError(error);
    else setTimeout(() => { throw error; }, 0);
  }

  function invoke(element, type, event) {
    // Submit: luôn chặn gửi form gốc TRƯỚC khi tra hàm/đọc đối số, để lỗi tra cứu hoặc JSON hỏng
    // không làm trang điều hướng (tải lại index.html và mất dữ liệu đang nhập).
    if (type === 'submit' && typeof event.preventDefault === 'function') event.preventDefault();
    const name = element.getAttribute(`data-action-${type}`);
    const resolved = resolveAction(name);
    if (!resolved) {
      console.error(`[domActions] Không tìm thấy hàm "${name}" cho sự kiện ${type}`, element);
      return;
    }
    if (element.hasAttribute('data-prevent-default')) event.preventDefault();
    const state = { dispatching: true };
    try {
      const rawArgs = element.hasAttribute(`data-args-${type}`)
        ? element.getAttribute(`data-args-${type}`)
        : element.getAttribute('data-args');
      const args = resolveArgs(parseArgs(rawArgs), event, element, state);
      resolved.fn.apply(resolved.thisArg, args);
    } catch (error) {
      console.error(`[domActions] Lỗi khi gọi "${name}" cho sự kiện ${type}`, error);
      reportHandlerError(error);
    } finally {
      state.dispatching = false;
    }
  }

  function createListener(type, bubbles) {
    const attr = `data-action-${type}`;
    return function (event) {
      let node = event.target;
      if (!bubbles) {
        if (node && node.nodeType === 1 && node.hasAttribute(attr)) invoke(node, type, event);
        return;
      }
      while (node && node !== root.document) {
        if (node.nodeType === 1 && node.hasAttribute(attr)) {
          invoke(node, type, event);
          if (event.cancelBubble) break;
        }
        node = node.parentNode;
      }
    };
  }

  function install(doc) {
    Object.keys(EVENT_MAP).forEach(type => {
      const { domType, bubbles } = EVENT_MAP[type];
      doc.addEventListener(domType, createListener(type, bubbles), true);
    });
  }

  const api = { EVENT_MAP, namedHandlers, parseArgs, resolveAction, resolveArgs, wrapEvent, createListener, install };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.domActions = api;
    if (root.document) install(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
