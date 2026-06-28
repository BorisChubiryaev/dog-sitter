/* =====================================================================
   ПАНЕЛЬ НАСТРОЕК ⚙  +  ПЕРЕКЛЮЧАТЕЛЬ ВАРИАНТОВ
   ---------------------------------------------------------------------
   Позволяет заказчице менять тексты, цены, телефон, цвета и прятать
   разделы прямо в браузере, без правки кода. Изменения сохраняются
   в браузере (localStorage) и применяются ко всем вариантам дизайна.
   Кнопка «Скачать настройки» отдаёт файл, который можно прислать
   разработчику, чтобы зафиксировать правки навсегда.
   ===================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "dogsitter_overrides_v1";

  /* ---- глубокое слияние объектов ---- */
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
  // Глубокое слияние с корректной поддержкой массивов (для списков услуг и т.п.)
  function deepMerge(base, over) {
    if (Array.isArray(base) && Array.isArray(over)) {
      var arr = base.slice();
      for (var i = 0; i < over.length; i++) {
        if (over[i] == null) continue; // пропуски в массиве не затирают исходное
        arr[i] = deepMerge(base[i], over[i]);
      }
      return arr;
    }
    if (isObj(base) && isObj(over)) {
      var out = Object.assign({}, base);
      for (var k in over) {
        if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
        if (over[k] == null) continue;
        out[k] = deepMerge(k in base ? base[k] : undefined, over[k]);
      }
      return out;
    }
    return over;
  }
  function getPath(o, p) { return p.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) {
    var keys = p.split(".");
    var t = o;
    for (var i = 0; i < keys.length - 1; i++) {
      var k = keys[i];
      if (t[k] == null) t[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      t = t[k];
    }
    t[keys[keys.length - 1]] = v;
  }

  /* ---- состояние ---- */
  var base = window.SITE_CONTENT || {};
  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) {}
  var content = deepMerge(base, overrides);
  var editMode = false;

  function saveOverride(path, value, skipRender) {
    setPath(overrides, path, value);
    setPath(content, path, value);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch (e) {}
    if (!skipRender) rerender();
  }

  function rerender() {
    applyTheme();
    if (typeof window.renderSite === "function") window.renderSite(content);
    refreshToggleStates();
    if (editMode) applyEditMode();
  }

  /* ---- режим редактирования текста прямо на странице ---- */
  function applyEditMode() {
    var nodes = document.querySelectorAll("#site [data-fullpath]");
    Array.prototype.forEach.call(nodes, function (el) {
      if (editMode) {
        el.setAttribute("contenteditable", "true");
        el.classList.add("cz-editing");
        if (!el.__editHooked) {
          el.__editHooked = true;
          el.addEventListener("blur", function () {
            var p = el.getAttribute("data-fullpath");
            if (p) saveOverride(p, el.textContent.replace(/\s+/g, " ").trim(), true);
          });
          el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); }
          });
        }
      } else {
        el.removeAttribute("contenteditable");
        el.classList.remove("cz-editing");
      }
    });
  }

  /* ---- тема / цвета ---- */
  var THEME_VARS = [
    ["primary", "--c-primary", "Основной"],
    ["accent",  "--c-accent",  "Акцент"],
    ["bg",      "--c-bg",      "Фон"],
    ["surface", "--c-surface", "Карточки"],
    ["text",    "--c-text",    "Текст"]
  ];
  function applyTheme() {
    var t = content.theme || {};
    THEME_VARS.forEach(function (v) {
      if (t[v[0]]) document.documentElement.style.setProperty(v[1], t[v[0]]);
    });
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000000";
  }
  function toHex(c) {
    // приводим rgb(...) к #rrggbb для <input type=color>
    if (!c) return "#000000";
    if (c[0] === "#") return c.length === 4
      ? "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c;
    var m = c.match(/\d+/g);
    if (!m) return "#000000";
    return "#" + m.slice(0, 3).map(function (n) { return ("0" + (+n).toString(16)).slice(-2); }).join("");
  }

  /* ===================================================================
     ПОСТРОЕНИЕ ПАНЕЛИ
     =================================================================== */
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  // Текстовые поля: [label, path, multiline?]
  var TEXT_FIELDS_BRAND = [
    ["Название", "brand.name"],
    ["Слоган", "brand.slogan"],
    ["Город", "brand.city"],
    ["Телефон", "brand.phone"],
    ["Логотип (ссылка на файл)", "brand.logo"]
  ];
  var TEXT_FIELDS_HERO = [
    ["Заголовок", "hero.title", true],
    ["Подзаголовок", "hero.subtitle", true],
    ["Фото на главном (ссылка)", "hero.img"]
  ];
  var TEXT_FIELDS_LINKS = [
    ["ВКонтакте", "links.vk"],
    ["Telegram", "links.telegram"],
    ["Instagram", "links.instagram"],
    ["Ссылка на анкету", "links.form"]
  ];

  // Разделы, которые можно прятать: [label, ключ]
  var SECTIONS = [
    ["Услуги", "services"],
    ["Стандарт заботы", "care"],
    ["Внутренняя академия", "academy"],
    ["Полезное / чек-лист", "useful"],
    ["Отзывы", "reviews"]
  ];

  function field(label, path, multiline) {
    var wrap = el("div", { class: "cz-field" });
    wrap.appendChild(el("label", null, label));
    var input = multiline ? el("textarea", { rows: "3" }) : el("input", { type: "text" });
    input.value = getPath(content, path) || "";
    input.addEventListener("input", function () { saveOverride(path, input.value); });
    wrap.appendChild(input);
    return wrap;
  }

  function group(title, fields) {
    var g = el("div", { class: "cz-group" });
    g.appendChild(el("h3", null, title));
    fields.forEach(function (f) { g.appendChild(field(f[0], f[1], f[2])); });
    return g;
  }

  function colorsGroup() {
    var g = el("div", { class: "cz-group" });
    g.appendChild(el("h3", null, "Цвета"));
    var row = el("div", { class: "cz-colors" });
    THEME_VARS.forEach(function (v) {
      var box = el("div", { class: "cz-color" });
      var saved = content.theme && content.theme[v[0]];
      var input = el("input", { type: "color" });
      input.value = toHex(saved || cssVar(v[1]));
      input.addEventListener("input", function () { saveOverride("theme." + v[0], input.value); });
      box.appendChild(input);
      box.appendChild(document.createTextNode(v[2]));
      g.appendChild(row);
      row.appendChild(box);
    });
    return g;
  }

  var toggleInputs = {};
  function sectionsGroup() {
    var g = el("div", { class: "cz-group" });
    g.appendChild(el("h3", null, "Показывать разделы"));
    SECTIONS.forEach(function (s) {
      var hidden = (content.hidden || {})[s[1]];
      var row = el("div", { class: "cz-toggle" });
      row.appendChild(el("span", null, s[0]));
      var sw = el("label", { class: "cz-switch" });
      var input = el("input", { type: "checkbox" });
      input.checked = !hidden;
      input.addEventListener("change", function () {
        saveOverride("hidden." + s[1], !input.checked);
      });
      toggleInputs[s[1]] = input;
      sw.appendChild(input);
      sw.appendChild(el("span", { class: "cz-slider" }));
      row.appendChild(sw);
      g.appendChild(row);
    });
    return g;
  }
  function refreshToggleStates() {
    for (var k in toggleInputs) {
      toggleInputs[k].checked = !((content.hidden || {})[k]);
    }
  }

  function buildPanel() {
    var panel = el("aside", { class: "cz-panel", "aria-label": "Настройки сайта" });

    var head = el("div", { class: "cz-head" });
    head.appendChild(el("h2", null, "⚙ Настройки сайта"));
    var close = el("button", { class: "cz-close", "aria-label": "Закрыть" }, "✕");
    close.addEventListener("click", function () { panel.classList.remove("open"); });
    head.appendChild(close);

    var body = el("div", { class: "cz-body" });

    // Режим редактирования текста на странице
    var editGroup = el("div", { class: "cz-group" });
    editGroup.appendChild(el("h3", null, "Тексты на странице"));
    var editBtn = el("button", { class: "cz-btn primary", style: "width:100%" }, "✏️ Редактировать текст");
    editBtn.addEventListener("click", function () {
      editMode = !editMode;
      editBtn.textContent = editMode ? "✓ Готово" : "✏️ Редактировать текст";
      editBtn.classList.toggle("primary", !editMode);
      editBtn.classList.toggle("ghost", editMode);
      applyEditMode();
      if (editMode) panel.classList.remove("open");
    });
    editGroup.appendChild(editBtn);
    editGroup.appendChild(el("p", { class: "cz-mini" },
      "Включите и кликайте по любому тексту на сайте (заголовки, услуги, цены, отзывы) — и меняйте его. Enter — применить."));
    body.appendChild(editGroup);

    body.appendChild(group("Бренд", TEXT_FIELDS_BRAND));
    body.appendChild(group("Главный экран", TEXT_FIELDS_HERO));
    body.appendChild(colorsGroup());
    body.appendChild(sectionsGroup());
    body.appendChild(group("Ссылки", TEXT_FIELDS_LINKS));

    var hint = el("p", { class: "cz-hint" },
      "Изменения сохраняются в этом браузере. «Скачать настройки» — отдайте файл разработчику, чтобы зафиксировать навсегда.");

    var foot = el("div", { class: "cz-foot" });
    var exportBtn = el("button", { class: "cz-btn primary" }, "⬇ Скачать настройки");
    exportBtn.addEventListener("click", exportOverrides);
    var resetBtn = el("button", { class: "cz-btn ghost" }, "Сбросить");
    resetBtn.addEventListener("click", resetAll);
    foot.appendChild(exportBtn);
    foot.appendChild(resetBtn);

    panel.appendChild(head);
    panel.appendChild(body);
    panel.appendChild(hint);
    panel.appendChild(foot);

    var fab = el("button", { class: "cz-fab", "aria-label": "Открыть настройки", title: "Настроить сайт" }, "⚙");
    fab.addEventListener("click", function () { panel.classList.toggle("open"); });

    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }

  function exportOverrides() {
    var data = JSON.stringify(overrides, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var a = el("a", { href: URL.createObjectURL(blob), download: "dog-sitter-настройки.json" });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function resetAll() {
    if (!confirm("Сбросить все ваши изменения к стандартным?")) return;
    overrides = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  }

  /* ===================================================================
     ПЕРЕКЛЮЧАТЕЛЬ ВАРИАНТОВ (верхняя лента)
     =================================================================== */
  function buildVariantBar(current) {
    var variants = [
      ["comic", "Комиксовый"],
      ["modern", "Современный"],
      ["cozy", "Уютный"]
    ];
    var bar = el("nav", { class: "variant-bar" });
    bar.appendChild(el("span", { class: "label" }, "Дизайн:"));
    variants.forEach(function (v) {
      var a = el("a", { href: "../" + v[0] + "/" }, v[1]);
      if (v[0] === current) a.className = "active";
      bar.appendChild(a);
    });
    var home = el("a", { href: "../../index.html", style: "margin-left:auto" }, "← Все варианты");
    bar.appendChild(home);
    document.body.appendChild(bar);
    document.body.classList.add("has-variant-bar");
  }

  /* ---- публичный API ---- */
  window.Customizer = {
    content: content,
    init: function (variantId) {
      applyTheme();
      buildVariantBar(variantId);
      if (typeof window.renderSite === "function") window.renderSite(content);
      buildPanel();
    }
  };
})();
