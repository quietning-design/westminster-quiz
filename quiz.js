(function () {
  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  var ch = parseInt(qs("ch"), 10);
  var bank = (window.WCF_BANK || {})[ch];

  var META = bank && bank.meta ? bank.meta : { title: "第 " + ch + " 章", label: "第" + ch + "章" };
  var QUESTIONS = bank ? (bank.questions || []) : [];
  var CHAPTER_ID = "ch" + ch;
  var CHAPTER_LABEL = META.label || ("第" + ch + "章");

  var state = {
    mode: "practice",
    singleView: true,
    currentIndex: 0,
    userAnswers: {},
    examSubmitted: false,
    recordSaved: false,
    reviewFilter: "all"
  };

  function el(id) { return document.getElementById(id); }

  function renderAll() {
    renderToolbarStats();
    renderNavGrid();
    renderQuestions();
    renderResultBanner();
  }

  function renderToolbarStats() {
    var answeredKeys = Object.keys(state.userAnswers);
    var answeredCount = answeredKeys.length;
    el("answeredCount").textContent = answeredCount;

    var pct = QUESTIONS.length ? Math.round((answeredCount / QUESTIONS.length) * 100) : 0;
    el("progressBar").style.width = pct + "%";

    var accuracyEl = el("accuracyText");
    if (state.mode === "practice" || state.examSubmitted) {
      if (answeredCount === 0) {
        accuracyEl.textContent = "--";
      } else {
        var correct = 0;
        answeredKeys.forEach(function (id) {
          var q = QUESTIONS.filter(function (x) { return x.id === Number(id); })[0];
          if (q && state.userAnswers[id] === q.answer) correct++;
        });
        var denom = state.examSubmitted ? QUESTIONS.length : answeredCount;
        accuracyEl.textContent = Math.round((correct / denom) * 100) + "% (" + correct + "/" + denom + ")";
      }
    } else {
      accuracyEl.textContent = "交卷后揭晓";
    }

    el("modePracticeBtn").classList.toggle("active", state.mode === "practice");
    el("modeExamBtn").classList.toggle("active", state.mode === "exam");
    el("toggleViewBtn").textContent = state.singleView ? "整卷浏览" : "逐题作答";
    el("examSubmitWrap").style.display =
      state.mode === "exam" && !state.examSubmitted ? "inline-block" : "none";
  }

  function renderNavGrid() {
    var grid = el("navGrid");
    grid.innerHTML = "";
    QUESTIONS.forEach(function (q, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = q.id;

      if (state.singleView && idx === state.currentIndex) btn.classList.add("current");

      var picked = state.userAnswers[q.id];
      var showJudgement = state.mode === "practice" || state.examSubmitted;
      if (picked) {
        if (showJudgement) btn.classList.add(picked === q.answer ? "correct" : "wrong");
        else btn.classList.add("answered");
      } else if (state.examSubmitted) {
        btn.classList.add("wrong");
      }

      btn.onclick = function () {
        state.reviewFilter = "all";
        if (state.singleView) {
          state.currentIndex = idx;
          renderAll();
        } else {
          var card = el("q-card-" + q.id);
          if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      };

      grid.appendChild(btn);
    });
  }

  function renderQuestions() {
    var container = el("questionsContainer");
    container.innerHTML = "";

    var listToRender = QUESTIONS;
    if (!state.singleView && state.reviewFilter === "wrong") {
      listToRender = QUESTIONS.filter(function (q) { return state.userAnswers[q.id] !== q.answer; });
    } else if (state.singleView) {
      listToRender = [QUESTIONS[state.currentIndex]];
    }

    if (!listToRender.length) {
      container.innerHTML = '<div class="card empty">太棒了！当前没有错题记录。<br><button class="btn btn-sm btn-outline" style="margin-top:12px;" onclick="WCFQuiz.filterReview(\'all\')">返回查看全部题目</button></div>';
      return;
    }

    listToRender.forEach(function (q) {
      var picked = state.userAnswers[q.id];
      var reveal = (state.mode === "practice" && !!picked) || state.examSubmitted;

      var card = document.createElement("article");
      card.className = "qcard";
      card.id = "q-card-" + q.id;

      var optionsHtml = "";
      ["A", "B", "C", "D"].forEach(function (key) {
        var cls = "opt";
        if (reveal) {
          if (key === q.answer) cls += " correct";
          else if (picked === key) cls += " wrong";
        } else if (picked === key) {
          cls += " selected";
        }
        var disabledAttr = (state.mode === "practice" && !!picked) || state.examSubmitted ? "disabled" : "";
        optionsHtml += '<button type="button" class="' + cls + '" ' + disabledAttr +
          ' onclick="WCFQuiz.selectOption(' + q.id + ', \'' + key + '\')"><span class="key">' + key +
          '</span><span>' + q.options[key] + '</span></button>';
      });

      var isCorrect = picked === q.answer;
      var statusTitle = isCorrect
        ? "✓ 回答正确（正确答案：" + q.answer + "）"
        : "✗ " + (picked ? "回答有误，您选择了 " + picked : "本题未作答") + "（正确答案：" + q.answer + "）";

      var footerNavHtml = "";
      if (state.singleView) {
        var prevDisabled = state.currentIndex === 0 ? "disabled" : "";
        var isLast = state.currentIndex === QUESTIONS.length - 1;
        var rightButtonHtml = "";

        if (state.mode === "exam" && !state.examSubmitted && isLast) {
          rightButtonHtml = '<button class="btn btn-primary" onclick="WCFQuiz.submitExam()">提交试卷</button>';
        } else {
          var nextDisabled = isLast ? "disabled" : "";
          rightButtonHtml = '<button class="btn btn-primary" ' + nextDisabled + ' onclick="WCFQuiz.goStep(1)">下一题 →</button>';
        }

        footerNavHtml = '<div class="qactions">' +
          '<button class="btn btn-outline" ' + prevDisabled + ' onclick="WCFQuiz.goStep(-1)">← 上一题</button>' +
          '<span class="pos">' + q.id + ' / ' + QUESTIONS.length + '</span>' +
          rightButtonHtml + '</div>';
      }

      card.innerHTML =
        '<div class="q-head"><span class="q-num">第 ' + q.id + ' 题</span>' +
        '<span class="q-tag">' + q.section + '</span></div>' +
        '<h2 class="q-title">' + q.question + '</h2>' +
        '<div class="options">' + optionsHtml + '</div>' +
        '<div class="explain ' + (reveal ? "visible" : "") + '">' +
        '<div class="explain-head ' + (isCorrect ? "is-correct" : "is-wrong") + '">' + statusTitle + '</div>' +
        '<div><strong>神学解析：</strong>' + q.explanation + '</div></div>' +
        footerNavHtml;

      container.appendChild(card);
    });
  }

  function renderResultBanner() {
    var banner = el("resultBanner");
    var allAnsweredInPractice =
      state.mode === "practice" && Object.keys(state.userAnswers).length === QUESTIONS.length;

    if (!state.examSubmitted && !allAnsweredInPractice) {
      banner.classList.remove("visible");
      return;
    }

    var correctCount = 0;
    QUESTIONS.forEach(function (q) {
      if (state.userAnswers[q.id] === q.answer) correctCount++;
    });
    var wrongCount = QUESTIONS.length - correctCount;
    var score = QUESTIONS.length ? Math.round(correctCount * (100 / QUESTIONS.length)) : 0;

    var feedback = "";
    if (score >= 90) feedback = "卓越！您对" + CHAPTER_LABEL + "的教义脉络与细节掌握得非常扎实！";
    else if (score >= 80) feedback = "良好！您已准确把握本章核心原则，可针对少量错题进一步巩固。";
    else if (score >= 60) feedback = "及格！建议对照本章原文与解析，重点复习容易混淆的教义概念。";
    else feedback = "建议仔细研读本章条文及每道题下方的神学解析后再测一次。";

    el("finalScoreText").textContent = score + " 分（答对 " + correctCount + "/" + QUESTIONS.length + " 题）";
    el("finalFeedbackText").textContent = feedback;
    el("wrongCountBtn").textContent = wrongCount;
    banner.classList.add("visible");
  }

  function selectOption(questionId, optionKey) {
    if (state.examSubmitted) return;
    if (state.mode === "practice" && state.userAnswers[questionId]) return;

    state.userAnswers[questionId] = optionKey;
    renderAll();
    saveAttemptIfNeeded();

    if (state.mode === "exam" && state.singleView && state.currentIndex < QUESTIONS.length - 1) {
      setTimeout(function () {
        if (state.mode === "exam" && !state.examSubmitted) {
          state.currentIndex++;
          renderAll();
        }
      }, 220);
    }
  }

  function goStep(delta) {
    var next = state.currentIndex + delta;
    if (next >= 0 && next < QUESTIONS.length) {
      state.currentIndex = next;
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function setMode(newMode) {
    if (state.mode === newMode) return;
    state.mode = newMode;
    state.examSubmitted = false;
    state.reviewFilter = "all";
    renderAll();
  }

  function toggleLayoutView() {
    state.singleView = !state.singleView;
    renderAll();
  }

  function submitExam() {
    var answeredCount = Object.keys(state.userAnswers).length;
    if (answeredCount < QUESTIONS.length) {
      var unAnswered = QUESTIONS.length - answeredCount;
      if (!confirm("您还有 " + unAnswered + " 道题尚未作答，确定现在交卷吗？")) return;
    }
    state.examSubmitted = true;
    state.singleView = false;
    renderAll();
    saveAttemptIfNeeded();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function filterReview(type) {
    state.singleView = false;
    state.reviewFilter = type;
    renderAll();
  }

  function resetQuiz() {
    state.userAnswers = {};
    state.currentIndex = 0;
    state.examSubmitted = false;
    state.recordSaved = false;
    state.reviewFilter = "all";
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ===== 考生姓名与成绩记录（本机 localStorage，键名保持不变） =====
  function onNameInput(val) {
    WCF.setName(val);
  }

  function ensureName() {
    var name = (WCF.getName() || "").trim();
    if (!name) {
      var typed = window.prompt("请输入你的姓名（用于记录成绩与个人错题集）：", "");
      if (typed !== null) {
        name = typed.trim();
        WCF.setName(name);
        var input = el("examineeName");
        if (input) input.value = name;
      }
    }
    return name || "匿名";
  }

  function buildRecord() {
    var correct = 0;
    var wrongItems = [];
    QUESTIONS.forEach(function (q) {
      var picked = state.userAnswers[q.id] || null;
      if (picked === q.answer) {
        correct++;
      } else {
        wrongItems.push({
          id: q.id, section: q.section, question: q.question,
          options: q.options, answer: q.answer, explanation: q.explanation, picked: picked
        });
      }
    });
    return {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: ensureName(),
      chapterId: CHAPTER_ID,
      chapterLabel: CHAPTER_LABEL,
      score: QUESTIONS.length ? Math.round(correct * (100 / QUESTIONS.length)) : 0,
      correct: correct,
      total: QUESTIONS.length,
      date: new Date().toISOString(),
      wrongItems: wrongItems
    };
  }

  function saveAttemptIfNeeded() {
    if (state.recordSaved) return;
    var answeredAll = Object.keys(state.userAnswers).length === QUESTIONS.length;
    var shouldSave = state.examSubmitted || (state.mode === "practice" && answeredAll);
    if (!shouldSave || !QUESTIONS.length) return;
    ensureName();
    state.recordSaved = true;
    var rec = buildRecord();
    WCF.addRecord(rec);
    if (window.Cloud && Cloud.enabled) { Cloud.saveResult(rec); }
  }

  window.addEventListener("keydown", function (e) {
    if (!state.singleView) return;
    var currentQ = QUESTIONS[state.currentIndex];
    if (!currentQ) return;
    var key = e.key.toUpperCase();
    if (["A", "B", "C", "D"].indexOf(key) !== -1) {
      selectOption(currentQ.id, key);
    } else if (e.key === "ArrowRight") {
      goStep(1);
    } else if (e.key === "ArrowLeft") {
      goStep(-1);
    }
  });

  // 暴露给 HTML 内联事件
  window.WCFQuiz = {
    selectOption: selectOption,
    goStep: goStep,
    setMode: setMode,
    toggleLayoutView: toggleLayoutView,
    submitExam: submitExam,
    filterReview: filterReview,
    resetQuiz: resetQuiz,
    onNameInput: onNameInput
  };

  document.addEventListener("DOMContentLoaded", function () {
    var title = document.querySelector(".appbar-title");
    if (title) title.textContent = META.title || META.label;

    var crumb = el("chapterCrumb");
    if (crumb) crumb.textContent = META.label;

    var input = el("examineeName");
    if (input) input.value = WCF.getName() || "";

    if (!bank) {
      el("questionsContainer").innerHTML =
        '<div class="card empty">该章节的测试题尚未上线，敬请期待。</div>';
      var qn = el("quizShell");
      if (qn) qn.style.display = "none";
      return;
    }

    renderAll();
  });
})();
