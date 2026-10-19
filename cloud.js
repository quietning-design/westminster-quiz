(function () {
  var CFG = {
    url: "https://wvbiqruypzbzfxzaaimm.supabase.co",
    key: "sb_publishable_e9HQFbITRyNLIIGvUg5v0Q_n87Rb9mK",
    table: "results"
  };
  var PENDING_KEY = "wcf_cloud_pending";

  function baseHeaders(extra) {
    var h = { apikey: CFG.key, Authorization: "Bearer " + CFG.key };
    if (extra) { for (var k in extra) { h[k] = extra[k]; } }
    return h;
  }

  function api(path, opts) {
    return fetch(CFG.url + "/rest/v1/" + path, opts).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) { throw new Error("Cloud " + res.status + ": " + t); });
      }
      var ct = res.headers.get("content-type") || "";
      return ct.indexOf("application/json") !== -1 ? res.json() : res.text();
    });
  }

  function isValidChapter(id) {
    return /^ch([1-9]|[12][0-9]|3[0-3])$/.test(id || "");
  }

  function toRow(rec) {
    return {
      name: rec.name || "匿名",
      chapter_id: rec.chapterId,
      chapter_label: rec.chapterLabel || "",
      score: rec.score || 0,
      correct: rec.correct || 0,
      total: rec.total || 0,
      wrong_items: rec.wrongItems || []
    };
  }

  function fromRow(r) {
    if (!isValidChapter(r.chapter_id)) return null;
    return {
      name: r.name,
      chapterId: r.chapter_id,
      chapterLabel: r.chapter_label,
      score: r.score,
      correct: r.correct,
      total: r.total,
      date: r.created_at,
      wrongItems: r.wrong_items || [],
      source: "cloud"
    };
  }

  function readQueue() { try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; } catch (e) { return []; } }
  function writeQueue(list) { try { localStorage.setItem(PENDING_KEY, JSON.stringify(list || [])); } catch (e) {} }

  var Cloud = {
    enabled: !!(CFG.url && CFG.key),

    saveResult: function (rec) {
      if (!Cloud.enabled) return Promise.resolve(false);
      return api(CFG.table, {
        method: "POST",
        headers: baseHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify(toRow(rec))
      }).then(function () { return true; }).catch(function () {
        var q = readQueue(); q.push(rec); writeQueue(q);
        return false;
      });
    },

    fetchAll: function () {
      return api(CFG.table + "?select=*&order=created_at.desc", { headers: baseHeaders() })
        .then(function (rows) { return (rows || []).map(fromRow).filter(Boolean); });
    },

    flushQueue: function () {
      var q = readQueue();
      if (!q.length) return Promise.resolve(0);
      var body = JSON.stringify(q.map(toRow));
      return api(CFG.table, {
        method: "POST",
        headers: baseHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: body
      }).then(function () { writeQueue([]); return q.length; }).catch(function () { return 0; });
    },

    // 合并本机记录与云端记录（同一尝试去重）
    getMergedRecords: function () {
      var local = [];
      try {
        local = (WCF.getRecords() || []).map(function (r) {
          var c = JSON.parse(JSON.stringify(r)); c.source = "local"; return c;
        });
      } catch (e) { local = []; }
      if (!Cloud.enabled) return Promise.resolve(local);
      return Cloud.fetchAll().then(function (cloudRows) {
        var seen = {}, out = [];
        function key(r) {
          var t = Date.parse(r.date || 0); if (isNaN(t)) t = 0;
          return [r.name || "", r.chapterId || "", r.score || 0, Math.round(t / 60000)].join("|");
        }
        cloudRows.concat(local).forEach(function (r) {
          if (!isValidChapter(r.chapterId)) return;
          var k = key(r);
          if (!seen[k]) { seen[k] = 1; out.push(r); }
        });
        return out;
      }).catch(function () { return local; });
    }
  };

  window.Cloud = Cloud;

  document.addEventListener("DOMContentLoaded", function () {
    if (Cloud.enabled) { Cloud.flushQueue(); }
  });
  window.addEventListener("online", function () {
    if (Cloud.enabled) { Cloud.flushQueue(); }
  });
})();
