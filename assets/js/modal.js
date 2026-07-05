/* =====================================================================
   МОДАЛКА «ПОДРОБНЕЕ»
   ---------------------------------------------------------------------
   По кнопке «Подробнее» в карточке услуги открывается окно с подробным
   описанием. Данные берутся из content.js (services[i].details). Если у
   услуги нет details — показывается заглушка (more.placeholder).
   ===================================================================== */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function content() {
    return (window.Customizer && window.Customizer.content) || window.SITE_CONTENT || {};
  }
  function li(t) { return "<li>" + esc(t) + "</li>"; }

  var overlay = document.createElement("div");
  overlay.className = "ds-modal";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="ds-modal__box" role="dialog" aria-modal="true" aria-labelledby="ds-modal-title">' +
      '<button class="ds-modal__close" aria-label="Закрыть">✕</button>' +
      '<h3 class="ds-modal__title" id="ds-modal-title"></h3>' +
      '<div class="ds-modal__body"></div>' +
    "</div>";
  document.body.appendChild(overlay);
  var titleEl = overlay.querySelector(".ds-modal__title");
  var bodyEl = overlay.querySelector(".ds-modal__body");

  function render(svc) {
    var c = content();
    titleEl.textContent = svc.name || "Подробнее";
    var d = svc.details, html = "";
    if (d) {
      if (d.title) html += '<p class="m-lead">' + esc(d.title) + "</p>";
      if (d.steps && d.steps.length) {
        html += "<h4>" + esc(d.stepsTitle || "Порядок действий") + "</h4>" +
                '<ol class="m-steps">' + d.steps.map(li).join("") + "</ol>";
      }
      if (d.bring && d.bring.items) {
        html += "<h4>" + esc(d.bring.title || "Что взять с собой") + "</h4>" +
                '<ul class="m-bring">' + d.bring.items.map(li).join("") + "</ul>";
      }
    } else {
      html = '<p class="m-empty">' +
        esc((c.more && c.more.placeholder) || "Подробное описание скоро появится.") + "</p>";
    }
    bodyEl.innerHTML = html;
  }

  function open(svc) {
    render(svc);
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }
  function close() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(function () { overlay.hidden = true; }, 220);
  }

  document.addEventListener("click", function (e) {
    var moreBtn = e.target.closest ? e.target.closest(".js-more") : null;
    if (moreBtn) {
      var card = moreBtn.closest(".card");
      if (!card) return;
      var cards = Array.prototype.filter.call(card.parentNode.children, function (n) {
        return n.classList && n.classList.contains("card");
      });
      var idx = cards.indexOf(card);
      var svc = (content().services || [])[idx] || {};
      open(svc);
      return;
    }
    if (e.target === overlay || (e.target.closest && e.target.closest(".ds-modal__close"))) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
})();
