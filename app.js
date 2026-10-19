(function () {
  var NAME_KEY = "wcf_name";
  var RECORDS_KEY = "wcf_records";

  function safeParse(s, fallback) {
    try {
      var v = JSON.parse(s);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  window.WCF = {
    getName: function () {
      try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
    },
    setName: function (n) {
      try { localStorage.setItem(NAME_KEY, (n || "").trim()); } catch (e) {}
    },
    getRecords: function () {
      try { return safeParse(localStorage.getItem(RECORDS_KEY), []) || []; } catch (e) { return []; }
    },
    saveRecords: function (list) {
      try { localStorage.setItem(RECORDS_KEY, JSON.stringify(list || [])); } catch (e) {}
    },
    addRecord: function (rec) {
      var list = WCF.getRecords();
      list.push(rec);
      WCF.saveRecords(list);
      return rec;
    },
    clearAll: function () {
      try { localStorage.removeItem(RECORDS_KEY); } catch (e) {}
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var path = (location.pathname.split("/").pop() || "").toLowerCase();
    if (!path) path = "index.html";

    var LAST_KEY = "wcf_last_chapter";
    var chParam = (new RegExp("[?&]ch=(\\d+)").exec(location.search) || [])[1];
    var isChapter = /^chapter\d+\.html$/.test(path) || (path === "quiz.html" && !!chParam);
    var continueUrl = (path === "quiz.html" && chParam) ? ("quiz.html?ch=" + chParam) : path;
    if (isChapter) {
      try { localStorage.setItem(LAST_KEY, continueUrl); } catch (e) {}
    }

    var cont = document.getElementById("tabContinue");
    if (cont) {
      var last = "quiz.html?ch=1";
      try { last = localStorage.getItem(LAST_KEY) || "quiz.html?ch=1"; } catch (e) {}
      cont.setAttribute("href", last);
    }

    var links = document.querySelectorAll(".tab-item");
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      var href = (el.getAttribute("href") || "").toLowerCase();
      var isCont = el.id === "tabContinue";
      if ((isCont && isChapter) || (!isCont && href === path)) {
        el.classList.add("active");
      }
    }
  });
})();
