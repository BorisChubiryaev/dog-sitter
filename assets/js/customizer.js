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
  function deepMerge(base, over) {
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (var k in over) {
      if (!Object.prototype.hasOwnProperty.call(over, k)) continue;
      if (isObj(out[k]) && isObj(over[k])) out[k] = deepMerge(out[k], over[k]);
      else out[k] = over[k];
    }
    return out;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(o, p) { return p.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) {
    var keys = p.split("."), last = keys.pop();
    var t = keys.reduce(function (a, k) { if (a[k] == null) a[k] = {}; return a[k]; }, o);
    t[last] = v;
  }

  /* ---- состояние ---- */
  var base = window.SITE_CONTENT || {};
  var overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) {}
  var content = deepMerge(base, overrides);

  function saveOverride(path, value) {
    setPath(overrides, path, value);
    setPath(content, path, value);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); } catch (e) {}
    rerender();
  }

  function rerender() {
    applyTheme();
    if (typeof window.renderSite === "function") window.renderSite(content);
    refreshToggleStates();
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
