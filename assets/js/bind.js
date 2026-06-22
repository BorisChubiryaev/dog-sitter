/* =====================================================================
   DSBind — наполнение HTML-разметки данными из content.js
   ---------------------------------------------------------------------
   Все три варианта дизайна используют один и тот же набор атрибутов:
     data-text="path"     — вставить текст
     data-html="path"     — вставить HTML
     data-href="path"     — ссылка href
     data-tel="path"      — телефонная ссылка tel:
     data-photo="path"    — фото; если пусто — красивый слот-заглушка
     data-label="..."     — подпись для слота-заглушки
     data-section="key"   — раздел; прячется, если выключен в настройках
     data-repeat="path"   — повторитель; внутри должен лежать <template>
   Путь "." внутри повторителя означает «текущий элемент списка».
   ===================================================================== */
(function () {
  "use strict";

  var CURRENT = {};

  function getPath(obj, path) {
    if (path === "." || path === "") return obj;
    return path.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, obj);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function photoMarkup(val, label) {
    if (val) return '<img class="photo-img" src="' + esc(val) + '" alt="' + esc(label || "") + '">';
    return '<div class="photo-slot" data-label="' + esc(label || "Вставьте фото") + '">' +
           '<span class="paw">🐾</span></div>';
  }

  function applyTo(node, ctx) {
    var v;
    if (node.hasAttribute("data-text")) {
      node.textContent = getPath(ctx, node.getAttribute("data-text")) || "";
    }
    if (node.hasAttribute("data-html")) {
      node.innerHTML = getPath(ctx, node.getAttribute("data-html")) || "";
    }
    if (node.hasAttribute("data-href")) {
      v = getPath(ctx, node.getAttribute("data-href"));
      if (v) node.setAttribute("href", v);
    }
    if (node.hasAttribute("data-tel")) {
      v = getPath(ctx, node.getAttribute("data-tel"));
      if (v) node.setAttribute("href", "tel:" + String(v).replace(/[^\d+]/g, ""));
    }
    if (node.hasAttribute("data-photo")) {
      v = getPath(ctx, node.getAttribute("data-photo"));
      node.innerHTML = photoMarkup(v, node.getAttribute("data-label"));
    }
    if (node.hasAttribute("data-section")) {
      var hidden = (CURRENT.hidden || {})[node.getAttribute("data-section")];
      node.style.display = hidden ? "none" : "";
    }
  }

  function processRepeat(node, ctx) {
    var arr = getPath(ctx, node.getAttribute("data-repeat")) || [];
    var tpl = node.querySelector("template");
    if (!tpl) return;
    (node.__rendered || []).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    node.__rendered = [];
    arr.forEach(function (item) {
      var frag = tpl.content.cloneNode(true);
      var nodes = Array.prototype.slice.call(frag.childNodes);
      nodes.forEach(function (n) { if (n.nodeType === 1) walk(n, item); });
      nodes.forEach(function (n) { node.appendChild(n); if (n.nodeType === 1) node.__rendered.push(n); });
    });
  }

  function walk(node, ctx) {
    if (node.nodeType !== 1) return;
    if (node.hasAttribute("data-repeat")) { processRepeat(node, ctx); return; }
    applyTo(node, ctx);
    var child = node.firstElementChild;
    while (child) {
      var next = child.nextElementSibling;
      if (child.tagName !== "TEMPLATE") walk(child, ctx);
      child = next;
    }
  }

  window.DSBind = {
    render: function (content, root) {
      CURRENT = content || {};
      walk(root || document.body, CURRENT);
    }
  };
})();
