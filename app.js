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
})();
