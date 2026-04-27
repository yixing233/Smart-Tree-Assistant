// ==UserScript==
// @name         智慧树习题助手
// @namespace    https://ai-smart-course-student-pro.zhihuishu.com/
// @version      0.5.4
// @downloadURL  https://file.157342.xyz/api/share-bundles/eezU28mJLSisXVyhP-BVPmOO/files/6/download/zhihuishu-exam-helper.user.js
// @updateURL    https://file.157342.xyz/api/share-bundles/eezU28mJLSisXVyhP-BVPmOO/files/6/download/zhihuishu-exam-helper.user.js
// @description  一个基于智慧树AI课程平台开发的脚本, 能够自动完成所有习题, 如有bug, 请前往GitHub提交issues.
// @author       xchengb
// @match        https://studentexamcomh5.zhihuishu.com/studentReviewTestOrExam/*
// @match        https://ai-smart-course-student-pro.zhihuishu.com/point/*
// @match        https://ai-smart-course-student-pro.zhihuishu.com/examPreview/*
// @match        https://ai-smart-course-student-pro.zhihuishu.com/mySpace*
// @match        https://ai.zhihuishu.com/AIstudent/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      kg-ai-run.zhihuishu.com
// @connect      tree.157342.xyz
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  const API_BASE = "https://kg-ai-run.zhihuishu.com/run/gateway/t/stu";
  const API_BASE_COMMON =
    "https://kg-ai-run.zhihuishu.com/run/gateway/t/common";
  const API_DIC = `${API_BASE}/knowledge-study/get-course-knowledge-dic`;
  const API_THEME = `${API_BASE}/knowledge-study/list-knowledge-theme`;
  const API_THEME_NODE = `${API_BASE}/maptree/get-theme-node-list`;
  const API_MODULE_INFO = `${API_BASE_COMMON}/course/query-module-info`;
  const API_THEME_LIST_COMMON = `${API_BASE_COMMON}/course/knowledge/theme-list`;
  const API_QUESTIONS_PAPER = `${API_BASE}/exam/questions-paper`;
  const API_OPEN_EXAM =
    "https://studentexamtest.zhihuishu.com/gateway/t/v1/exam/user/openExam";
  const API_EXAM_SHEET_INFO =
    "https://studentexamtest.zhihuishu.com/gateway/t/v1/exam/user/getExamSheetInfo";
  const API_EXAM_USER_INFO =
    "https://studentexamtest.zhihuishu.com/gateway/t/v1/exam/user/getExamTestUserInfo";
  const API_EXAM_QUESTION_INFO =
    "https://studentexamtest.zhihuishu.com/gateway/t/v1/question/getExamQuestionInfo";
  const CACHE_VERSION = "0.3.1";
  const CACHE_PREFIX = "zs-knowledge-capture-cache";
  const PENDING_RESOURCE_PREFIX = "zs-knowledge-capture-pending-resource";
  const ACTIVE_RESOURCE_HINT_PREFIX =
    "zs-knowledge-capture-active-resource-hint";
  const AUTOMATION_STATE_PREFIX = "zs-knowledge-capture-automation";
  const VIDEO_CONTROL_AUTO_MUTE_PREFIX = "zs-knowledge-video-auto-mute";
  const VIDEO_SEEK_HINT_PREFIX = "zs-knowledge-video-seek-hint";
  const AUTOMATION_MASK_PREFIX = "zs-knowledge-automation-mask";
  const EXAM_PENDING_SUBMITTED_PREFIX = "zs-exam-pending-submitted";
  const EXAM_CACHE_PREFIX = "zs-exam-link-cache";
  const EXAM_CACHE_VERSION = "1.1.0";
  const EXAM_CACHE_TTL_ROWS = 6 * 60 * 60 * 1000;
  const EXAM_CACHE_TTL_QP = 24 * 60 * 60 * 1000;
  const EXAM_CACHE_TTL_QUESTION = 24 * 60 * 60 * 1000;
  const EXAM_CACHE_TTL_USER = 24 * 60 * 60 * 1000;
  const EXAM_QA_USER_INFO_SHARED_KEY = `${EXAM_CACHE_PREFIX}:qa-user-info:latest`;
  const EXAM_PENDING_SUBMITTED_TTL_MS = 15 * 60 * 1000;
  const EXAM_CACHE_MAX_QP_ENTRIES = 2500;
  const EXAM_CACHE_MAX_QUESTION_ENTRIES = 1500;
  const EXAM_QUESTION_ROW_CONCURRENCY = 6;
  const EXAM_QUESTION_DETAIL_CONCURRENCY = 10;
  const EXAM_QA_API_BASE_PROD = "https://tree.157342.xyz";
  const EXAM_QA_API_BASE = EXAM_QA_API_BASE_PROD;
  const EXAM_QA_API_BASE_STORAGE_KEY = "zs-exam-query-base";
  function getExamQaBaseCandidates() {
    const primary = String(EXAM_QA_API_BASE || "").trim();
    const list = [];
    const push = (value) => {
      const v = String(value || "")
        .trim()
        .replace(/\/+$/, "");
      if (!v) return;
      if (!list.includes(v)) list.push(v);
    };
    const pushMany = (value) => {
      if (Array.isArray(value)) {
        value.forEach(pushMany);
        return;
      }
      const text = String(value || "").trim();
      if (!text) return;
      text.split(/[\s,;\n|]+/).forEach(push);
    };
    try {
      pushMany(
        typeof GM_getValue === "function"
          ? GM_getValue(EXAM_QA_API_BASE_STORAGE_KEY, "")
          : "",
      );
    } catch {}
    try {
      pushMany(localStorage.getItem(EXAM_QA_API_BASE_STORAGE_KEY) || "");
    } catch {}
    try {
      const search = new URLSearchParams(location.search);
      pushMany(search.get("examQaBase") || search.get("examQaBases") || "");
    } catch {}
    push(primary);
    return list;
  }
  const EXAM_QA_TOKEN_STORAGE_KEY = "zs-exam-query-token";
  const EXAM_QA_IP_STORAGE_KEY = "zs-exam-query-ip";
  const EXAM_QA_CACHE_TTL_MS = 10 * 60 * 1000;
  const LAST_EXAM_PAGE_URL_KEY = "zs-last-exam-page-url";
  const AI_STUDENT_EXAM_RETURN_FALLBACKS = {
    "2034202256169570304:193961":
      "https://studentexamcomh5.zhihuishu.com/studentReviewTestOrExam/2619737/1/1/2034202256169570304/JTIyJUU2JTk2JUIwJUU2JTk3JUI2JUU0JUJCJUEzJUU1JTlEJTlBJUU2JThDJTgxJUU1JTkyJThDJUU1JThGJTkxJUU1JUIxJTk1JUU0JUI4JUFEJUU1JTlCJUJEJUU3JTg5JUI5JUU4JTg5JUIyJUU3JUE0JUJFJUU0JUJDJTlBJUU0JUI4JUJCJUU0JUI5JTg5JUU3JTlBJTg0JUU2JThDJTg3JUU1JUFGJUJDJUU2JTgwJTlEJUU2JTgzJUIzJTIy/1/true/true/true/1?mapUid=&foAiRun=1&point=1&classId=193961&pointId=1913058728184594432&paperId=278731593&examPaperId=278731593&reviewQ=2",
  };
  const CAPTURED_RESPONSES = [];
  const CAPTURED_TRAFFIC = [];
  let HOOK_INSTALLED = false;
  const PAGE_CRYPTO_KEY_CACHE = new Map();

  /* GIF_FRAME_DATA_START */
  const LOADER_GIF_FRAME_DURATIONS = [
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    20, 20, 20, 120, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
    20, 20, 20, 20, 20, 20, 20, 120,
  ];
  const LOADER_GIF_FRAMES = [
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [2.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [2.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [3.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [4.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [5.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, -0.5, 1.0, 1.04, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [6.0, 0.0, 1.0, 1.0, 0.0],
      [-1.0, -3.5, 1.0, 1.04, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [8.0, 0.0, 1.0, 1.0, 0.0],
      [-0.62, -7.73, 1.062, 1.072, -9.46],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [9.0, 0.0, 1.0, 1.0, 0.0],
      [-0.75, -13.34, 1.071, 1.081, -20.56],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [11.0, 0.0, 1.0, 1.0, 0.0],
      [-1.34, -19.9, 1.082, 1.077, -30.96],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [13.0, 0.0, 1.0, 1.0, 0.0],
      [-3.0, -26.5, 1.088, 1.075, 45.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [15.0, 0.0, 1.0, 1.0, 0.0],
      [-6.48, -33.36, 1.085, 1.072, 36.87],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [18.0, 0.0, 1.0, 1.0, 0.0],
      [-11.8, -37.9, 1.066, 1.073, 26.57],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [21.0, 0.0, 1.0, 1.0, 0.0],
      [-17.41, -39.85, 1.063, 1.067, 14.04],
      [-0.5, -0.5, 1.04, 1.04, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [19.5, -40.0, 1.038, 1.08, 0.0],
      [-17.0, 0.0, 1.0, 1.0, 0.0],
      [-0.5, -3.5, 1.04, 1.04, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [16.53, -40.08, 1.041, 1.074, -8.75],
      [-13.5, 0.0, 1.038, 1.0, 0.0],
      [-1.0, -7.27, 1.101, 1.07, -8.75],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [13.35, -39.45, 1.046, 1.075, -18.43],
      [-9.5, 0.0, 1.038, 1.0, 0.0],
      [-1.05, -12.76, 1.114, 1.073, -19.98],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [10.46, -38.07, 1.042, 1.063, -30.96],
      [-5.0, 0.0, 1.0, 1.0, 0.0],
      [-1.68, -19.29, 1.118, 1.077, -30.96],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [7.56, -35.6, 1.049, 1.07, -41.99],
      [-0.5, 0.0, 1.038, 1.0, 0.0],
      [-3.25, -26.21, 1.124, 1.076, -40.6],
      [-0.5, 0.0, 0.962, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [5.27, -32.38, 1.051, 1.074, 35.54],
      [4.5, 0.0, 1.038, 1.0, 0.0],
      [-6.46, -32.72, 1.128, 1.072, 36.87],
      [-1.0, -1.5, 1.0, 1.04, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [3.5, -28.0, 1.049, 1.055, 26.57],
      [10.5, 0.0, 1.038, 1.0, 0.0],
      [-11.6, -37.36, 1.12, 1.076, 24.78],
      [-1.0, -4.0, 1.038, 1.04, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [2.47, -23.38, 1.063, 1.067, 14.04],
      [16.5, 0.0, 1.038, 1.0, 0.0],
      [-17.32, -39.68, 1.108, 1.074, 14.93],
      [-1.38, -8.42, 1.056, 1.067, -11.31],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.5, -18.0, 1.038, 1.08, 0.0],
      [19.8, -40.23, 1.039, 1.072, 4.09],
      [-18.5, 0.0, 1.04, 1.0, 0.0],
      [-1.48, -14.21, 1.064, 1.07, -21.8],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, -12.0, 1.038, 1.04, 0.0],
      [16.82, -40.11, 1.04, 1.076, -7.59],
      [-12.0, 0.0, 1.08, 1.0, 0.0],
      [-2.3, -20.91, 1.079, 1.074, -32.74],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, -4.5, 1.077, 1.04, 0.0],
      [13.8, -39.6, 1.034, 1.075, -18.43],
      [-5.0, 0.0, 1.08, 1.0, 0.0],
      [-4.25, -27.75, 1.061, 1.075, 45.0],
      [-0.5, 0.0, 0.962, 1.0, 0.0],
    ],
    [
      [0.5, 0.5, 1.038, 1.04, 0.0],
      [10.77, -38.15, 1.05, 1.067, -29.74],
      [3.0, 0.0, 1.08, 1.0, 0.0],
      [-7.88, -33.92, 1.077, 1.076, 33.69],
      [-1.0, -1.5, 1.0, 1.04, 0.0],
    ],
    [
      [0.0, 2.0, 1.154, 0.92, 0.0],
      [7.99, -35.87, 1.046, 1.069, -41.19],
      [10.0, 0.0, 1.08, 1.0, 0.0],
      [-13.28, -38.19, 1.071, 1.071, 23.2],
      [-1.0, -5.0, 1.038, 1.04, 0.0],
    ],
    [
      [0.5, 2.5, 1.269, 0.8, 0.0],
      [5.56, -32.58, 1.046, 1.072, 36.87],
      [17.0, 0.0, 1.08, 1.0, 0.0],
      [-18.83, -39.87, 1.048, 1.067, 11.31],
      [-1.26, -9.56, 1.054, 1.067, -14.04],
    ],
    [
      [0.5, 3.5, 1.346, 0.72, 0.0],
      [3.7, -28.4, 1.049, 1.055, 26.57],
      [18.5, -40.5, 1.04, 1.04, 0.0],
      [-18.5, 0.0, 1.038, 1.0, 0.0],
      [-1.42, -15.63, 1.066, 1.073, -24.44],
    ],
    [
      [0.0, 4.5, 1.385, 0.72, 0.0],
      [2.68, -23.71, 1.054, 1.077, 14.04],
      [15.81, -40.06, 1.077, 1.07, -10.3],
      [-12.0, 0.0, 1.0, 1.0, 0.0],
      [-2.46, -22.28, 1.069, 1.08, -36.87],
    ],
    [
      [0.0, 4.5, 1.385, 0.72, 0.0],
      [1.84, -18.23, 1.074, 1.072, 4.09],
      [12.77, -39.3, 1.077, 1.068, -21.04],
      [-6.0, 0.0, 1.0, 1.0, 0.0],
      [-4.65, -29.38, 1.084, 1.069, 42.51],
    ],
    [
      [0.5, 4.0, 1.346, 0.76, 0.0],
      [1.5, -12.0, 1.038, 1.0, 0.0],
      [9.85, -37.73, 1.076, 1.065, -33.69],
      [-1.0, 0.0, 1.0, 1.0, 0.0],
      [-8.99, -35.31, 1.076, 1.073, 32.01],
    ],
    [
      [0.5, 3.0, 1.269, 0.84, 0.0],
      [1.0, -5.0, 1.038, 1.04, 0.0],
      [6.75, -35.25, 1.075, 1.047, 45.0],
      [4.0, 0.0, 1.0, 1.0, 0.0],
      [-14.53, -38.78, 1.065, 1.066, 19.98],
    ],
    [
      [0.5, 2.0, 1.192, 0.92, 0.0],
      [0.5, 0.5, 1.038, 1.04, 0.0],
      [4.72, -31.65, 1.088, 1.07, 34.7],
      [8.5, 0.0, 1.038, 1.0, 0.0],
      [-19.85, -39.98, 1.047, 1.074, 8.75],
    ],
    [
      [0.0, 1.0, 1.077, 1.0, 0.0],
      [0.5, 2.0, 1.115, 0.92, 0.0],
      [3.1, -27.35, 1.097, 1.072, 23.96],
      [12.5, 0.0, 1.038, 1.0, 0.0],
      [-23.5, -40.5, 1.038, 1.04, 0.0],
    ],
    [
      [0.5, 0.5, 1.038, 1.04, 0.0],
      [0.5, 2.5, 1.269, 0.8, 0.0],
      [1.98, -22.39, 1.102, 1.072, 12.53],
      [14.68, -39.93, 1.035, 1.072, -12.53],
      [-25.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 3.5, 1.346, 0.72, 0.0],
      [1.5, -17.0, 1.08, 1.04, 0.0],
      [11.66, -39.02, 1.039, 1.072, -23.96],
      [-22.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 4.5, 1.423, 0.72, 0.0],
      [1.5, -11.0, 1.08, 1.04, 0.0],
      [8.7, -37.22, 1.042, 1.065, -35.54],
      [-19.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 4.5, 1.385, 0.72, 0.0],
      [1.0, -3.0, 1.08, 1.0, 0.0],
      [6.0, -34.5, 1.033, 1.075, -45.0],
      [-16.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 4.0, 1.346, 0.76, 0.0],
      [0.0, 0.5, 1.08, 0.96, 0.0],
      [3.9, -30.75, 1.048, 1.068, 32.01],
      [-14.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 3.0, 1.269, 0.84, 0.0],
      [0.0, 1.5, 1.24, 0.88, 0.0],
      [2.48, -26.21, 1.05, 1.07, 21.8],
      [-11.5, 0.0, 0.962, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 2.0, 1.192, 0.92, 0.0],
      [0.0, 3.0, 1.32, 0.76, 0.0],
      [1.39, -21.35, 1.056, 1.072, 9.46],
      [-10.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 1.5, 1.115, 0.96, 0.0],
      [0.0, 3.5, 1.4, 0.72, 0.0],
      [1.0, -15.5, 1.0, 1.04, 0.0],
      [-8.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 0.5, 1.038, 1.04, 0.0],
      [0.0, 4.5, 1.48, 0.72, 0.0],
      [1.0, -9.0, 1.038, 1.04, 0.0],
      [-6.5, 0.0, 0.962, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 4.5, 1.4, 0.72, 0.0],
      [0.0, -1.5, 1.077, 1.04, 0.0],
      [-5.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 4.0, 1.4, 0.76, 0.0],
      [0.0, 0.5, 1.077, 0.96, 0.0],
      [-4.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 2.5, 1.32, 0.8, 0.0],
      [-0.5, 2.0, 1.192, 0.84, 0.0],
      [-3.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 1.5, 1.2, 0.88, 0.0],
      [0.0, 3.0, 1.308, 0.76, 0.0],
      [-2.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.5, 1.08, 0.96, 0.0],
      [-0.5, 4.0, 1.346, 0.68, 0.0],
      [-2.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.08, 1.0, 0.0],
      [-0.5, 4.0, 1.423, 0.68, 0.0],
      [-1.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 4.0, 1.385, 0.68, 0.0],
      [-1.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 3.5, 1.308, 0.72, 0.0],
      [-0.5, 0.0, 0.962, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 2.5, 1.231, 0.8, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-0.5, 1.5, 1.115, 0.88, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-0.5, 0.5, 1.038, 0.96, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-1.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-1.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-2.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-2.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-3.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [-4.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, -0.5, 1.0, 1.04, 0.0],
      [-5.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.0, -3.5, 1.0, 1.04, 0.0],
      [-6.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.7, -7.72, 1.05, 1.065, 9.46],
      [-8.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.82, -13.38, 1.065, 1.07, 19.98],
      [-9.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.43, -19.68, 1.068, 1.077, 32.47],
      [-11.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [3.25, -26.75, 1.061, 1.075, -45.0],
      [-13.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [6.62, -33.27, 1.069, 1.068, -36.03],
      [-15.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [11.8, -37.73, 1.07, 1.069, -24.44],
      [-18.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, -0.5, 1.04, 1.04, 0.0],
      [17.53, -39.88, 1.054, 1.067, -14.04],
      [-21.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.0, -3.5, 1.04, 1.0, 0.0],
      [17.0, 0.0, 1.0, 1.0, 0.0],
      [-19.19, -40.25, 1.041, 1.066, -3.37],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.06, -7.42, 1.097, 1.075, 8.13],
      [14.0, 0.0, 1.0, 1.0, 0.0],
      [-16.33, -40.09, 1.038, 1.07, 8.75],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.19, -12.68, 1.11, 1.077, 20.56],
      [10.0, 0.0, 1.0, 1.0, 0.0],
      [-13.36, -39.5, 1.038, 1.07, 19.98],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.8, -19.4, 1.116, 1.077, 29.74],
      [5.0, 0.0, 1.0, 1.0, 0.0],
      [-10.38, -38.03, 1.036, 1.063, 30.96],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [3.45, -26.3, 1.121, 1.076, 41.19],
      [0.5, 0.0, 1.038, 1.0, 0.0],
      [-7.44, -35.56, 1.044, 1.063, 41.63],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.0, -1.5, 1.0, 1.04, 0.0],
      [6.7, -32.9, 1.12, 1.072, -36.87],
      [-4.5, 0.0, 1.038, 1.0, 0.0],
      [-5.12, -32.16, 1.046, 1.064, -36.87],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.0, -4.0, 1.038, 1.04, 0.0],
      [11.9, -37.7, 1.109, 1.073, -26.57],
      [-10.0, 0.0, 1.0, 1.0, 0.0],
      [-3.5, -28.0, 1.049, 1.055, -26.57],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.5, -8.5, 1.064, 1.075, 11.31],
      [17.32, -39.71, 1.096, 1.067, -14.04],
      [-16.5, 0.0, 1.038, 1.0, 0.0],
      [-2.21, -23.32, 1.054, 1.067, -14.04],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [1.6, -14.26, 1.071, 1.077, 21.8],
      [19.0, 0.0, 1.08, 1.0, 0.0],
      [-19.65, -40.19, 1.039, 1.07, -3.81],
      [-1.5, -18.0, 1.038, 1.08, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [2.42, -20.88, 1.067, 1.076, 33.69],
      [12.0, 0.0, 1.08, 1.0, 0.0],
      [-16.84, -40.12, 1.039, 1.069, 8.13],
      [-1.0, -11.5, 1.0, 1.04, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [4.25, -27.75, 1.061, 1.075, -45.0],
      [5.0, 0.0, 1.08, 1.0, 0.0],
      [-13.7, -39.4, 1.046, 1.063, 18.43],
      [-1.0, -4.5, 1.077, 1.04, 0.0],
    ],
    [
      [1.0, -1.5, 1.0, 1.04, 0.0],
      [8.12, -34.08, 1.077, 1.076, -33.69],
      [-2.0, 0.0, 1.08, 1.0, 0.0],
      [-10.7, -38.16, 1.041, 1.065, 30.26],
      [-0.5, 0.0, 1.038, 1.0, 0.0],
    ],
    [
      [1.5, -5.0, 1.038, 1.08, 0.0],
      [13.52, -38.29, 1.071, 1.071, -23.2],
      [-9.5, 0.0, 1.04, 1.0, 0.0],
      [-7.87, -35.82, 1.043, 1.067, 40.6],
      [0.0, 1.5, 1.154, 0.88, 0.0],
    ],
    [
      [1.44, -9.76, 1.054, 1.077, 14.04],
      [18.9, -39.98, 1.056, 1.075, -11.31],
      [-16.0, 0.0, 1.08, 1.0, 0.0],
      [-5.47, -32.53, 1.049, 1.067, -37.87],
      [-0.5, 2.5, 1.269, 0.8, 0.0],
    ],
    [
      [1.66, -15.75, 1.076, 1.079, 24.44],
      [18.5, 0.0, 1.038, 1.0, 0.0],
      [-18.5, -40.5, 1.04, 1.04, 0.0],
      [-3.7, -28.4, 1.049, 1.055, -26.57],
      [-0.5, 3.5, 1.346, 0.72, 0.0],
    ],
    [
      [2.65, -22.61, 1.082, 1.088, 35.54],
      [12.5, 0.0, 1.038, 1.0, 0.0],
      [-15.68, -40.03, 1.08, 1.07, 10.3],
      [-2.45, -23.65, 1.059, 1.07, -15.26],
      [0.0, 4.0, 1.385, 0.68, 0.0],
    ],
    [
      [4.94, -29.44, 1.067, 1.083, -41.63],
      [6.5, 0.0, 1.038, 1.0, 0.0],
      [-12.74, -39.4, 1.084, 1.07, 21.8],
      [-1.79, -18.21, 1.068, 1.071, -4.4],
      [0.0, 4.0, 1.385, 0.68, 0.0],
    ],
    [
      [9.04, -35.34, 1.08, 1.073, -32.01],
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [-9.6, -37.67, 1.086, 1.069, 32.74],
      [-1.5, -12.0, 1.038, 1.0, 0.0],
      [-0.5, 3.5, 1.346, 0.72, 0.0],
    ],
    [
      [14.75, -38.84, 1.071, 1.072, -20.56],
      [-4.0, 0.0, 1.0, 1.0, 0.0],
      [-6.75, -35.25, 1.075, 1.047, 45.0],
      [-1.0, -5.0, 1.038, 1.04, 0.0],
      [-0.5, 2.5, 1.269, 0.8, 0.0],
    ],
    [
      [20.07, -40.09, 1.05, 1.072, -9.46],
      [-8.0, 0.0, 1.0, 1.0, 0.0],
      [-4.65, -31.73, 1.087, 1.065, -33.69],
      [-0.5, 0.0, 1.038, 1.0, 0.0],
      [0.0, 1.5, 1.154, 0.88, 0.0],
    ],
    [
      [23.5, -40.0, 1.038, 1.08, 0.0],
      [-12.0, 0.0, 1.0, 1.0, 0.0],
      [-2.95, -27.29, 1.099, 1.073, -24.44],
      [0.0, 1.5, 1.154, 0.88, 0.0],
      [0.0, 0.5, 1.077, 0.96, 0.0],
    ],
    [
      [25.0, 0.0, 1.0, 1.0, 0.0],
      [-14.63, -39.92, 1.041, 1.076, 12.99],
      [-1.86, -22.36, 1.106, 1.072, -12.53],
      [-0.5, 2.5, 1.269, 0.8, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [22.0, 0.0, 1.0, 1.0, 0.0],
      [-11.61, -38.99, 1.05, 1.072, 23.96],
      [-1.5, -17.0, 1.08, 1.04, 0.0],
      [-0.5, 3.5, 1.346, 0.72, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [19.0, 0.0, 1.0, 1.0, 0.0],
      [-8.62, -37.23, 1.055, 1.069, 35.54],
      [-1.0, -11.0, 1.08, 1.0, 0.0],
      [0.0, 4.0, 1.385, 0.68, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [16.0, 0.0, 1.0, 1.0, 0.0],
      [-6.05, -34.56, 1.063, 1.064, -41.99],
      [-0.5, -3.0, 1.08, 1.04, 0.0],
      [0.0, 4.0, 1.385, 0.68, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [14.0, 0.0, 1.0, 1.0, 0.0],
      [-3.69, -30.54, 1.056, 1.065, -33.69],
      [0.0, 0.5, 1.08, 0.96, 0.0],
      [-0.5, 3.5, 1.346, 0.72, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [12.0, 0.0, 1.0, 1.0, 0.0],
      [-2.31, -26.28, 1.064, 1.07, -21.8],
      [0.0, 1.5, 1.24, 0.88, 0.0],
      [-0.5, 3.0, 1.269, 0.76, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [10.0, 0.0, 1.0, 1.0, 0.0],
      [-1.4, -21.02, 1.071, 1.075, -11.31],
      [0.0, 3.0, 1.32, 0.76, 0.0],
      [-0.5, 1.5, 1.192, 0.88, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [8.0, 0.0, 1.0, 1.0, 0.0],
      [-1.0, -15.5, 1.0, 1.04, 0.0],
      [0.0, 3.5, 1.4, 0.72, 0.0],
      [0.0, 1.0, 1.077, 0.92, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [7.0, 0.0, 1.0, 1.0, 0.0],
      [-1.0, -9.0, 1.038, 1.04, 0.0],
      [0.0, 4.5, 1.48, 0.72, 0.0],
      [-0.5, 0.0, 1.038, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [5.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, -1.5, 1.077, 1.04, 0.0],
      [0.5, 4.5, 1.44, 0.72, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [4.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 1.0, 1.115, 1.0, 0.0],
      [0.0, 4.0, 1.4, 0.76, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [3.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 2.0, 1.192, 0.84, 0.0],
      [0.0, 2.5, 1.32, 0.8, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [2.5, 0.0, 0.962, 1.0, 0.0],
      [0.0, 3.0, 1.308, 0.76, 0.0],
      [0.5, 1.5, 1.2, 0.88, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [2.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 4.0, 1.346, 0.68, 0.0],
      [0.0, 0.5, 1.08, 0.96, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 4.5, 1.423, 0.72, 0.0],
      [0.0, 0.0, 1.08, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 4.5, 1.346, 0.72, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [1.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 3.5, 1.346, 0.8, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 3.0, 1.231, 0.84, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 1.5, 1.115, 0.96, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 1.0, 1.038, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.5, 0.0, 1.038, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
    [
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
      [0.0, 0.0, 1.0, 1.0, 0.0],
    ],
  ];
  /* GIF_FRAME_DATA_END */

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function sanitizeCell(v) {
    const s = String(v == null ? "" : v);
    if (s.includes(",") || s.includes('"') || s.includes("\n"))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function stripHtml(v) {
    return String(v == null ? "" : v)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractNodeDisplayText(node) {
    if (!node) return "";
    const text =
      typeof node.innerText === "string" && node.innerText
        ? node.innerText
        : typeof node.textContent === "string"
          ? node.textContent
          : "";
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[\r\n\t\f\v]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactObject(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (v === "" || v == null) continue;
      out[k] = v;
    }
    return out;
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  function downloadText(name, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function recordCaptured(url, text) {
    const json = safeJsonParse(text);
    if (!json) return;
    CAPTURED_RESPONSES.push({
      url,
      time: Date.now(),
      json,
    });
    if (CAPTURED_RESPONSES.length > 120) CAPTURED_RESPONSES.shift();
  }

  function recordTraffic(entry) {
    CAPTURED_TRAFFIC.push({
      time: Date.now(),
      ...entry,
    });
    if (CAPTURED_TRAFFIC.length > 200) CAPTURED_TRAFFIC.shift();
    try {
      const url = String((entry && entry.url) || "");
      if (!url.includes("/gateway/t/v1/exam/user/getExamTestUserInfo")) return;
      const json = entry && entry.responseJson;
      if (!json || !isSuccessResponse(json)) return;
      cacheExamQaUserInfo(json.data, "captured-traffic", json.traceId);
    } catch {}
  }

  function installNetworkHooks() {
    if (HOOK_INSTALLED) return;
    HOOK_INSTALLED = true;

    try {
      const rawFetch = window.fetch;
      window.fetch = async function (...args) {
        const res = await rawFetch.apply(this, args);
        try {
          const req = args[0];
          const url = typeof req === "string" ? req : (req && req.url) || "";
          const init = args[1] || {};
          const method = String(
            init.method || (req && req.method) || "GET",
          ).toUpperCase();
          const body = typeof init.body === "string" ? init.body : "";
          if (/zhihuishu\.com|kg-ai-run/.test(url)) {
            res
              .clone()
              .text()
              .then((txt) => {
                recordCaptured(url, txt);
                recordTraffic({
                  url,
                  method,
                  requestBody: body,
                  status: res.status,
                  responseJson: safeJsonParse(txt),
                });
              })
              .catch(() => {});
          }
        } catch {}
        return res;
      };
    } catch (e) {
      console.warn("[知识抓取] fetch hook 失败:", e.message);
    }

    try {
      const rawOpen = XMLHttpRequest.prototype.open;
      const rawSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__zs_url = url;
        this.__zs_method = String(method || "GET").toUpperCase();
        return rawOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        this.__zs_body = typeof args[0] === "string" ? args[0] : "";
        this.addEventListener("load", function () {
          try {
            const url = this.__zs_url || "";
            if (!/zhihuishu\.com|kg-ai-run/.test(url)) return;
            const text =
              typeof this.responseText === "string" ? this.responseText : "";
            if (text) {
              recordCaptured(url, text);
              recordTraffic({
                url,
                method: this.__zs_method || "GET",
                requestBody: this.__zs_body || "",
                status: this.status,
                responseJson: safeJsonParse(text),
              });
            }
          } catch {}
        });
        return rawSend.apply(this, args);
      };
    } catch (e) {
      console.warn("[知识抓取] xhr hook 失败:", e.message);
    }
  }

  function parseRoute() {
    const seg = location.pathname.split("/").filter(Boolean);
    const learnIdx = seg.indexOf("learnPage");
    if (learnIdx >= 0 && seg.length >= learnIdx + 4) {
      return {
        courseId: seg[learnIdx + 1],
        classId: seg[learnIdx + 2],
        nodeUid: seg[learnIdx + 3],
      };
    }

    const singleIdx = seg.indexOf("singleCourse");
    if (
      singleIdx >= 0 &&
      seg[singleIdx + 1] === "knowledgeStudy" &&
      seg.length >= singleIdx + 4
    ) {
      const courseId = seg[singleIdx + 2];
      const pointOrClassId = seg[singleIdx + 3];
      return {
        courseId,
        classId: pointOrClassId,
        nodeUid: pointOrClassId,
      };
    }

    const reviewIdx = seg.indexOf("studentReviewTestOrExam");
    if (reviewIdx >= 0) {
      const q = new URL(location.href).searchParams;
      return {
        courseId: String(seg[reviewIdx + 4] || q.get("courseId") || ""),
        classId: String(q.get("classId") || ""),
        nodeUid: String(q.get("pointId") || ""),
      };
    }

    const pointIdx = seg.indexOf("point");
    if (pointIdx >= 0) {
      const q = new URL(location.href).searchParams;
      const pathPointId = String(seg[pointIdx + 2] || "");
      const pathClassId = String(seg[pointIdx + 5] || "");
      return {
        courseId: String(seg[pointIdx + 1] || q.get("courseId") || ""),
        classId: String(q.get("classId") || pathClassId || ""),
        nodeUid: String(q.get("pointId") || pathPointId || ""),
      };
    }

    const previewIdx = seg.indexOf("examPreview");
    if (previewIdx >= 0) {
      const q = new URL(location.href).searchParams;
      const pathPointId = String(seg[previewIdx + 2] || "");
      const pathClassId = String(seg[previewIdx + 5] || "");
      return {
        courseId: String(seg[previewIdx + 1] || q.get("courseId") || ""),
        classId: String(q.get("classId") || pathClassId || ""),
        nodeUid: String(q.get("pointId") || pathPointId || ""),
      };
    }

    throw new Error("无法从 URL 解析 courseId/classId/nodeUid");
  }

  function getCacheKey(route) {
    return `${CACHE_PREFIX}:${route.courseId}`;
  }

  function getLegacyCacheKey(route) {
    return `${CACHE_PREFIX}:${route.courseId}:${route.classId}`;
  }

  function findAnyCourseCache(route) {
    const prefix = `${CACHE_PREFIX}:${route.courseId}:`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) return localStorage.getItem(key);
    }
    return null;
  }

  function getPendingResourceKey(route) {
    return `${PENDING_RESOURCE_PREFIX}:${route.courseId}`;
  }

  function getActiveResourceHintKey(route) {
    return `${ACTIVE_RESOURCE_HINT_PREFIX}:${route.courseId}`;
  }

  function getAutomationStateKey(route) {
    return `${AUTOMATION_STATE_PREFIX}:${route.courseId}`;
  }

  function getAutomationStateCookieKey(route) {
    return `${AUTOMATION_STATE_PREFIX}:${String((route && route.courseId) || "").trim()}`;
  }

  function getExamPendingSubmittedKey(route) {
    return `${EXAM_PENDING_SUBMITTED_PREFIX}:${String((route && route.courseId) || "").trim()}`;
  }

  function getExamPendingSubmittedCookieKey(route) {
    return `${EXAM_PENDING_SUBMITTED_PREFIX}:${String((route && route.courseId) || "").trim()}`;
  }

  function readCookieValue(name) {
    try {
      const key = String(name || "").trim();
      if (!key) return "";
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`),
      );
      return m ? decodeURIComponent(m[1]) : "";
    } catch {
      return "";
    }
  }

  function writeCookieValue(name, value, maxAgeSeconds = 0) {
    try {
      const key = String(name || "").trim();
      if (!key) return false;
      const encoded = encodeURIComponent(String(value || ""));
      const maxAge = Math.max(0, Number(maxAgeSeconds || 0));
      document.cookie = `${key}=${encoded}; path=/; domain=.zhihuishu.com; max-age=${maxAge}; SameSite=Lax`;
      return true;
    } catch {
      return false;
    }
  }

  function getVideoControlAutoMuteKey(route) {
    return `${VIDEO_CONTROL_AUTO_MUTE_PREFIX}:${route.courseId}`;
  }

  function getVideoSeekHintKey(route) {
    return `${VIDEO_SEEK_HINT_PREFIX}:${route.courseId}`;
  }

  function getAutomationMaskKey(route) {
    return `${AUTOMATION_MASK_PREFIX}:${route.courseId}`;
  }

  function loadVideoAutoMuteEnabled() {
    try {
      const route = parseRoute();
      const raw = localStorage.getItem(getVideoControlAutoMuteKey(route));
      if (raw === null) return true;
      return raw === "1";
    } catch (e) {
      console.warn("[知识抓取] 读取自动静音状态失败:", e.message);
      return true;
    }
  }

  function saveVideoAutoMuteEnabled(enabled) {
    try {
      const route = parseRoute();
      localStorage.setItem(
        getVideoControlAutoMuteKey(route),
        enabled ? "1" : "0",
      );
      return true;
    } catch (e) {
      console.warn("[知识抓取] 保存自动静音状态失败:", e.message);
      return false;
    }
  }

  function saveVideoSeekHint(resourceUid, seekSeconds) {
    try {
      const uid = String(resourceUid || "").trim();
      const sec = Number(seekSeconds);
      if (!uid || !Number.isFinite(sec) || sec <= 1) return false;
      const route = parseRoute();
      const payload = {
        resourceUid: uid,
        seekSeconds: Math.floor(sec),
        createdAt: Date.now(),
      };
      sessionStorage.setItem(
        getVideoSeekHintKey(route),
        JSON.stringify(payload),
      );
      return true;
    } catch (e) {
      console.warn("[知识抓取] 保存视频进度跳转提示失败:", e.message);
      return false;
    }
  }

  function loadVideoSeekHint() {
    try {
      const route = parseRoute();
      const raw = sessionStorage.getItem(getVideoSeekHintKey(route));
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || !payload.resourceUid) return null;
      if (Date.now() - Number(payload.createdAt || 0) > 10 * 60 * 1000) {
        sessionStorage.removeItem(getVideoSeekHintKey(route));
        return null;
      }
      return {
        resourceUid: String(payload.resourceUid || ""),
        seekSeconds: Number(payload.seekSeconds || 0),
        createdAt: Number(payload.createdAt || 0),
      };
    } catch {
      return null;
    }
  }

  function clearVideoSeekHint() {
    try {
      sessionStorage.removeItem(getVideoSeekHintKey(parseRoute()));
    } catch {}
  }

  function loadAutomationMaskEnabled() {
    try {
      const route = parseRoute();
      const raw = localStorage.getItem(getAutomationMaskKey(route));
      if (raw === null) return true;
      return raw === "1";
    } catch (e) {
      console.warn("[知识抓取] 读取遮罩开关失败:", e.message);
      return true;
    }
  }

  function saveAutomationMaskEnabled(enabled) {
    try {
      const route = parseRoute();
      localStorage.setItem(getAutomationMaskKey(route), enabled ? "1" : "0");
      return true;
    } catch (e) {
      console.warn("[知识抓取] 保存遮罩开关失败:", e.message);
      return false;
    }
  }

  function saveAutomationState(state) {
    try {
      const route = parseRoute();
      const key = getAutomationStateKey(route);
      const cookieKey = getAutomationStateCookieKey(route);
      const mode = String((state && state.mode) || "").trim();
      const payload = {
        enabled: !!(state && state.enabled === true),
        targetUid: String((state && state.targetUid) || ""),
        mode: mode || "study",
        examTargetPointId: String((state && state.examTargetPointId) || ""),
        updatedAt: Date.now(),
      };
      const raw = JSON.stringify(payload);
      sessionStorage.setItem(key, raw);
      localStorage.setItem(key, raw);
      writeCookieValue(cookieKey, raw, 7 * 24 * 60 * 60);
      writeSharedScriptCache(key, raw);
      writeSharedScriptCache(cookieKey, raw);
      return true;
    } catch (e) {
      console.warn("[知识抓取] 自动化状态写入失败:", e.message);
      return false;
    }
  }

  function loadAutomationState() {
    try {
      const route = parseRoute();
      const key = getAutomationStateKey(route);
      const cookieKey = getAutomationStateCookieKey(route);
      const candidates = [
        sessionStorage.getItem(key),
        localStorage.getItem(key),
        readCookieValue(cookieKey),
        readSharedScriptCache(key),
        readSharedScriptCache(cookieKey),
      ]
        .map((raw) => {
          if (!raw) return null;
          try {
            const payload = JSON.parse(raw);
            if (!payload || typeof payload !== "object") return null;
            return payload;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      const payload = candidates[0];
      if (!payload) return null;
      return {
        enabled: payload.enabled === true,
        targetUid: String(payload.targetUid || ""),
        mode: String(payload.mode || "study"),
        examTargetPointId: String(payload.examTargetPointId || ""),
        updatedAt: Number(payload.updatedAt || 0),
      };
    } catch (e) {
      console.warn("[知识抓取] 自动化状态读取失败:", e.message);
      return null;
    }
  }

  function saveExamPendingSubmittedState(state) {
    try {
      const route = parseRoute();
      const key = getExamPendingSubmittedKey(route);
      const cookieKey = getExamPendingSubmittedCookieKey(route);
      const pointId = String((state && state.pointId) || "").trim();
      if (!pointId) {
        try {
          sessionStorage.removeItem(key);
        } catch {}
        try {
          localStorage.removeItem(key);
        } catch {}
        writeCookieValue(cookieKey, "", 0);
        writeSharedScriptCache(key, "");
        writeSharedScriptCache(cookieKey, "");
        return true;
      }
      const payload = {
        pointId,
        submittedAt:
          Number((state && state.submittedAt) || Date.now()) || Date.now(),
        updatedAt: Date.now(),
      };
      const raw = JSON.stringify(payload);
      sessionStorage.setItem(key, raw);
      localStorage.setItem(key, raw);
      writeCookieValue(cookieKey, raw, 2 * 24 * 60 * 60);
      writeSharedScriptCache(key, raw);
      writeSharedScriptCache(cookieKey, raw);
      return true;
    } catch (e) {
      console.warn("[知识抓取] 交卷待同步状态写入失败:", e.message);
      return false;
    }
  }

  function loadExamPendingSubmittedState() {
    try {
      const route = parseRoute();
      const key = getExamPendingSubmittedKey(route);
      const cookieKey = getExamPendingSubmittedCookieKey(route);
      const candidates = [
        sessionStorage.getItem(key),
        localStorage.getItem(key),
        readCookieValue(cookieKey),
        readSharedScriptCache(key),
        readSharedScriptCache(cookieKey),
      ]
        .map((raw) => {
          if (!raw) return null;
          try {
            const payload = JSON.parse(raw);
            if (!payload || typeof payload !== "object") return null;
            return payload;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      const payload = candidates[0];
      if (!payload) return null;
      const pointId = String(payload.pointId || "").trim();
      const submittedAt = Number(payload.submittedAt || 0);
      if (!pointId || !submittedAt) return null;
      if (Date.now() - submittedAt > EXAM_PENDING_SUBMITTED_TTL_MS) {
        saveExamPendingSubmittedState(null);
        return null;
      }
      return {
        pointId,
        submittedAt,
        updatedAt: Number(payload.updatedAt || 0),
      };
    } catch (e) {
      console.warn("[知识抓取] 交卷待同步状态读取失败:", e.message);
      return null;
    }
  }

  function makeCacheResult(result) {
    if (!result || typeof result !== "object") return null;
    const cacheResult = {
      fetchedAt: result.fetchedAt,
      cachedAt: new Date().toISOString(),
      page: result.page,
      params: result.params,
      source: result.source,
      concurrency: result.concurrency,
      moduleCount: result.moduleCount,
      unitCount: result.unitCount,
      pointCount: result.pointCount,
      okCount: result.okCount,
      timeoutCount: result.timeoutCount,
      errorCount: result.errorCount,
      elementMissingCount: result.elementMissingCount,
      modules:
        result.modules || (result.structure && result.structure.modules) || [],
      points: result.points || [],
    };

    return Object.fromEntries(
      Object.entries(cacheResult).filter(([, value]) => value !== undefined),
    );
  }

  function saveCachedResult(result) {
    try {
      const route = result && result.params ? result.params : parseRoute();
      const payload = {
        version: CACHE_VERSION,
        savedAt: new Date().toISOString(),
        result: makeCacheResult(result),
      };
      if (!payload.result) return false;
      const serialized = JSON.stringify(payload);
      localStorage.setItem(getCacheKey(route), serialized);
      writeSharedScriptCache(getCacheKey(route), serialized);
      if (route && route.classId) {
        writeSharedScriptCache(getLegacyCacheKey(route), serialized);
      }
      return true;
    } catch (e) {
      console.warn("[知识抓取] 缓存写入失败:", e.message);
      return false;
    }
  }

  function loadCachedResult() {
    try {
      const route = parseRoute();
      const raw =
        localStorage.getItem(getCacheKey(route)) ||
        localStorage.getItem(getLegacyCacheKey(route)) ||
        findAnyCourseCache(route) ||
        loadAnySharedCourseCache(route);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || !payload.result) return null;
      return {
        ...payload.result,
        cacheVersion: payload.version || "",
        cachedAt: payload.savedAt || payload.result.cachedAt || "",
      };
    } catch (e) {
      console.warn("[知识抓取] 缓存读取失败:", e.message);
      return null;
    }
  }

  function getDateFormate() {
    return Date.parse(new Date());
  }

  function getPageWindow() {
    try {
      if (typeof unsafeWindow !== "undefined" && unsafeWindow)
        return unsafeWindow;
    } catch {}
    return window;
  }

  async function waitForPageCrypto(timeoutMs = 12000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const pageWin = getPageWindow();
      const keyFn = pageWin && (pageWin.l0a1b2c || pageWin.labc);
      if (
        pageWin &&
        typeof pageWin.yxyz === "function" &&
        typeof keyFn === "function"
      ) {
        return { pageWin, keyFn };
      }
      await sleep(200);
    }
    throw new Error("页面加密函数未加载: yxyz/l0a1b2c/labc");
  }

  async function buildEncryptedBody(payload, keyType = 6) {
    const { pageWin, keyFn } = await waitForPageCrypto();
    let keyPromise = PAGE_CRYPTO_KEY_CACHE.get(keyType);
    if (!keyPromise) {
      keyPromise = Promise.resolve(keyFn.call(pageWin, keyType));
      PAGE_CRYPTO_KEY_CACHE.set(keyType, keyPromise);
    }
    const key = await keyPromise;
    if (!key) throw new Error(`页面加密 key 获取失败: ${keyType}`);
    return {
      secretStr: pageWin.yxyz(payload, key),
      date: Date.now(),
    };
  }

  function pick(obj, keys, fallback = null) {
    if (!obj || typeof obj !== "object") return fallback;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
        return obj[k];
    }
    return fallback;
  }

  async function fetchPost(url, body) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }

  async function fetchGet(url, params) {
    const query = new URLSearchParams(params || {}).toString();
    const finalUrl = query ? `${url}?${query}` : url;
    const res = await fetch(finalUrl, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${finalUrl}`);
    return res.json();
  }

  function gmPost(url, body) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== "function") {
        reject(new Error("GM_xmlhttpRequest 不可用"));
        return;
      }
      GM_xmlhttpRequest({
        method: "POST",
        url,
        data: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        onload: (resp) => {
          try {
            resolve(JSON.parse(resp.responseText));
          } catch (e) {
            reject(new Error(`JSON 解析失败: ${e.message}`));
          }
        },
        onerror: () => reject(new Error(`GM 请求失败: ${url}`)),
      });
    });
  }

  function gmGet(url, params) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== "function") {
        reject(new Error("GM_xmlhttpRequest 不可用"));
        return;
      }
      const query = new URLSearchParams(params || {}).toString();
      const finalUrl = query ? `${url}?${query}` : url;
      GM_xmlhttpRequest({
        method: "GET",
        url: finalUrl,
        onload: (resp) => {
          try {
            resolve(JSON.parse(resp.responseText));
          } catch (e) {
            reject(new Error(`JSON 解析失败: ${e.message}`));
          }
        },
        onerror: () => reject(new Error(`GM 请求失败: ${finalUrl}`)),
      });
    });
  }

  async function postJson(url, body) {
    try {
      return await fetchPost(url, body);
    } catch (e1) {
      console.warn(
        "[知识抓取] fetch 失败，尝试 GM_xmlhttpRequest:",
        e1.message,
      );
      return gmPost(url, body);
    }
  }

  async function postEncryptedJson(url, payload) {
    const encryptedBody = await buildEncryptedBody(payload);
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify(encryptedBody),
    });
    const text = await res.text();
    const json = safeJsonParse(text);
    recordCaptured(url, text);
    recordTraffic({
      url,
      method: "POST",
      requestBody: JSON.stringify(encryptedBody),
      status: res.status,
      responseJson: json,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    if (!json) throw new Error(`JSON 解析失败: ${url}`);
    return json;
  }

  async function getJson(url, params) {
    try {
      return await fetchGet(url, params);
    } catch (e1) {
      console.warn(
        "[知识抓取] GET fetch 失败，尝试 GM_xmlhttpRequest:",
        e1.message,
      );
      return gmGet(url, params);
    }
  }

  function isLocalExamQaBaseUrl(url) {
    const text = String(url || "").trim();
    return /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(text);
  }

  function buildFetchSafeHeaders(headers) {
    const src = headers && typeof headers === "object" ? headers : {};
    const out = {};
    for (const [key, value] of Object.entries(src)) {
      const name = String(key || "").trim();
      if (!name) continue;
      const text = String(value == null ? "" : value);
      if (!text) continue;
      // 浏览器 fetch 的 header value 只能包含 Latin-1；中文身份信息改走 query/body。
      if (/[^\u0000-\u00FF]/.test(text)) continue;
      out[name] = text;
    }
    return out;
  }

  async function requestExamQaByFetch(method, url, options = {}) {
    const timeoutMs = Math.max(1000, Number(options.timeoutMs || 12000));
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : 0;
    try {
      const res = await fetch(url, {
        method: String(method || "GET").toUpperCase(),
        headers: buildFetchSafeHeaders(options.headers || {}),
        body: options.body,
        mode: "cors",
        credentials: "omit",
        signal: controller ? controller.signal : undefined,
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      return { ok: res.ok, status: res.status, text, json };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function requestExamQaByGm(method, url, options = {}) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== "function") {
        reject(new Error("当前环境不支持 GM_xmlhttpRequest"));
        return;
      }
      const errorLabel = String(options.errorLabel || "请求");
      GM_xmlhttpRequest({
        method: String(method || "GET").toUpperCase(),
        url: String(url || ""),
        headers: options.headers || {},
        data: options.body,
        timeout: Math.max(1000, Number(options.timeoutMs || 12000)),
        onload: (res) => {
          const status = Number((res && res.status) || 0);
          const text = String((res && res.responseText) || "");
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text,
            json: safeJsonParse(text),
          });
        },
        onerror: () => reject(new Error(`${errorLabel}网络错误`)),
        ontimeout: () => reject(new Error(`${errorLabel}超时`)),
      });
    });
  }

  async function requestExamQa(method, url, options = {}) {
    let fetchErr = null;
    try {
      return await requestExamQaByFetch(method, url, options);
    } catch (err) {
      fetchErr = err;
    }
    if (typeof GM_xmlhttpRequest === "function") {
      try {
        return await requestExamQaByGm(method, url, options);
      } catch (gmErr) {
        const msg =
          String((gmErr && gmErr.message) || gmErr || "") ||
          String((fetchErr && fetchErr.message) || fetchErr || "") ||
          "网络错误";
        throw new Error(msg);
      }
    }
    if (fetchErr) throw fetchErr;
    throw new Error("当前环境不支持网络请求");
  }

  function isExamQaRetryableStatus(status) {
    const code = Number(status || 0);
    return !code || code === 408 || code === 425 || code === 429 || code >= 500;
  }

  function isSuccessResponse(data) {
    if (!data || typeof data !== "object") return false;
    if (data.code === 200 || data.code === 0) return true;
    if (data.success === true) return true;
    return false;
  }

  async function requestWithVariants(url, payloads) {
    const errors = [];
    for (const payload of payloads) {
      try {
        const data = await postEncryptedJson(url, payload);
        if (isSuccessResponse(data)) {
          return { ok: true, method: "POST-ENCRYPTED", payload, data, errors };
        }
        errors.push(`加密POST返回异常: ${url} code=${data && data.code}`);
      } catch (e) {
        errors.push(`加密POST失败: ${e.message}`);
      }
      try {
        const data = await postJson(url, payload);
        if (isSuccessResponse(data)) {
          return { ok: true, method: "POST", payload, data, errors };
        }
        errors.push(`POST返回异常: ${url} code=${data && data.code}`);
      } catch (e) {
        errors.push(`POST失败: ${e.message}`);
      }
    }
    return { ok: false, data: null, errors };
  }

  function normalizeKnowledgeDic(raw) {
    const root = pick(raw, ["data"], raw) || {};
    const themeList = pick(root, ["themeList", "list"], []);

    const modules = (Array.isArray(themeList) ? themeList : []).map((theme) => {
      const unitsRaw = pick(
        theme,
        ["subThemeList", "unitList", "children"],
        [],
      );
      const themeKnowledge = pick(theme, ["knowledgeList", "pointList"], []);

      const units = [];
      if (Array.isArray(unitsRaw) && unitsRaw.length > 0) {
        for (const unit of unitsRaw) {
          const pointsRaw = pick(
            unit,
            ["knowledgeList", "pointList", "children"],
            [],
          );
          units.push({
            unitId: String(
              pick(
                unit,
                [
                  "subThemeId",
                  "unitId",
                  "id",
                  "nodeUid",
                  "themeId",
                  "catalogId",
                ],
                "",
              ),
            ),
            unitName: String(
              pick(
                unit,
                [
                  "subThemeName",
                  "unitName",
                  "name",
                  "title",
                  "themeName",
                  "catalogName",
                ],
                "未命名单元",
              ),
            ),
            points: (Array.isArray(pointsRaw) ? pointsRaw : []).map((p) => ({
              pointId: String(
                pick(p, ["knowledgeId", "pointId", "id", "nodeUid"], ""),
              ),
              pointName: String(
                pick(
                  p,
                  ["knowledgeName", "pointName", "name", "title"],
                  "未命名知识点",
                ),
              ),
            })),
          });
        }
      } else if (Array.isArray(themeKnowledge) && themeKnowledge.length > 0) {
        units.push({
          unitId: "",
          unitName: "默认单元",
          points: themeKnowledge.map((p) => ({
            pointId: String(
              pick(p, ["knowledgeId", "pointId", "id", "nodeUid"], ""),
            ),
            pointName: String(
              pick(
                p,
                ["knowledgeName", "pointName", "name", "title"],
                "未命名知识点",
              ),
            ),
          })),
        });
      }

      return {
        moduleId: String(pick(theme, ["themeId", "moduleId", "id"], "")),
        moduleName: String(
          pick(
            theme,
            ["themeName", "moduleName", "name", "title"],
            "未命名模块",
          ),
        ),
        units,
      };
    });

    return modules;
  }

  function normalizeModuleInfo(raw) {
    const root = pick(raw, ["data"], raw) || {};
    const moduleList = pick(root, ["moduleList", "modules", "list"], []);
    if (!Array.isArray(moduleList)) return [];

    return moduleList.map((mod) => {
      const unitList = pick(mod, ["unitList", "children", "subList"], []);
      return {
        moduleId: String(pick(mod, ["moduleId", "id", "themeId"], "")),
        moduleName: String(
          pick(mod, ["moduleName", "name", "themeName", "title"], "未命名模块"),
        ),
        units: (Array.isArray(unitList) ? unitList : []).map((unit) => {
          const pointList = pick(
            unit,
            ["knowledgeList", "pointList", "children"],
            [],
          );
          return {
            unitId: String(pick(unit, ["unitId", "id", "subThemeId"], "")),
            unitName: String(
              pick(
                unit,
                ["unitName", "name", "subThemeName", "title"],
                "未命名单元",
              ),
            ),
            points: (Array.isArray(pointList) ? pointList : []).map((p) => ({
              pointId: String(
                pick(p, ["knowledgeId", "pointId", "id", "nodeUid"], ""),
              ),
              pointName: String(
                pick(
                  p,
                  ["knowledgeName", "pointName", "name", "title"],
                  "未命名知识点",
                ),
              ),
            })),
          };
        }),
      };
    });
  }

  function normalizeThemeNodeList(raw) {
    const root = pick(raw, ["data"], raw) || {};
    const themeList = pick(root, ["themeList", "list", "data"], []);
    return normalizeKnowledgeDic({ data: { themeList } });
  }

  function pickLatestTrafficByUrl(subPath) {
    for (let i = CAPTURED_TRAFFIC.length - 1; i >= 0; i--) {
      const it = CAPTURED_TRAFFIC[i];
      if (!it || !it.url) continue;
      if (!it.url.includes(subPath)) continue;
      if (!it.responseJson || !isSuccessResponse(it.responseJson)) continue;
      return it;
    }
    return null;
  }

  function listObservedApiEndpoints() {
    const map = new Map();
    for (const it of CAPTURED_TRAFFIC) {
      if (!it || !it.url) continue;
      if (!/kg-ai-run|zhihuishu/.test(it.url)) continue;
      const key = `${it.method || "GET"} ${it.url.split("?")[0]}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);
  }

  function findTrafficEntries(subPath) {
    return CAPTURED_TRAFFIC.filter(
      (it) => it && it.url && it.url.includes(subPath),
    );
  }

  function summarizeObjectKeysDeep(root, limit = 120) {
    const keys = new Set();
    const visited = new WeakSet();
    function walk(node, depth) {
      if (keys.size >= limit) return;
      if (!node || typeof node !== "object" || depth > 8) return;
      if (visited.has(node)) return;
      visited.add(node);
      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }
      for (const k of Object.keys(node)) {
        keys.add(k);
        if (keys.size >= limit) break;
      }
      for (const v of Object.values(node)) walk(v, depth + 1);
    }
    walk(root, 0);
    return Array.from(keys);
  }

  function pickApiSample(subPath) {
    const list = findTrafficEntries(subPath);
    if (!list.length) return null;
    const item = list[list.length - 1];
    const json = item.responseJson || null;
    return {
      url: item.url,
      method: item.method,
      status: item.status,
      requestBody: item.requestBody || "",
      code: json && json.code,
      message: json && json.message,
      keySummary: summarizeObjectKeysDeep(json, 150),
    };
  }

  function makePointSetKey(points) {
    const ids = (points || [])
      .map((p) =>
        String(
          pick(p, ["knowledgeId", "pointId", "id", "nodeUid", "pointUid"], ""),
        ),
      )
      .filter(Boolean)
      .sort();
    if (!ids.length) return "";
    return ids.join("|");
  }

  function buildUnitHintsFromCaptured() {
    const byUnitId = new Map();
    const byPointSet = new Map();
    const byFirstPoint = new Map();
    const visited = new WeakSet();

    function saveHint(unitObj) {
      const unitName = String(
        pick(
          unitObj,
          [
            "subThemeName",
            "unitName",
            "name",
            "title",
            "themeName",
            "catalogName",
          ],
          "",
        ) || "",
      ).trim();
      if (!unitName) return;
      const unitId = String(
        pick(
          unitObj,
          ["subThemeId", "unitId", "id", "themeId", "catalogId"],
          "",
        ) || "",
      );
      const points = pick(
        unitObj,
        ["knowledgeList", "pointList", "children"],
        [],
      );
      const pointSetKey = makePointSetKey(points);
      const firstPointId = String(
        pick(
          Array.isArray(points) ? points[0] : {},
          ["knowledgeId", "pointId", "id", "nodeUid", "pointUid"],
          "",
        ) || "",
      );

      if (unitId) byUnitId.set(unitId, unitName);
      if (pointSetKey) byPointSet.set(pointSetKey, unitName);
      if (firstPointId) byFirstPoint.set(firstPointId, unitName);
    }

    function walk(node, depth) {
      if (!node || typeof node !== "object" || depth > 10) return;
      if (visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }

      const maybeUnits = [
        pick(node, ["subThemeList"], []),
        pick(node, ["unitList"], []),
        pick(node, ["children"], []),
      ];
      for (const arr of maybeUnits) {
        if (Array.isArray(arr) && arr.length) {
          for (const u of arr) saveHint(u);
        }
      }

      for (const v of Object.values(node)) walk(v, depth + 1);
    }

    for (const item of CAPTURED_RESPONSES) walk(item.json, 0);
    return { byUnitId, byPointSet, byFirstPoint };
  }

  function applyUnitHints(modules, hints) {
    if (!hints) return modules;
    for (const mod of modules || []) {
      for (let i = 0; i < (mod.units || []).length; i++) {
        const u = mod.units[i];
        const currentName = String(u.unitName || "").trim();
        if (currentName && currentName !== "未命名单元") continue;

        const uid = String(u.unitId || "");
        const pointSetKey = makePointSetKey(u.points || []);
        const firstPointId = String(
          pick(
            (u.points || [])[0],
            ["pointId", "knowledgeId", "id", "nodeUid"],
            "",
          ) || "",
        );

        const name =
          (uid && hints.byUnitId.get(uid)) ||
          (pointSetKey && hints.byPointSet.get(pointSetKey)) ||
          (firstPointId && hints.byFirstPoint.get(firstPointId)) ||
          "";

        if (name) {
          u.unitName = name;
        } else if (currentName === "未命名单元") {
          u.unitName = `单元${i + 1}`;
        }
      }
    }
    return modules;
  }

  function scoreThemeListCandidate(list) {
    if (!Array.isArray(list) || !list.length) return -1;
    let namedUnitCount = 0;
    let namedThemeCount = 0;
    let pointCount = 0;
    for (const theme of list) {
      if (pick(theme, ["themeName", "moduleName", "name", "title"], ""))
        namedThemeCount += 1;
      const units = pick(theme, ["subThemeList", "unitList", "children"], []);
      if (Array.isArray(units)) {
        for (const u of units) {
          if (
            pick(
              u,
              ["subThemeName", "unitName", "name", "title", "themeName"],
              "",
            )
          )
            namedUnitCount += 1;
          const pts = pick(u, ["knowledgeList", "pointList", "children"], []);
          if (Array.isArray(pts)) pointCount += pts.length;
        }
      }
      const tpts = pick(theme, ["knowledgeList", "pointList"], []);
      if (Array.isArray(tpts)) pointCount += tpts.length;
    }
    return (
      namedUnitCount * 100000 +
      namedThemeCount * 1000 +
      pointCount * 10 +
      list.length
    );
  }

  function extractPointIdFromText(text) {
    if (!text) return "";
    const m = String(text).match(/(?:^|[^\d])(1\d{15,18})(?:[^\d]|$)/);
    return m ? m[1] : "";
  }

  function parseRequestBody(body) {
    if (!body) return null;
    if (typeof body === "object") return body;
    const text = String(body || "").trim();
    if (!text) return null;

    if (text.startsWith("{") || text.startsWith("[")) {
      const json = safeJsonParse(text);
      if (json && typeof json === "object") return json;
    }

    if (text.includes("=")) {
      const out = {};
      const usp = new URLSearchParams(text);
      for (const [k, v] of usp.entries()) out[k] = v;
      return Object.keys(out).length ? out : null;
    }
    return null;
  }

  function normalizeResourceItem(item) {
    if (!item || typeof item !== "object") return null;
    const detail = pick(item, ["resourcesDetail"], null);
    const base = detail && typeof detail === "object" ? detail : item;
    const merged = { ...base };

    if (item.studyStatus !== undefined) merged.studyStatus = item.studyStatus;
    if (item.schedule !== undefined) merged.schedule = item.schedule;
    if (item.studyTotalTime !== undefined)
      merged.studyTotalTime = item.studyTotalTime;
    if (
      item.resourcesSyncType !== undefined &&
      merged.resourcesSyncType === undefined
    ) {
      merged.resourcesSyncType = item.resourcesSyncType;
    }
    return merged;
  }

  function getResourceListFromResponse(json) {
    const data = pick(json, ["data"], null);
    const list = pick(data, ["resourceList"], pick(json, ["resourceList"], []));
    if (!Array.isArray(list)) return [];
    return list.map(normalizeResourceItem).filter(Boolean);
  }

  function toNumberOrNaN(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function buildRequiredProgressFromResources(resources) {
    if (!Array.isArray(resources) || !resources.length) return null;
    const required = resources.filter((r) => Number(r.resourcesSyncType) === 1);
    if (!required.length) return null;
    const done = required.filter((r) => Number(r.studyStatus) === 1).length;
    const total = required.length;
    return {
      progressText: `必学${done}/${total}`,
      progressType: "必学",
      progressDone: done,
      progressTotal: total,
      source: "api:/resources/list-knowledge-resource",
    };
  }

  function normalizePossiblePointId(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    return /^\d{6,22}$/.test(s) ? s : "";
  }

  function extractPointIdFromKnowledgeResourcesResponse(json) {
    const data = pick(json, ["data"], null);
    const directId =
      normalizePossiblePointId(
        pick(data, ["knowledgeId", "nodeUid", "pointId", "id"], ""),
      ) ||
      normalizePossiblePointId(
        pick(json, ["knowledgeId", "nodeUid", "pointId", "id"], ""),
      );
    if (directId) return directId;

    const list = getResourceListFromResponse(json);
    if (!list.length) return "";

    const cnt = new Map();
    function hit(id) {
      const k = normalizePossiblePointId(id);
      if (!k) return;
      cnt.set(k, (cnt.get(k) || 0) + 1);
    }

    for (const r of list) {
      hit(
        pick(r, ["knowledgeId", "nodeUid", "belongsUid", "pointId", "id"], ""),
      );
      const q = pick(r, ["resourcesQuoteDetail"], null);
      if (q && typeof q === "object") {
        hit(
          pick(
            q,
            ["knowledgeId", "nodeUid", "belongsUid", "pointId", "id"],
            "",
          ),
        );
      }
    }
    if (!cnt.size) return "";

    let bestId = "";
    let best = -1;
    for (const [id, n] of cnt.entries()) {
      if (n > best) {
        best = n;
        bestId = id;
      }
    }
    return bestId;
  }

  function extractPointMetaFromCapturedApis() {
    const byPointId = new Map();
    const byPointName = new Map();
    const sourceCount = {};

    // 只接受 API 响应中明确给出的进度文本，不读取 DOM 文案。
    const badgeRegex = /(必学|选学)\s*(\d+)\s*\/\s*(\d+)/;
    const visited = new WeakSet();

    function setMeta(pointId, pointName, meta) {
      if (!meta) return;
      if (pointId) byPointId.set(pointId, meta);
      if (pointName) byPointName.set(pointName, meta);
      const src = meta.source || "unknown";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    }

    function maybeRecordBadgeText(obj) {
      if (!obj || typeof obj !== "object") return;
      const pointId = String(
        pick(obj, ["knowledgeId", "pointId", "nodeUid", "id"], "") || "",
      );
      const pointName = String(
        pick(obj, ["knowledgeName", "pointName", "name", "title"], "") || "",
      );

      let progressText = "";
      for (const v of Object.values(obj)) {
        if (typeof v !== "string") continue;
        const text = v.replace(/\s+/g, "");
        if (badgeRegex.test(text)) {
          progressText = text.match(badgeRegex)[0];
          break;
        }
      }
      if (!progressText) return;

      const m = progressText.match(badgeRegex);
      if (!m) return;
      const meta = {
        progressText: m[0],
        progressType: m[1],
        progressDone: Number(m[2]),
        progressTotal: Number(m[3]),
        source: "api:badge-text",
      };
      setMeta(pointId, pointName, meta);
    }

    function maybeRecordByNumericPair(obj) {
      if (!obj || typeof obj !== "object") return;
      const pointId = String(
        pick(obj, ["knowledgeId", "pointId", "nodeUid", "id"], "") || "",
      );
      const pointName = String(
        pick(obj, ["knowledgeName", "pointName", "name", "title"], "") || "",
      );
      if (!pointId && !pointName) return;

      const keys = Object.keys(obj);
      const doneKey = keys.find((k) =>
        /(must|required|need).*(done|finish|learned|study|complete|pass)|(done|finish|learned|study|complete|pass).*(must|required|need)/i.test(
          k,
        ),
      );
      const totalKey = keys.find((k) =>
        /(must|required|need).*(count|num|total)|(count|num|total).*(must|required|need)/i.test(
          k,
        ),
      );
      if (!doneKey || !totalKey) return;

      const done = Number(obj[doneKey]);
      const total = Number(obj[totalKey]);
      if (!Number.isFinite(done) || !Number.isFinite(total)) return;

      const meta = {
        progressText: `必学${done}/${total}`,
        progressType: "必学",
        progressDone: done,
        progressTotal: total,
        source: "api:numeric-pair",
      };
      setMeta(pointId, pointName, meta);
    }

    function maybeRecordByResourcePair(obj) {
      if (!obj || typeof obj !== "object") return;
      const pointId = String(
        pick(obj, ["knowledgeId", "pointId", "nodeUid", "id"], "") || "",
      );
      const pointName = String(
        pick(
          obj,
          ["knowledgeName", "pointName", "name", "title", "nodeName"],
          "",
        ) || "",
      );
      if (!pointId && !pointName) return;

      const keys = Object.keys(obj);
      const doneKey = keys.find((k) =>
        /(finish|finished|complete|learned|done).*(resource|res)|(resource|res).*(finish|finished|complete|learned|done)/i.test(
          k,
        ),
      );
      const totalKey = keys.find((k) =>
        /(resource|res).*(count|num|total)|(count|num|total).*(resource|res)/i.test(
          k,
        ),
      );
      if (!doneKey || !totalKey) return;

      const done = Number(obj[doneKey]);
      const total = Number(obj[totalKey]);
      if (!Number.isFinite(done) || !Number.isFinite(total)) return;
      const meta = {
        progressText: `必学${done}/${total}`,
        progressType: "必学",
        progressDone: done,
        progressTotal: total,
        source: "api:resource-pair",
      };
      setMeta(pointId, pointName, meta);
    }

    function maybeRecordFinishedCount(obj) {
      if (!obj || typeof obj !== "object") return;
      const pointId = String(
        pick(obj, ["knowledgeId", "pointId", "nodeUid", "id"], "") || "",
      );
      const pointName = String(
        pick(
          obj,
          ["knowledgeName", "pointName", "name", "title", "nodeName"],
          "",
        ) || "",
      );
      const done = toNumberOrNaN(
        pick(obj, ["finishedResourceCount", "finishedCount"], NaN),
      );
      const total = toNumberOrNaN(
        pick(obj, ["resourceCount", "totalResourceCount", "totalCount"], NaN),
      );
      if (!Number.isFinite(done) || !Number.isFinite(total) || total < 0)
        return;
      if (!pointId && !pointName) return;
      const meta = {
        progressText: `必学${done}/${total}`,
        progressType: "必学",
        progressDone: done,
        progressTotal: total,
        source: "api:finished-resource-count",
      };
      setMeta(pointId, pointName, meta);
    }

    function walk(node, depth) {
      if (!node || typeof node !== "object" || depth > 12) return;
      if (visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }

      maybeRecordBadgeText(node);
      maybeRecordByNumericPair(node);
      maybeRecordByResourcePair(node);
      maybeRecordFinishedCount(node);
      for (const v of Object.values(node)) {
        if (typeof v === "object" && v !== null) walk(v, depth + 1);
      }
    }

    // 优先从真实接口响应里按知识点逐条构建进度。
    for (const item of CAPTURED_TRAFFIC) {
      if (
        !item ||
        !item.url ||
        !item.responseJson ||
        !isSuccessResponse(item.responseJson)
      )
        continue;
      if (!item.url.includes("/resources/list-knowledge-resource")) continue;

      const req = parseRequestBody(item.requestBody);
      const pointId =
        String(
          pick(req, ["knowledgeId", "nodeUid", "pointId", "id"], "") || "",
        ) ||
        extractPointIdFromKnowledgeResourcesResponse(item.responseJson) ||
        extractPointIdFromText(item.requestBody) ||
        extractPointIdFromText(item.url);
      const resources = getResourceListFromResponse(item.responseJson);
      const meta = buildRequiredProgressFromResources(resources);
      if (meta && pointId) setMeta(pointId, "", meta);
    }

    // 其余接口作为补充（例如 node 目录类返回 finishedResourceCount/resourceCount）。
    const fallbackTargets = CAPTURED_TRAFFIC.filter(
      (it) =>
        it &&
        it.responseJson &&
        isSuccessResponse(it.responseJson) &&
        (it.url.includes("/knowledge-study/get-course-knowledge-dic") ||
          it.url.includes("/maptree/list-node-detail-supplements") ||
          it.url.includes("/resources/list-node-resources") ||
          it.url.includes("/path/list-child-node-detail") ||
          it.url.includes("/maptree/get-map-tree-node-detail")),
    );
    for (const item of fallbackTargets) {
      walk(item.responseJson, 0);
    }

    return { byPointId, byPointName, sourceCount };
  }

  function mergePointMeta(modules, domMeta) {
    if (!domMeta) return modules;
    for (const mod of modules || []) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          const pid = String(point.pointId || "");
          const pname = String(point.pointName || "");
          const meta =
            (pid && domMeta.byPointId.get(pid)) ||
            (pname && domMeta.byPointName.get(pname));
          if (meta) {
            point.progressText = meta.progressText;
            point.progressType = meta.progressType;
            point.progressDone = meta.progressDone;
            point.progressTotal = meta.progressTotal;
          }
        }
      }
    }
    return modules;
  }

  function findBestThemeListFromCaptured() {
    const candidates = [];
    const visited = new WeakSet();

    function walk(node, depth) {
      if (!node || typeof node !== "object" || depth > 8) return;
      if (visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node.themeList) && node.themeList.length > 0) {
        candidates.push(node.themeList);
      }
      if (Array.isArray(node.list) && node.list.length > 0) {
        const sample = node.list[0] || {};
        if (
          typeof sample === "object" &&
          (sample.themeName ||
            sample.subThemeList ||
            sample.knowledgeList ||
            sample.knowledgeName)
        ) {
          candidates.push(node.list);
        }
      }

      const values = Array.isArray(node) ? node : Object.values(node);
      for (const v of values) walk(v, depth + 1);
    }

    for (const item of CAPTURED_RESPONSES) {
      walk(item.json, 0);
    }

    if (!candidates.length) return [];
    let best = candidates[0];
    let bestScore = scoreThemeListCandidate(best);
    for (let i = 1; i < candidates.length; i++) {
      const score = scoreThemeListCandidate(candidates[i]);
      if (score > bestScore) {
        best = candidates[i];
        bestScore = score;
      }
    }
    return best;
  }

  function normalizeFromCaptured() {
    const themeList = findBestThemeListFromCaptured();
    if (!themeList.length) return [];
    const hints = buildUnitHintsFromCaptured();
    return applyUnitHints(
      normalizeKnowledgeDic({ data: { themeList } }),
      hints,
    );
  }

  function countStats(modules) {
    const moduleCount = modules.length;
    const unitCount = modules.reduce((n, m) => n + (m.units?.length || 0), 0);
    const pointCount = modules.reduce(
      (n, m) =>
        n + (m.units || []).reduce((a, u) => a + (u.points?.length || 0), 0),
      0,
    );
    return { moduleCount, unitCount, pointCount };
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function flattenPoints(modules) {
    const out = [];
    for (const mod of modules || []) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          out.push({
            moduleId: mod.moduleId || "",
            moduleName: mod.moduleName || "",
            unitId: unit.unitId || "",
            unitName: unit.unitName || "",
            pointId: point.pointId || "",
            pointName: point.pointName || "",
            progressText: point.progressText || "",
            progressDone: point.progressDone,
            progressTotal: point.progressTotal,
          });
        }
      }
    }
    return out;
  }

  function attachRequiredResourcesToModules(modules, resourcePoints) {
    const byId = new Map();
    const byName = new Map();
    for (const point of resourcePoints || []) {
      if (point.pointId) byId.set(String(point.pointId), point);
      if (point.pointName) byName.set(String(point.pointName), point);
    }

    return (modules || []).map((mod) => ({
      ...mod,
      units: (mod.units || []).map((unit) => ({
        ...unit,
        points: (unit.points || []).map((point) => {
          const hit =
            (point.pointId && byId.get(String(point.pointId))) ||
            (point.pointName && byName.get(String(point.pointName)));
          return hit ? { ...point, ...hit } : { ...point };
        }),
      })),
    }));
  }

  function formatSeconds(seconds) {
    const n = Number(seconds || 0);
    if (!Number.isFinite(n) || n <= 0) return "";
    const min = Math.floor(n / 60);
    const sec = Math.floor(n % 60);
    return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
  }

  function formatSecondsClock(seconds) {
    const n = Number(seconds || 0);
    if (!Number.isFinite(n) || n < 0) return "";
    const total = Math.floor(n);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function getResourceTypeText(resource) {
    const dataType = Number(resource && resource.resourcesDataType);
    const type = Number(resource && resource.resourcesType);
    if (dataType === 11) return "视频";
    if (dataType === 12) return "链接";
    if (dataType === 21) return "图文";
    if (dataType === 22) return "视频";
    if (type === 1) return "资源";
    if (type === 2) return "资料";
    return "资源";
  }

  function isVideoResource(resource) {
    const dataType = Number(resource && resource.resourcesDataType);
    return dataType === 11 || dataType === 22;
  }

  function getResourceStatusText(resource) {
    return Number(resource && resource.studyStatus) === 1 ? "已学" : "未学";
  }

  function getResourceStudyTimeText(resource) {
    if (!isVideoResource(resource)) return "";
    const studied = Number(resource && resource.schedule);
    const total = Number(resource && resource.resourcesTime);
    const studiedText = formatSeconds(studied);
    const totalText = formatSeconds(total);
    if (studied > 0 && total > 0) return `进度 ${studiedText} / ${totalText}`;
    if (studied > 0) return `进度 ${studiedText}`;
    if (total > 0) return `时长 ${totalText}`;
    return "";
  }

  function clampPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function getVideoProgressPercent(summary) {
    if (!summary) return null;
    const studyTotal = Number(summary && summary.studyTotalTime);
    const schedule = Number(summary && summary.schedule);
    const total = Number(summary && summary.resourcesTime);
    const played =
      Number.isFinite(studyTotal) && studyTotal > 0 ? studyTotal : schedule;
    if (
      Number.isFinite(total) &&
      total > 0 &&
      Number.isFinite(played) &&
      played >= 0
    ) {
      return clampPercent((played / total) * 100);
    }
    return null;
  }

  function readSharedScriptCache(key) {
    try {
      if (typeof GM_getValue !== "function") return null;
      const raw = GM_getValue(key, "");
      return raw ? String(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSharedScriptCache(key, value) {
    try {
      if (typeof GM_setValue !== "function") return false;
      GM_setValue(key, String(value || ""));
      return true;
    } catch {
      return false;
    }
  }

  function loadAnySharedCourseCache(route) {
    if (!route || !route.courseId) return null;
    return (
      readSharedScriptCache(getCacheKey(route)) ||
      readSharedScriptCache(getLegacyCacheKey(route))
    );
  }

  function loadSharedKnowledgeCachePayload(route) {
    try {
      const raw = loadAnySharedCourseCache(route);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || !payload.result) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function getCurrentLearningProgressText(summary) {
    if (!summary) return "";
    const status = Number(summary && summary.studyStatus);
    if (!summary.isVideo)
      return status === 1 ? "学习状态: 已完成" : "学习状态: 未完成";
    const percent = getVideoProgressPercent(summary);
    if (status === 1) return "学习进度: 已完成";
    if (percent !== null) return `学习进度: ${percent}%`;
    return "学习进度: 未开始";
  }

  function getCurrentLearningDurationText(summary) {
    if (!summary || !summary.isVideo) return "";
    const studied = Number(summary && summary.studyTotalTime);
    const total = Number(summary && summary.resourcesTime);
    const studiedText = formatSeconds(studied);
    const totalText = formatSeconds(total);
    if (studied > 0 && total > 0)
      return `学习时长: ${studiedText} / ${totalText}`;
    if (studied > 0) return `学习时长: ${studiedText}`;
    if (total > 0) return `资源时长: ${totalText}`;
    return "";
  }

  function isSummaryLearned(summary) {
    if (!summary) return false;
    if (Number(summary.studyStatus) === 1) return true;
    if (summary.isVideo) {
      const percent = getVideoProgressPercent(summary);
      if (percent !== null && percent >= 100) return true;
    }
    return false;
  }

  function getTagStyle(kind) {
    const base =
      "display:inline-flex;align-items:center;padding:0 6px;border-radius:4px;font-size:11px;line-height:1.7;margin:2px 6px 2px 0;border:1px solid #dbe6f3;vertical-align:middle;background:#f8fafc;";
    if (kind === "done")
      return `${base}color:#166534;border-color:#86efac;background:#ecfdf3;`;
    if (kind === "todo")
      return `${base}color:#b91c1c;border-color:#fecaca;background:#fef2f2;`;
    if (kind === "type")
      return `${base}color:#334155;border-color:#cbd5e1;background:#f1f5f9;`;
    if (kind === "time")
      return `${base}color:#92400e;border-color:#fcd34d;background:#fffbeb;`;
    return `${base}color:#334155;border-color:#cbd5e1;background:#f1f5f9;`;
  }

  function appendTag(parent, text, kind) {
    if (!text) return;
    const tag = document.createElement("span");
    tag.textContent = text;
    tag.style.cssText = getTagStyle(kind);
    parent.appendChild(tag);
  }

  function normalizeProgressText(text) {
    return String(text || "")
      .replace(/\s+/g, "")
      .trim();
  }

  function getPointSummaryText(point) {
    const parts = [];
    const seen = new Set();
    function pushProgressText(text) {
      const value = String(text || "").trim();
      const key = normalizeProgressText(value);
      if (!value || seen.has(key)) return;
      seen.add(key);
      parts.push(value);
    }

    pushProgressText(point.progressText);
    if (
      point.requiredProgressText &&
      normalizeProgressText(point.requiredProgressText) !==
        normalizeProgressText(point.progressText) &&
      String(point.requiredProgressText).trim() !== ""
    ) {
      pushProgressText(point.requiredProgressText);
    }
    return parts.join(" | ");
  }

  function bindExclusiveDetails(detailsList) {
    for (const details of detailsList || []) {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        for (const peer of detailsList) {
          if (peer !== details) peer.open = false;
        }
      });
    }
  }

  const knowledgeTreeExpandedState = new Set();

  function captureTreeExpandedState(container) {
    const state = new Set(knowledgeTreeExpandedState);
    if (!container) return state;
    const list = container.querySelectorAll("details[data-zs-tree-key]");
    for (const details of list) {
      const key = String(details.dataset.zsTreeKey || "").trim();
      if (!key) continue;
      if (details.open) state.add(key);
      else state.delete(key);
    }
    return state;
  }

  function bindTreeExpandedState(details) {
    if (!details || details.dataset.zsTreeStateBound === "1") return;
    details.dataset.zsTreeStateBound = "1";
    details.addEventListener("toggle", () => {
      const key = String(details.dataset.zsTreeKey || "").trim();
      if (!key) return;
      if (details.open) knowledgeTreeExpandedState.add(key);
      else knowledgeTreeExpandedState.delete(key);
    });
  }

  function applyTreeExpandedState(details, expandedState, fallbackOpen) {
    if (!details) return;
    const key = String(details.dataset.zsTreeKey || "").trim();
    if (key && expandedState instanceof Set) {
      details.open = expandedState.has(key);
    } else {
      details.open = !!fallbackOpen;
    }
    bindTreeExpandedState(details);
  }

  const ICON_PATHS = {
    play: ["M8 5v14l11-7z"],
    pause: ["M10 5v14", "M14 5v14"],
    stop: ["M7 7h10v10H7z"],
    rewind10: ["M11 19l-7-7 7-7v14z", "M20 19l-7-7 7-7v14z"],
    forward10: ["M13 5l7 7-7 7V5z", "M4 5l7 7-7 7V5z"],
    volumeOn: [
      "M11 5 6 9H3v6h3l5 4z",
      "M16 9a5 5 0 0 1 0 6",
      "M19 7a8 8 0 0 1 0 10",
    ],
    volumeOff: ["M11 5 6 9H3v6h3l5 4z", "M16 9l5 6", "M21 9l-5 6"],
    eye: [
      "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z",
      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    ],
    eyeOff: [
      "M3 3l18 18",
      "M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-4.2 5.1",
      "M6.6 6.6A18.7 18.7 0 0 0 2 12s3.5 7 10 7c1.9 0 3.5-.5 5-1.2",
      "M9.9 9.9a3 3 0 0 0 4.2 4.2",
    ],
    chevronRight: ["M9 6l6 6-6 6"],
    chevronLeft: ["M15 6l-6 6 6 6"],
    externalLink: ["M14 3h7v7", "M10 14 21 3", "M21 14v7H3V3h7"],
    refresh: [
      "M3 12a9 9 0 0 1 15.5-6.4L21 8",
      "M21 3v5h-5",
      "M21 12a9 9 0 0 1-15.5 6.4L3 16",
      "M3 21v-5h5",
    ],
    copy: ["M9 9h11v11H9z", "M4 15H3V4h11v1"],
    download: ["M12 3v12", "M7 10l5 5 5-5", "M4 20h16"],
    search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-4.2-4.2"],
    key: [
      "M3 14a5 5 0 1 1 10 0 5 5 0 0 1-10 0z",
      "M13 14h8",
      "M18 14v3",
      "M15.5 14v2",
    ],
    close: ["M18 6 6 18", "M6 6 18 18"],
    check: ["M20 6 9 17 4 12"],
    flag: ["M5 21V5", "M5 5h11l-2.5 3L16 11H5"],
    star: [
      "m12 3.8 2.55 5.18 5.72.83-4.14 4.04.98 5.7L12 16.2 6.9 18.88l.98-5.7-4.14-4.04 5.72-.83L12 3.8z",
    ],
    heart: [
      "M19.5 5.5a4.6 4.6 0 0 0-6.5 0L12 6.5l-1-1a4.6 4.6 0 0 0-6.5 6.5l1 1L12 19.5l6.5-6.5 1-1a4.6 4.6 0 0 0 0-6.5z",
    ],
  };

  function createIcon(name, options = {}) {
    const paths = ICON_PATHS[name] || [];
    const size = Number(options.size || 14);
    const strokeWidth = Number(options.strokeWidth || 2);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", String(strokeWidth));
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.display = "inline-block";
    svg.style.flex = "0 0 auto";
    for (const d of paths) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    }
    return svg;
  }

  function setButtonIconLabel(btn, iconName, label, iconSize = 14) {
    if (!btn) return;
    btn.innerHTML = "";
    if (iconName) {
      const icon = createIcon(iconName, { size: iconSize });
      btn.appendChild(icon);
    }
    const text = document.createElement("span");
    text.textContent = label;
    btn.appendChild(text);
  }

  function createIconBadge(iconName, options = {}) {
    const badge = document.createElement("div");
    badge.style.cssText = [
      "flex:0 0 auto",
      "border-radius:999px",
      "min-width:26px",
      "height:26px",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      `border:1px solid ${options.borderColor || "#93c5fd"}`,
      `background:${options.bgColor || "#dbeafe"}`,
      `color:${options.iconColor || "#1d4ed8"}`,
    ].join(";");
    const icon = createIcon(iconName, {
      size: Number(options.iconSize || 16),
      strokeWidth: Number(options.strokeWidth || 2.2),
    });
    badge.appendChild(icon);
    return badge;
  }

  function findLatestUnfinishedResource(modules, options = {}) {
    const excludeUid = String(
      (options && options.excludeResourceUid) || "",
    ).trim();
    for (const mod of modules || []) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          for (const [resourceIndex, resource] of (
            point.requiredResources || []
          ).entries()) {
            const resourceUid = String(
              (resource && resource.resourcesUid) || "",
            ).trim();
            if (excludeUid && resourceUid && resourceUid === excludeUid)
              continue;
            if (Number(resource && resource.studyStatus) !== 1) {
              return {
                moduleName: mod.moduleName || "",
                unitName: unit.unitName || "",
                pointName: point.pointName || "",
                pointId: String(point.pointId || ""),
                resourceName:
                  resource.resourcesName ||
                  resource.resourcesFileName ||
                  resource.resourcesUid ||
                  "未命名资源",
                resourceUid,
                resourceIndex,
                resourceUrl: String(resource.resourcesUrl || ""),
                typeText: getResourceTypeText(resource),
                progressText: getResourceStudyTimeText(resource),
              };
            }
          }
        }
      }
    }
    return null;
  }

  function getRequiredProgressSummary(points) {
    let finished = 0;
    let total = 0;
    for (const point of points || []) {
      const pointTotal = Number(point && point.requiredResourceCount);
      const pointFinished = Number(point && point.requiredFinishedCount);
      if (Number.isFinite(pointTotal) && pointTotal > 0) {
        total += pointTotal;
        finished += Number.isFinite(pointFinished) ? pointFinished : 0;
      }
    }
    if (total <= 0) return "";
    return `${finished}/${total}`;
  }

  function getRequiredProgressRatio(result) {
    if (!result) return "";
    const byPoints = getRequiredProgressSummary(result.points);
    if (byPoints) return byPoints;

    let finished = 0;
    let total = 0;
    for (const mod of result.modules || []) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          for (const resource of point.requiredResources || []) {
            total += 1;
            if (Number(resource && resource.studyStatus) === 1) finished += 1;
          }
        }
      }
    }
    if (total <= 0) return "";
    return `${finished}/${total}`;
  }

  function textEquals(a, b) {
    return (
      String(a || "")
        .replace(/\s+/g, "")
        .trim() ===
      String(b || "")
        .replace(/\s+/g, "")
        .trim()
    );
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\s+/g, "")
      .trim();
  }

  function findPointElement(pointName) {
    const selectors = [
      ".section-item-collapse-info .title-text",
      ".collapse-item-sub .title-text",
    ];
    for (const selector of selectors) {
      const list = Array.from(document.querySelectorAll(selector));
      const exact = list.find((el) => textEquals(el.textContent, pointName));
      if (exact) return exact;
    }
    return null;
  }

  function findPointAndResource(result, resourceUid) {
    const targetUid = String(resourceUid || "").trim();
    if (!targetUid || !result || !Array.isArray(result.modules)) return null;
    for (const mod of result.modules) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          for (const [index, resource] of (
            point.requiredResources || []
          ).entries()) {
            if (String((resource && resource.resourcesUid) || "") !== targetUid)
              continue;
            return {
              module: mod,
              unit,
              point,
              resource,
              resourceIndex: index,
            };
          }
        }
      }
    }
    return null;
  }

  function setPendingResource(match) {
    try {
      const route = parseRoute();
      sessionStorage.setItem(
        getPendingResourceKey(route),
        JSON.stringify({
          createdAt: Date.now(),
          courseId: route.courseId,
          pointId: String((match && match.point && match.point.pointId) || ""),
          resourceUid: String(
            (match && match.resource && match.resource.resourcesUid) || "",
          ),
          resourceName: String(
            (match && match.resource && match.resource.resourcesName) || "",
          ),
        }),
      );
    } catch (e) {
      console.warn("[知识抓取] 保存待打开资源失败:", e.message);
    }
  }

  function setActiveResourceHint(match, source = "unknown") {
    try {
      const route = parseRoute();
      const payload = {
        createdAt: Date.now(),
        courseId: route.courseId,
        pointId: String((match && match.point && match.point.pointId) || ""),
        resourceUid: String(
          (match && match.resource && match.resource.resourcesUid) || "",
        ),
        resourceName: String(
          (match && match.resource && match.resource.resourcesName) || "",
        ),
        source: String(source || "unknown"),
      };
      if (!payload.pointId || !payload.resourceUid) return;
      sessionStorage.setItem(
        getActiveResourceHintKey(route),
        JSON.stringify(payload),
      );
    } catch (e) {
      console.warn("[知识抓取] 保存活动资源提示失败:", e.message);
    }
  }

  function getActiveResourceHint() {
    try {
      const route = parseRoute();
      const raw = sessionStorage.getItem(getActiveResourceHintKey(route));
      if (!raw) return null;
      const hint = JSON.parse(raw);
      if (!hint || !hint.resourceUid || !hint.pointId) return null;
      if (Date.now() - Number(hint.createdAt || 0) > 30 * 60 * 1000) {
        sessionStorage.removeItem(getActiveResourceHintKey(route));
        return null;
      }
      return hint;
    } catch {
      return null;
    }
  }

  function clearActiveResourceHint() {
    try {
      sessionStorage.removeItem(getActiveResourceHintKey(parseRoute()));
    } catch {}
  }

  function getPendingResource() {
    try {
      const route = parseRoute();
      const raw = sessionStorage.getItem(getPendingResourceKey(route));
      if (!raw) return null;
      const pending = JSON.parse(raw);
      if (!pending || !pending.resourceUid) return null;
      if (Date.now() - Number(pending.createdAt || 0) > 60000) {
        sessionStorage.removeItem(getPendingResourceKey(route));
        return null;
      }
      return pending;
    } catch {
      return null;
    }
  }

  function clearPendingResource() {
    try {
      sessionStorage.removeItem(getPendingResourceKey(parseRoute()));
    } catch {}
  }

  function buildPointUrl(pointId) {
    const route = parseRoute();
    const seg = location.pathname.split("/").filter(Boolean);
    const learnIdx = seg.indexOf("learnPage");
    if (learnIdx >= 0 && seg.length >= learnIdx + 4) {
      seg[learnIdx + 1] = route.courseId;
      seg[learnIdx + 2] = String(pointId || "");
      const url = new URL(location.href);
      url.pathname = `/${seg.join("/")}`;
      return url.toString();
    }
    const singleIdx = seg.indexOf("singleCourse");
    if (
      singleIdx >= 0 &&
      seg[singleIdx + 1] === "knowledgeStudy" &&
      seg.length >= singleIdx + 4
    ) {
      seg[singleIdx + 2] = route.courseId;
      seg[singleIdx + 3] = String(pointId || "");
      const url = new URL(location.href);
      url.pathname = `/${seg.join("/")}`;
      return url.toString();
    }
    return "";
  }

  function findPointByIdOrName(result, pointId, pointName) {
    const targetId = String(pointId || "").trim();
    const targetName = normalizeText(pointName);
    if (!result || !Array.isArray(result.modules)) return null;
    for (const mod of result.modules) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          if (targetId && String((point && point.pointId) || "") === targetId) {
            return { module: mod, unit, point };
          }
          if (
            targetName &&
            normalizeText(point && point.pointName) === targetName
          ) {
            return { module: mod, unit, point };
          }
        }
      }
    }
    return null;
  }

  function isExternalResource(resource) {
    const dataType = Number(resource && resource.resourcesDataType);
    const url = String((resource && resource.resourcesUrl) || "").trim();
    return dataType === 12 && /^https?:\/\//i.test(url);
  }

  function getCurrentVideoSrc() {
    const media = document.querySelector("video");
    if (!media) return "";
    return String(media.currentSrc || media.src || "").trim();
  }

  function getAssetStem(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw, location.href);
      const file = u.pathname.split("/").filter(Boolean).pop() || "";
      return file.replace(/\.[a-z0-9]+$/i, "").replace(/_(?:\d+|hd|sd)$/i, "");
    } catch {
      const file = raw.split("/").filter(Boolean).pop() || "";
      return file.replace(/\.[a-z0-9]+$/i, "").replace(/_(?:\d+|hd|sd)$/i, "");
    }
  }

  function getCurrentSegmentText() {
    const matches = Array.from(document.querySelectorAll("div,span,p"))
      .map((el) => String(el.textContent || "").trim())
      .filter((text) => /^00:00:00\s*-\s*\d{2}:\d{2}:\d{2}$/.test(text));
    return matches[0] || "";
  }

  function getCurrentPointNameFromPage() {
    const selectors = [
      ".study-main [class*=title]",
      ".resource-content [class*=title]",
      ".knowledge-title",
      "h1",
      "h2",
      "h3",
    ];
    for (const selector of selectors) {
      const list = Array.from(document.querySelectorAll(selector));
      for (const el of list) {
        const text = normalizeText(el.textContent);
        if (text && text.length >= 4) return text;
      }
    }
    return "";
  }

  function detectCurrentResource(result) {
    if (!result || !Array.isArray(result.modules)) return null;

    const route = parseRoute();
    const routePointId = String(route.classId || "").trim();
    const pointName = getCurrentPointNameFromPage();
    const pointMatch = findPointByIdOrName(result, routePointId, pointName);
    if (
      !pointMatch ||
      !Array.isArray(pointMatch.point.requiredResources) ||
      !pointMatch.point.requiredResources.length
    ) {
      return null;
    }

    const resources = pointMatch.point.requiredResources;
    if (resources.length === 1) {
      return {
        ...pointMatch,
        resource: resources[0],
        resourceIndex: 0,
        matchedBy: "single-resource",
      };
    }

    const currentVideoSrc = getCurrentVideoSrc();
    const currentVideoStem = getAssetStem(currentVideoSrc);
    if (currentVideoStem) {
      const hit = resources.findIndex((resource) => {
        const stems = [
          getAssetStem(resource.resourcesUrl),
          getAssetStem(resource.resourcesFileName),
          getAssetStem(resource.resourcesName),
        ].filter(Boolean);
        return stems.includes(currentVideoStem);
      });
      if (hit >= 0) {
        return {
          ...pointMatch,
          resource: resources[hit],
          resourceIndex: hit,
          matchedBy: "video-src",
        };
      }
    }

    const segmentText = getCurrentSegmentText();
    if (segmentText) {
      const hit = resources.findIndex(
        (resource) =>
          formatSecondsClock(resource.resourcesTime) ===
          segmentText.split("-").pop().trim(),
      );
      if (hit >= 0) {
        return {
          ...pointMatch,
          resource: resources[hit],
          resourceIndex: hit,
          matchedBy: "segment-time",
        };
      }
    }

    const bodyText = normalizeText(document.body && document.body.innerText);
    const hitByName = resources.findIndex((resource) => {
      const name = normalizeText(
        resource.resourcesName || resource.resourcesFileName,
      );
      if (!name) return false;
      if (!bodyText.includes(name)) return false;
      return (
        Number(resource.resourcesDataType) === 21 || resources.length === 1
      );
    });
    if (hitByName >= 0) {
      return {
        ...pointMatch,
        resource: resources[hitByName],
        resourceIndex: hitByName,
        matchedBy: "body-text",
      };
    }

    const activeHint = getActiveResourceHint();
    if (activeHint) {
      const currentPointId = String(
        (pointMatch.point && pointMatch.point.pointId) || "",
      );
      if (String(activeHint.pointId || "") !== currentPointId) {
        clearActiveResourceHint();
      } else {
        const hitByHint = resources.findIndex(
          (resource) =>
            String((resource && resource.resourcesUid) || "") ===
            String(activeHint.resourceUid || ""),
        );
        if (hitByHint >= 0) {
          return {
            ...pointMatch,
            resource: resources[hitByHint],
            resourceIndex: hitByHint,
            matchedBy: "active-hint",
          };
        }
      }
    }

    return {
      ...pointMatch,
      resource: null,
      resourceIndex: -1,
      matchedBy: "point-only",
    };
  }

  function getCurrentResourceSummary(result) {
    const match = detectCurrentResource(result);
    if (!match) return null;
    return {
      moduleName: match.module.moduleName || "",
      unitName: match.unit.unitName || "",
      pointId: String(match.point.pointId || ""),
      pointName: match.point.pointName || "",
      resourceName: match.resource
        ? match.resource.resourcesName ||
          match.resource.resourcesFileName ||
          match.resource.resourcesUid ||
          "未命名资源"
        : "未识别",
      resourceIndex: match.resourceIndex,
      resourceCount: Array.isArray(match.point.requiredResources)
        ? match.point.requiredResources.length
        : 0,
      resourcesUid: match.resource
        ? String(match.resource.resourcesUid || "")
        : "",
      resourcesFileId: match.resource
        ? String(match.resource.resourcesFileId || "")
        : "",
      resourcesType:
        match.resource && match.resource.resourcesType !== undefined
          ? Number(match.resource.resourcesType)
          : null,
      resourcesDataType:
        match.resource && match.resource.resourcesDataType !== undefined
          ? Number(match.resource.resourcesDataType)
          : null,
      studyStatus:
        match.resource && match.resource.studyStatus !== undefined
          ? Number(match.resource.studyStatus)
          : null,
      schedule:
        match.resource && match.resource.schedule !== undefined
          ? Number(match.resource.schedule)
          : null,
      studyTotalTime:
        match.resource && match.resource.studyTotalTime !== undefined
          ? Number(match.resource.studyTotalTime)
          : null,
      resourcesTime:
        match.resource && match.resource.resourcesTime !== undefined
          ? Number(match.resource.resourcesTime)
          : null,
      isVideo: isVideoResource(match.resource),
      matchedBy: match.matchedBy || "",
      isExternal: match.resource ? isExternalResource(match.resource) : false,
    };
  }

  function getClickableAncestor(el) {
    return el && el.closest
      ? el.closest('a,button,[role="button"],li,div')
      : null;
  }

  function triggerElementClick(el) {
    if (!el) return false;
    const target = getClickableAncestor(el) || el;
    try {
      target.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    } catch {}
    target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    target.click();
    return true;
  }

  function refocusCourseTab() {
    const tries = [40, 120, 260, 520, 900, 1400];
    for (const delay of tries) {
      window.setTimeout(() => {
        try {
          window.focus();
        } catch {}
      }, delay);
    }
  }

  async function clickExternalResourceAndKeepCourseTab(
    resource,
    timeoutMs = 10000,
    preferredIndex = -1,
  ) {
    const pageWin = getPageWindow();
    const canPatchOpen = !!(pageWin && typeof pageWin.open === "function");
    const canUseGMOpenInTab = typeof GM_openInTab === "function";
    let restored = false;
    let originalOpen = null;

    function restoreOpen() {
      if (restored || !canPatchOpen || !originalOpen) return;
      try {
        pageWin.open = originalOpen;
      } catch {}
      restored = true;
    }

    try {
      if (canPatchOpen) {
        originalOpen = pageWin.open;
        pageWin.open = function patchedOpen(url, target, features) {
          const href = String(url || "").trim();
          if (href && /^https?:\/\//i.test(href) && canUseGMOpenInTab) {
            try {
              GM_openInTab(href, {
                active: false,
                insert: true,
                setParent: true,
              });
              refocusCourseTab();
              return null;
            } catch (e) {
              console.warn(
                "[知识抓取] GM_openInTab 打开外链失败，回退 window.open:",
                e.message,
              );
            }
          }
          return originalOpen.apply(this, arguments);
        };
      }

      await clickResourceInPage(resource, timeoutMs, preferredIndex);
      refocusCourseTab();
      return true;
    } finally {
      window.setTimeout(restoreOpen, 50);
      window.setTimeout(restoreOpen, 600);
    }
  }

  async function openPointInPage(point, timeoutMs = 12000) {
    const pointName = String((point && point.pointName) || "").trim();
    if (!pointName) throw new Error("知识点名称为空");
    const startTime = Date.now();
    const pointEl = findPointElement(pointName);
    if (!pointEl) throw new Error(`页面内未找到知识点: ${pointName}`);
    triggerElementClick(pointEl);
    const traffic = await waitForCapturedResourceResponse(
      startTime,
      point.pointId,
      timeoutMs,
    );
    if (!traffic) await sleep(1200);
    return true;
  }

  function getResourceCardElements() {
    const selectors = [
      ".resources-list .basic-info-video-card-container",
      '.resources-list [class*="basic-info"][class*="card-container"]',
    ];
    const seen = new Set();
    const list = [];
    for (const selector of selectors) {
      for (const el of Array.from(document.querySelectorAll(selector))) {
        if (!el || seen.has(el)) continue;
        seen.add(el);
        list.push(el);
      }
    }
    return list;
  }

  function findResourceElement(resource, preferredIndex = -1) {
    const name = normalizeText(
      resource && (resource.resourcesName || resource.resourcesFileName),
    );
    const uid = String((resource && resource.resourcesUid) || "").trim();
    const fileId = String((resource && resource.resourcesFileId) || "").trim();
    const url = String((resource && resource.resourcesUrl) || "").trim();

    const index = Number(preferredIndex);
    const cards = getResourceCardElements();
    if (Number.isInteger(index) && index >= 0 && index < cards.length) {
      return cards[index];
    }
    if (name && cards.length) {
      const exactCard = cards.find(
        (el) => normalizeText(el.textContent) === name,
      );
      if (exactCard) return exactCard;
      const containsCard = cards.find((el) => {
        const text = normalizeText(el.textContent);
        return !!(text && text.includes(name));
      });
      if (containsCard) return containsCard;
    }

    if (!name && !uid && !fileId && !url) return null;

    const candidates = Array.from(
      document.querySelectorAll('a, button, [role="button"], li, div, span'),
    ).filter((el) => {
      const text = normalizeText(el.textContent);
      if (!text) return false;
      if (name) {
        if (text === name) return true;
        if (text.includes(name)) return true;
        if (name.length >= 6 && name.includes(text)) return true;
      }
      const html = String(el.outerHTML || "");
      if (uid && html.includes(uid)) return true;
      if (fileId && html.includes(fileId)) return true;
      if (url && html.includes(url)) return true;
      return false;
    });

    if (!candidates.length) return null;

    const exact = candidates.find(
      (el) => normalizeText(el.textContent) === name,
    );
    if (exact) return exact;
    const contains = candidates.find((el) => {
      const text = normalizeText(el.textContent);
      return !!(name && text && text.includes(name));
    });
    return contains || candidates[0];
  }

  async function clickResourceInPage(
    resource,
    timeoutMs = 10000,
    preferredIndex = -1,
  ) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const resourceEl = findResourceElement(resource, preferredIndex);
      if (resourceEl) {
        triggerElementClick(resourceEl);
        return true;
      }
      await sleep(250);
    }
    throw new Error(
      `页面内未找到资源: ${resource.resourcesName || resource.resourcesUid || "未命名资源"}`,
    );
  }

  async function openResourceInCourse(result, resourceUid) {
    const match = findPointAndResource(result, resourceUid);
    if (!match) {
      throw new Error(`缓存中未找到资源 ${resourceUid}`);
    }
    const route = parseRoute();
    if (String(route.classId || "") !== String(match.point.pointId || "")) {
      setPendingResource(match);
      setActiveResourceHint(match, "navigate-to-point");
      if (isVideoResource(match.resource)) {
        saveVideoSeekHint(
          match.resource.resourcesUid,
          Number(match.resource.studyTotalTime || 0),
        );
      } else {
        clearVideoSeekHint();
      }
      const targetUrl = buildPointUrl(match.point.pointId);
      if (!targetUrl) throw new Error("无法构造目标知识点 URL");
      location.assign(targetUrl);
      return { ...match, openMode: "navigating" };
    }
    if (isExternalResource(match.resource)) {
      await clickExternalResourceAndKeepCourseTab(
        match.resource,
        12000,
        match.resourceIndex,
      );
      setActiveResourceHint(match, "external-click");
      clearPendingResource();
      return { ...match, openMode: "external-in-page" };
    }
    if (isVideoResource(match.resource)) {
      saveVideoSeekHint(
        match.resource.resourcesUid,
        Number(match.resource.studyTotalTime || 0),
      );
    } else {
      clearVideoSeekHint();
    }
    await clickResourceInPage(match.resource, 10000, match.resourceIndex);
    setActiveResourceHint(match, "in-page-click");
    clearPendingResource();
    return { ...match, openMode: "in-page" };
  }

  async function resumePendingResource(result, onStatus) {
    const pending = getPendingResource();
    if (!pending || !result) return false;
    const match = findPointAndResource(result, pending.resourceUid);
    if (!match) {
      clearPendingResource();
      return false;
    }
    const route = parseRoute();
    if (String(route.classId || "") !== String(match.point.pointId || "")) {
      const targetUrl = buildPointUrl(match.point.pointId);
      if (targetUrl) location.assign(targetUrl);
      return true;
    }
    if (typeof onStatus === "function") {
      onStatus(
        `状态: 继续打开资源 - ${match.resource.resourcesName || match.resource.resourcesUid}`,
      );
    }
    if (isVideoResource(match.resource)) {
      saveVideoSeekHint(
        match.resource.resourcesUid,
        Number(match.resource.studyTotalTime || 0),
      );
    } else {
      clearVideoSeekHint();
    }
    await clickResourceInPage(match.resource, 15000, match.resourceIndex);
    setActiveResourceHint(match, "resume-pending");
    clearPendingResource();
    if (typeof onStatus === "function") {
      onStatus(
        `状态: 已打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`,
      );
    }
    return true;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForCapturedResourceResponse(
    startTime,
    pointId,
    timeoutMs = 8000,
  ) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (let i = CAPTURED_TRAFFIC.length - 1; i >= 0; i--) {
        const item = CAPTURED_TRAFFIC[i];
        if (!item || item.time < startTime) continue;
        if (
          !item.url ||
          !item.url.includes("/resources/list-knowledge-resource")
        )
          continue;
        if (!item.responseJson || !isSuccessResponse(item.responseJson))
          continue;
        const responsePointId = extractPointIdFromKnowledgeResourcesResponse(
          item.responseJson,
        );
        if (
          !pointId ||
          !responsePointId ||
          String(responsePointId) === String(pointId)
        )
          return item;
      }
      await sleep(200);
    }
    return null;
  }

  function normalizeRequiredResourcesFromResponse(json) {
    const resources = getResourceListFromResponse(json);
    return resources
      .filter((r) => Number(r.resourcesSyncType) === 1)
      .map((r) => ({
        resourcesUid: String(r.resourcesUid || ""),
        resourcesName: String(r.resourcesName || ""),
        resourcesSyncType: Number(r.resourcesSyncType),
        studyStatus: r.studyStatus === undefined ? null : Number(r.studyStatus),
        schedule: r.schedule === undefined ? null : Number(r.schedule),
        resourcesType:
          r.resourcesType === undefined ? null : Number(r.resourcesType),
        resourcesDataType:
          r.resourcesDataType === undefined
            ? null
            : Number(r.resourcesDataType),
        resourcesLocalType:
          r.resourcesLocalType === undefined
            ? null
            : Number(r.resourcesLocalType),
        resourcesFileId: String(r.resourcesFileId || ""),
        resourcesFileName: String(r.resourcesFileName || ""),
        resourcesUrl: String(r.resourcesUrl || ""),
        resourcesTime:
          r.resourcesTime === undefined ? null : Number(r.resourcesTime),
        studyTotalTime:
          r.studyTotalTime === undefined ? null : Number(r.studyTotalTime),
        resourcesTag: String(r.resourcesTag || ""),
      }));
  }

  function buildKnowledgeResourcePayloadVariants(route, point) {
    const base = {
      courseId: route.courseId,
      classId: route.classId,
      dateFormate: getDateFormate(),
    };
    const pointId = String(point.pointId || "");
    return [
      { ...base, knowledgeId: pointId, nodeUid: pointId },
      { ...base, knowledgeId: pointId },
      { ...base, nodeUid: pointId },
    ];
  }

  async function collectRequiredResources(options = {}) {
    const route = parseRoute();
    const base = await collectKnowledge();
    const points = flattenPoints(base.modules);
    const gapMs = Number(options.gapMs || 0);
    const concurrency = Math.max(
      1,
      Math.min(Number(options.concurrency || 8), points.length || 1),
    );
    const results = new Array(points.length);
    const endpoint = `${API_BASE}/resources/list-knowledge-resource`;
    let nextIndex = 0;
    let completed = 0;

    async function fetchPoint(point) {
      if (!point.pointId) {
        return {
          ...point,
          status: "missing-point-id",
          requiredResourceCount: 0,
          requiredFinishedCount: 0,
          requiredResources: [],
        };
      }

      try {
        const apiRes = await requestWithVariants(
          endpoint,
          buildKnowledgeResourcePayloadVariants(route, point),
        );
        if (!apiRes.ok) {
          return {
            ...point,
            status: "api-failed",
            sourceEndpoint: endpoint,
            requiredResourceCount: 0,
            requiredFinishedCount: 0,
            requiredResources: [],
            errors: apiRes.errors || [],
          };
        }

        const requiredResources = normalizeRequiredResourcesFromResponse(
          apiRes.data,
        );
        const requiredFinishedCount = requiredResources.filter(
          (r) => Number(r.studyStatus) === 1,
        ).length;
        return {
          ...point,
          status: "ok",
          sourceEndpoint: endpoint,
          sourceMethod: apiRes.method || "POST-ENCRYPTED",
          responsePointId: extractPointIdFromKnowledgeResourcesResponse(
            apiRes.data,
          ),
          requestPayload: apiRes.payload || null,
          requiredResourceCount: requiredResources.length,
          requiredFinishedCount,
          requiredProgressText: `必学 ${requiredFinishedCount}/${requiredResources.length}`,
          requiredResources,
        };
      } catch (e) {
        return {
          ...point,
          status: `exception: ${e.message}`,
          sourceEndpoint: endpoint,
          requiredResourceCount: 0,
          requiredFinishedCount: 0,
          requiredResources: [],
        };
      }
    }

    async function worker() {
      while (nextIndex < points.length) {
        const idx = nextIndex++;
        const point = points[idx];
        if (typeof options.onProgress === "function") {
          options.onProgress({
            current: completed,
            total: points.length,
            point,
            phase: "start",
          });
        }
        const result = await fetchPoint(point);
        results[idx] = result;
        completed += 1;
        if (typeof options.onProgress === "function") {
          options.onProgress({
            current: completed,
            total: points.length,
            point,
            result,
            phase: "done",
          });
        }
        if (gapMs > 0) await sleep(gapMs);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const modulesWithResources = attachRequiredResourcesToModules(
      base.modules,
      results,
    );

    return {
      fetchedAt: new Date().toISOString(),
      page: location.href,
      params: route,
      source: "direct-encrypted-api:/stu/resources/list-knowledge-resource",
      concurrency,
      pointCount: points.length,
      okCount: results.filter((r) => r.status === "ok").length,
      timeoutCount: 0,
      errorCount: results.filter((r) => r.status !== "ok").length,
      elementMissingCount: 0,
      modules: modulesWithResources,
      points: results,
      structure: {
        ...base,
        modules: modulesWithResources,
      },
    };
  }

  async function collectKnowledge() {
    const route = parseRoute();
    const basePayload = {
      courseId: route.courseId,
      classId: route.classId,
      dateFormate: getDateFormate(),
    };
    const extPayload = {
      ...basePayload,
      knowledgeId: route.nodeUid,
      nodeUid: route.nodeUid,
    };

    const urls = {
      knowledgeDic: `${API_BASE}/knowledge-study/get-course-knowledge-dic`,
      moduleInfo: `${API_BASE_COMMON}/course/query-module-info`,
      themeNodeList: `${API_BASE}/maptree/get-theme-node-list`,
    };

    const [knowledgeDicRes, moduleInfoRes, themeNodeListRes] =
      await Promise.all([
        requestWithVariants(urls.knowledgeDic, [basePayload, extPayload]),
        requestWithVariants(urls.moduleInfo, [basePayload, extPayload]),
        requestWithVariants(urls.themeNodeList, [basePayload, extPayload]),
      ]);

    const knowledgeDicRaw = knowledgeDicRes.ok
      ? knowledgeDicRes.data
      : { __error: knowledgeDicRes.errors };
    const moduleInfoRaw = moduleInfoRes.ok
      ? moduleInfoRes.data
      : { __error: moduleInfoRes.errors };
    const themeNodeListRaw = themeNodeListRes.ok
      ? themeNodeListRes.data
      : { __error: themeNodeListRes.errors };

    let modules = normalizeKnowledgeDic(knowledgeDicRaw);
    let source = "knowledge-study/get-course-knowledge-dic";

    if (!modules.length) {
      const fallback = normalizeModuleInfo(moduleInfoRaw);
      if (fallback.length) {
        modules = fallback;
        source = "common/course/query-module-info (fixed path)";
      }
    }

    if (!modules.length) {
      const fallback = normalizeThemeNodeList(themeNodeListRaw);
      if (fallback.length) {
        modules = fallback;
        source = "maptree/get-theme-node-list";
      }
    }

    if (!modules.length) {
      const fallback = normalizeFromCaptured();
      if (fallback.length) {
        modules = fallback;
        source = "captured-network-response";
      }
    }

    // 优先使用真实命中的接口响应（页面实际请求），避免猜测结构。
    if (!modules.length) {
      const t1 = pickLatestTrafficByUrl(
        "/knowledge-study/get-course-knowledge-dic",
      );
      if (t1) {
        const m = normalizeKnowledgeDic(t1.responseJson);
        if (m.length) {
          modules = m;
          source = "captured-api:get-course-knowledge-dic";
        }
      }
    }
    if (!modules.length) {
      const t2 = pickLatestTrafficByUrl(
        "/knowledge-study/list-knowledge-theme",
      );
      if (t2) {
        const m = normalizeKnowledgeDic(t2.responseJson);
        if (m.length) {
          modules = m;
          source = "captured-api:list-knowledge-theme";
        }
      }
    }
    if (!modules.length) {
      const t3 = pickLatestTrafficByUrl("/maptree/get-theme-node-list");
      if (t3) {
        const m = normalizeThemeNodeList(t3.responseJson);
        if (m.length) {
          modules = m;
          source = "captured-api:get-theme-node-list";
        }
      }
    }

    const apiMeta = extractPointMetaFromCapturedApis();
    modules = mergePointMeta(modules, apiMeta);
    const hasKnowledgeResourcesTraffic = CAPTURED_TRAFFIC.some(
      (it) =>
        it && it.url && it.url.includes("/resources/list-knowledge-resource"),
    );
    const hasKnowledgeDicTraffic = CAPTURED_TRAFFIC.some(
      (it) =>
        it &&
        it.url &&
        it.url.includes("/knowledge-study/get-course-knowledge-dic"),
    );
    const progressCaptureReason =
      apiMeta.byPointId.size + apiMeta.byPointName.size > 0
        ? "ok"
        : hasKnowledgeResourcesTraffic
          ? "captured progress api but no recognizable count fields"
          : hasKnowledgeDicTraffic
            ? "captured get-course-knowledge-dic but no recognizable count fields"
            : "no captured call: /stu/resources/list-knowledge-resource or /stu/knowledge-study/get-course-knowledge-dic";

    const stats = countStats(modules);
    return {
      fetchedAt: new Date().toISOString(),
      page: location.href,
      params: route,
      source,
      ...stats,
      modules,
      raw: {
        knowledgeDic: knowledgeDicRaw,
        moduleInfo: moduleInfoRaw,
        themeNodeList: themeNodeListRaw,
      },
      debug: {
        knowledgeDic: {
          ok: knowledgeDicRes.ok,
          errors: knowledgeDicRes.errors,
        },
        moduleInfo: { ok: moduleInfoRes.ok, errors: moduleInfoRes.errors },
        themeNodeList: {
          ok: themeNodeListRes.ok,
          errors: themeNodeListRes.errors,
        },
        capturedCount: CAPTURED_RESPONSES.length,
        capturedTrafficCount: CAPTURED_TRAFFIC.length,
        apiPointMetaCount: apiMeta.byPointId.size + apiMeta.byPointName.size,
        apiPointMetaById: apiMeta.byPointId.size,
        apiPointMetaByName: apiMeta.byPointName.size,
        apiPointMetaSources: apiMeta.sourceCount || {},
        progressCaptureReason,
        observedApiEndpoints: listObservedApiEndpoints().slice(0, 20),
        apiSamples: {
          supplements: pickApiSample("/maptree/list-node-detail-supplements"),
          knowledgeResources: pickApiSample(
            "/resources/list-knowledge-resource",
          ),
          knowledgeDic: pickApiSample(
            "/knowledge-study/get-course-knowledge-dic",
          ),
        },
      },
    };
  }

  function renderTree(container, result, handlers = {}) {
    const expandedState = captureTreeExpandedState(container);
    container.innerHTML = "";

    if (
      !result ||
      !Array.isArray(result.modules) ||
      result.modules.length === 0
    ) {
      const empty = document.createElement("div");
      empty.textContent = "未抓取到结构数据";
      empty.style.cssText = "color:#64748b;padding:8px 0;";
      container.appendChild(empty);
      return;
    }

    const moduleDetailsList = [];

    for (const [modIndex, mod] of result.modules.entries()) {
      const modDetails = document.createElement("details");
      modDetails.dataset.zsTreeKey = `module:${String(mod.moduleName || "未命名").trim()}`;
      applyTreeExpandedState(modDetails, expandedState, modIndex === 0);
      modDetails.style.cssText =
        "margin-bottom:6px;border:1px solid #cbd5e1;border-radius:7px;padding:4px 6px;background:#ffffff;";
      moduleDetailsList.push(modDetails);

      const modSummary = document.createElement("summary");
      const modProgressText = getRequiredProgressSummary(
        (mod.units || []).flatMap((unit) => unit.points || []),
      );
      modSummary.style.cssText =
        "cursor:pointer;color:#1e3a8a;font-weight:700;font-size:14px;line-height:1.45;display:flex;align-items:center;justify-content:space-between;gap:8px;";
      const modLeft = document.createElement("span");
      modLeft.style.cssText =
        "display:inline-flex;align-items:center;min-width:0;max-width:72%;";
      const modTag = document.createElement("span");
      modTag.textContent = "模块";
      modTag.style.cssText =
        "display:inline-flex;align-items:center;flex:0 0 auto;white-space:nowrap;padding:0 6px;height:20px;border-radius:999px;border:1px solid #93c5fd;background:#dbeafe;color:#1d4ed8;font-size:12px;line-height:1;font-weight:700;vertical-align:middle;margin-right:6px;";
      const modText = document.createElement("span");
      modText.textContent = `${mod.moduleName || "未命名"}`;
      modText.style.cssText =
        "min-width:0;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      const modRatio = document.createElement("span");
      modRatio.textContent = modProgressText || "0/0";
      modRatio.style.cssText =
        "flex:0 0 auto;color:#1d4ed8;font-size:12px;font-weight:700;line-height:1.2;";
      modLeft.appendChild(modTag);
      modLeft.appendChild(modText);
      modSummary.appendChild(modLeft);
      modSummary.appendChild(modRatio);
      modDetails.appendChild(modSummary);

      const unitsWrap = document.createElement("div");
      unitsWrap.style.cssText = "margin-top:6px;padding-left:8px;";
      const unitDetailsList = [];

      for (const [unitIndex, unit] of (mod.units || []).entries()) {
        const unitDetails = document.createElement("details");
        unitDetails.dataset.zsTreeKey = `unit:${String(mod.moduleName || "未命名").trim()}::${String(unit.unitName || "未命名").trim()}`;
        applyTreeExpandedState(
          unitDetails,
          expandedState,
          modIndex === 0 && unitIndex === 0,
        );
        unitDetails.style.cssText = "margin-bottom:6px;";
        unitDetailsList.push(unitDetails);

        const unitSummary = document.createElement("summary");
        const unitProgressText = getRequiredProgressSummary(unit.points || []);
        unitSummary.style.cssText =
          "cursor:pointer;color:#334155;font-weight:600;font-size:13px;line-height:1.45;display:flex;align-items:center;justify-content:space-between;gap:8px;";
        const unitLeft = document.createElement("span");
        unitLeft.style.cssText =
          "display:inline-flex;align-items:center;min-width:0;max-width:72%;";
        const unitTag = document.createElement("span");
        unitTag.textContent = "单元";
        unitTag.style.cssText =
          "display:inline-flex;align-items:center;flex:0 0 auto;white-space:nowrap;padding:0 6px;height:18px;border-radius:999px;border:1px solid #cbd5e1;background:#f1f5f9;color:#475569;font-size:11px;line-height:1;font-weight:700;vertical-align:middle;margin-right:6px;";
        const unitText = document.createElement("span");
        unitText.textContent = `${unit.unitName || "未命名"}`;
        unitText.style.cssText =
          "min-width:0;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        const unitRatio = document.createElement("span");
        unitRatio.textContent = unitProgressText || "0/0";
        unitRatio.style.cssText =
          "flex:0 0 auto;color:#334155;font-size:12px;font-weight:700;line-height:1.2;";
        unitLeft.appendChild(unitTag);
        unitLeft.appendChild(unitText);
        unitSummary.appendChild(unitLeft);
        unitSummary.appendChild(unitRatio);
        unitDetails.appendChild(unitSummary);

        const pointsList = document.createElement("ul");
        pointsList.style.cssText = "margin:6px 0 0 14px;padding:0;";
        for (const point of unit.points || []) {
          const li = document.createElement("li");
          const hasRequiredResources =
            Array.isArray(point.requiredResources) &&
            point.requiredResources.length > 0;
          const pointTitle = document.createElement(
            hasRequiredResources ? "summary" : "div",
          );
          const pointSummaryText = getPointSummaryText(point);
          const pointNameText = String(point.pointName || "未命名知识点");
          const ratioMatch = String(pointSummaryText || "").match(
            /(\d+\s*\/\s*\d+)/,
          );
          const pointRatioText = ratioMatch
            ? ratioMatch[1].replace(/\s+/g, "")
            : "";
          li.style.cssText =
            "list-style:none;color:#334155;line-height:1.6;margin-bottom:5px;font-size:13px;";
          pointTitle.style.display = "flex";
          pointTitle.style.alignItems = "center";
          pointTitle.style.justifyContent = "space-between";
          pointTitle.style.gap = "8px";
          pointTitle.style.minWidth = "0";
          const pointLeft = document.createElement("span");
          pointLeft.style.cssText =
            "display:inline-flex;align-items:center;min-width:0;max-width:76%;flex:1 1 auto;";
          const pointNameSpan = document.createElement("span");
          pointNameSpan.textContent = pointNameText;
          pointNameSpan.style.cssText =
            "min-width:0;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
          pointLeft.appendChild(pointNameSpan);
          if (!pointRatioText && pointSummaryText) {
            const extra = document.createElement("span");
            extra.textContent = ` (${pointSummaryText})`;
            extra.style.cssText =
              "color:#475569;font-size:12px;margin-left:4px;";
            pointLeft.appendChild(extra);
          }
          pointTitle.appendChild(pointLeft);
          if (pointRatioText) {
            const pointRatio = document.createElement("span");
            pointRatio.textContent = pointRatioText;
            pointRatio.style.cssText =
              "flex:0 0 auto;color:#334155;font-size:12px;font-weight:700;line-height:1.2;";
            pointTitle.appendChild(pointRatio);
          }

          const pointContent = hasRequiredResources
            ? document.createElement("details")
            : li;
          if (hasRequiredResources) {
            pointContent.dataset.zsTreeKey = `point:${String(mod.moduleName || "未命名").trim()}::${String(unit.unitName || "未命名").trim()}::${pointNameText}`;
            applyTreeExpandedState(pointContent, expandedState, false);
            pointContent.style.cssText = "margin:0;";
            pointTitle.style.cursor = "pointer";
            pointTitle.style.color = "#0f172a";
            pointTitle.style.fontWeight = "600";
            pointTitle.style.fontSize = "13px";
            pointTitle.style.lineHeight = "1.55";
            pointContent.appendChild(pointTitle);
            li.appendChild(pointContent);
          } else {
            pointTitle.style.color = "#0f172a";
            pointTitle.style.fontSize = "13px";
            pointTitle.style.lineHeight = "1.55";
            li.appendChild(pointTitle);
          }

          if (hasRequiredResources) {
            const resourceWrap = document.createElement("div");
            resourceWrap.style.cssText =
              "margin-top:4px;padding:6px 8px 4px 10px;border-left:3px solid #94a3b8;background:#ffffff;";

            if (point.requiredResources.length > 0) {
              const resourceList = document.createElement("ol");
              resourceList.style.cssText = "margin:0;padding-left:0;";
              for (const resource of point.requiredResources) {
                const resourceItem = document.createElement("li");
                resourceItem.style.cssText =
                  "color:#334155;font-size:13px;margin:7px 0;";

                const name =
                  resource.resourcesName ||
                  resource.resourcesFileName ||
                  resource.resourcesUid ||
                  "未命名资源";
                const statusText = getResourceStatusText(resource);
                const typeText = getResourceTypeText(resource);
                const row = document.createElement("div");
                row.style.cssText =
                  "display:flex;align-items:center;gap:8px;min-width:0;";

                const titleWrap = document.createElement("div");
                titleWrap.style.cssText =
                  "min-width:0;line-height:1.6;flex:1 1 auto;max-width:72%;";

                const openBtn = document.createElement("button");
                openBtn.type = "button";
                openBtn.textContent = name;
                openBtn.style.cssText =
                  "border:none;background:transparent;padding:0;color:#1d4ed8;cursor:pointer;text-align:left;font:inherit;display:block;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;word-break:normal;";
                if (
                  typeof handlers.onOpenResource === "function" &&
                  resource.resourcesUid
                ) {
                  openBtn.addEventListener("click", async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openBtn.disabled = true;
                    const originalText = openBtn.textContent;
                    openBtn.textContent = "打开中...";
                    try {
                      await handlers.onOpenResource(resource, point);
                      openBtn.textContent = originalText;
                    } catch (err) {
                      openBtn.textContent = originalText;
                      alert(err && err.message ? err.message : "打开资源失败");
                    } finally {
                      openBtn.disabled = false;
                    }
                  });
                }
                titleWrap.appendChild(openBtn);

                const tagsWrap = document.createElement("div");
                tagsWrap.style.cssText =
                  "display:flex;flex-wrap:nowrap;align-items:center;gap:6px;opacity:.95;flex:0 0 auto;white-space:nowrap;";
                appendTag(
                  tagsWrap,
                  statusText,
                  Number(resource && resource.studyStatus) === 1
                    ? "done"
                    : "todo",
                );
                appendTag(tagsWrap, typeText, "type");

                row.appendChild(titleWrap);
                row.appendChild(tagsWrap);
                resourceItem.appendChild(row);
                resourceList.appendChild(resourceItem);
              }
              resourceWrap.appendChild(resourceList);
            }

            pointContent.appendChild(resourceWrap);
          }

          pointsList.appendChild(li);
        }
        unitDetails.appendChild(pointsList);
        unitsWrap.appendChild(unitDetails);
      }

      bindExclusiveDetails(unitDetailsList);

      modDetails.appendChild(unitsWrap);
      container.appendChild(modDetails);
    }

    bindExclusiveDetails(moduleDetailsList);
  }

  function createVideoControlPanel(
    anchorPanel,
    getResult,
    isAutomationRunning,
  ) {
    const existing = document.getElementById("zs-video-control-panel");
    if (existing) return existing;

    const panel = document.createElement("div");
    panel.id = "zs-video-control-panel";
    panel.style.cssText = [
      "position:fixed",
      "right:20px",
      "z-index:999999",
      "background:#ffffff",
      "color:#0f172a",
      "padding:14px 12px",
      "box-sizing:border-box",
      "border-radius:14px",
      "font-size:12px",
      "width:460px",
      "display:flex",
      "flex-direction:column",
      "gap:12px",
      "border:1px solid #dbe6f3",
      "user-select:none",
      "overflow:auto",
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:8px;";

    const title = document.createElement("div");
    title.textContent = "视频控制";
    title.style.cssText =
      "font-weight:800;font-size:13px;color:#0f172a;line-height:1.2;letter-spacing:.2px;";

    const stateBadge = document.createElement("div");
    stateBadge.textContent = "未就绪";
    stateBadge.style.cssText =
      "padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:11px;font-weight:700;line-height:1.4;";

    header.appendChild(title);
    header.appendChild(stateBadge);

    function makeControlButton(bg, fg) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = `border:none;background:${bg};color:${fg};padding:6px 10px;border-radius:9px;cursor:pointer;font-weight:700;line-height:1;display:inline-flex;align-items:center;justify-content:center;text-align:center;gap:6px;min-height:30px;`;
      return btn;
    }

    const controlsWrap = document.createElement("div");
    controlsWrap.style.cssText = "display:flex;flex-direction:column;gap:8px;";

    const primaryControls = document.createElement("div");
    primaryControls.style.cssText =
      "display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:8px;";

    const audioControls = document.createElement("div");
    audioControls.style.cssText =
      "display:grid;grid-template-columns:1fr 1fr;gap:8px;";

    const btnBack = makeControlButton("#e2e8f0", "#1e293b");
    setButtonIconLabel(btnBack, "rewind10", "10s");

    const btnPlayPause = makeControlButton("#22c55e", "#052e16");
    setButtonIconLabel(btnPlayPause, "play", "播放");

    const btnForward = makeControlButton("#e2e8f0", "#1e293b");
    setButtonIconLabel(btnForward, "forward10", "10s");

    const btnMute = makeControlButton("#cbd5e1", "#0f172a");
    setButtonIconLabel(btnMute, "volumeOff", "静音");

    const btnAutoMute = makeControlButton("#bae6fd", "#075985");
    setButtonIconLabel(btnAutoMute, "volumeOff", "自动静音: 开");

    primaryControls.appendChild(btnBack);
    primaryControls.appendChild(btnPlayPause);
    primaryControls.appendChild(btnForward);
    audioControls.appendChild(btnMute);
    audioControls.appendChild(btnAutoMute);
    controlsWrap.appendChild(primaryControls);
    controlsWrap.appendChild(audioControls);

    const canvasWrap = document.createElement("div");
    canvasWrap.style.cssText =
      "padding:0;border:none;background:transparent;border-radius:0;";

    const progressCanvas = document.createElement("canvas");
    progressCanvas.width = 438;
    progressCanvas.height = 34;
    progressCanvas.style.cssText =
      "width:100%;height:34px;display:block;cursor:pointer;";
    canvasWrap.appendChild(progressCanvas);

    const timeRow = document.createElement("div");
    timeRow.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;color:#64748b;font-size:12px;padding-top:2px;";
    const videoStateText = document.createElement("div");
    videoStateText.textContent = "未检测到视频";
    const timeText = document.createElement("div");
    timeText.textContent = "--:-- / --:--";
    timeRow.appendChild(videoStateText);
    timeRow.appendChild(timeText);

    panel.appendChild(header);
    panel.appendChild(controlsWrap);
    panel.appendChild(canvasWrap);
    panel.appendChild(timeRow);
    document.body.appendChild(panel);

    let currentVideo = null;
    let autoMuteEnabled = loadVideoAutoMuteEnabled();
    let dragging = false;
    let knobHover = false;
    let positionTimer = 0;
    let syncTimer = 0;
    let lastAutoResumeAt = 0;
    const progressBarH = 14;
    const progressTrackPadding = 10;
    const knobRadiusDefault = 8;
    const knobRadiusHover = 10;

    function formatTime(seconds) {
      const sec = Number(seconds);
      if (!Number.isFinite(sec) || sec < 0) return "--:--";
      const whole = Math.floor(sec);
      const h = Math.floor(whole / 3600);
      const m = Math.floor((whole % 3600) / 60);
      const s = whole % 60;
      if (h > 0)
        return `${String(h)}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function getActiveVideoElement() {
      const videos = Array.from(document.querySelectorAll("video"));
      if (!videos.length) return null;
      const visible = videos.find((video) => {
        if (!video) return false;
        if (video.readyState <= 0) return false;
        const rect = video.getBoundingClientRect();
        return rect.width > 20 && rect.height > 20;
      });
      return visible || videos[0] || null;
    }

    function seekByRate(rate) {
      if (!currentVideo) return;
      const duration = Number(currentVideo.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      const nextTime = Math.max(0, Math.min(duration, duration * rate));
      currentVideo.currentTime = nextTime;
      drawProgress();
    }

    function drawProgress() {
      const ctx = progressCanvas.getContext("2d");
      if (!ctx) return;

      const w = progressCanvas.width;
      const barH = progressBarH;
      const y = Math.floor((progressCanvas.height - barH) / 2);
      const knobR = knobHover ? knobRadiusHover : knobRadiusDefault;
      const trackLeft = progressTrackPadding;
      const trackRight = w - progressTrackPadding;
      const trackW = Math.max(1, trackRight - trackLeft);
      const trackRadius = barH / 2;

      function roundedRectPath(x, y0, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y0);
        ctx.arcTo(x + width, y0, x + width, y0 + height, r);
        ctx.arcTo(x + width, y0 + height, x, y0 + height, r);
        ctx.arcTo(x, y0 + height, x, y0, r);
        ctx.arcTo(x, y0, x + width, y0, r);
        ctx.closePath();
      }

      ctx.clearRect(0, 0, w, progressCanvas.height);
      roundedRectPath(trackLeft, y, trackW, barH, trackRadius);
      ctx.fillStyle = "#dbe6f3";
      ctx.fill();
      ctx.save();
      roundedRectPath(trackLeft, y, trackW, barH, trackRadius);
      ctx.clip();

      if (!currentVideo) {
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(trackLeft, y, Math.floor(trackW * 0.1), barH);
        ctx.restore();
        timeText.textContent = "--:-- / --:--";
        videoStateText.textContent = "未检测到视频";
        return;
      }

      const duration = Number(currentVideo.duration);
      const current = Number(currentVideo.currentTime || 0);
      const ratio =
        Number.isFinite(duration) && duration > 0
          ? Math.max(0, Math.min(1, current / duration))
          : 0;

      if (
        currentVideo.buffered &&
        currentVideo.buffered.length > 0 &&
        Number.isFinite(duration) &&
        duration > 0
      ) {
        const bufferedEnd = currentVideo.buffered.end(
          currentVideo.buffered.length - 1,
        );
        const bufferedRatio = Math.max(0, Math.min(1, bufferedEnd / duration));
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(trackLeft, y, Math.floor(trackW * bufferedRatio), barH);
      }

      ctx.fillStyle = "#2563eb";
      ctx.fillRect(trackLeft, y, Math.floor(trackW * ratio), barH);
      ctx.restore();

      const knobX = Math.floor(trackLeft + trackW * ratio);
      if (knobHover) {
        ctx.fillStyle = "rgba(59,130,246,.22)";
        ctx.beginPath();
        ctx.arc(knobX, y + barH / 2, knobR + 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(knobX, y + barH / 2, knobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#93c5fd";
      ctx.stroke();

      timeText.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      videoStateText.textContent = currentVideo.paused ? "已暂停" : "播放中";
    }

    function applyAutoMute(video) {
      if (!video || !autoMuteEnabled) return;
      video.muted = true;
    }

    function updateButtons() {
      setButtonIconLabel(
        btnAutoMute,
        autoMuteEnabled ? "volumeOff" : "volumeOn",
        autoMuteEnabled ? "自动静音: 开" : "自动静音: 关",
      );
      btnAutoMute.style.background = autoMuteEnabled ? "#bae6fd" : "#e2e8f0";
      btnAutoMute.style.color = autoMuteEnabled ? "#075985" : "#475569";

      if (!currentVideo) {
        setButtonIconLabel(btnPlayPause, "play", "播放");
        btnPlayPause.style.background = "#22c55e";
        btnPlayPause.style.color = "#052e16";
        setButtonIconLabel(btnMute, "volumeOff", "静音");
        stateBadge.textContent = "未就绪";
        stateBadge.style.background = "#e2e8f0";
        stateBadge.style.color = "#334155";
        return;
      }
      setButtonIconLabel(
        btnPlayPause,
        currentVideo.paused ? "play" : "pause",
        currentVideo.paused ? "播放" : "暂停",
      );
      btnPlayPause.style.background = currentVideo.paused
        ? "#22c55e"
        : "#f59e0b";
      btnPlayPause.style.color = currentVideo.paused ? "#052e16" : "#3b2f08";
      setButtonIconLabel(
        btnMute,
        currentVideo.muted ? "volumeOn" : "volumeOff",
        currentVideo.muted ? "取消静音" : "静音",
      );
      stateBadge.textContent = currentVideo.paused ? "已暂停" : "播放中";
      stateBadge.style.background = currentVideo.paused ? "#e2e8f0" : "#dcfce7";
      stateBadge.style.color = currentVideo.paused ? "#334155" : "#166534";
    }

    function bindVideo(video) {
      if (currentVideo === video) return;
      currentVideo = video || null;
      if (currentVideo) applyAutoMute(currentVideo);
      updateButtons();
      drawProgress();
    }

    function seekByPointer(clientX) {
      const rect = progressCanvas.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const innerWidth = Math.max(1, rect.width - progressTrackPadding * 2);
      const x = Math.max(
        0,
        Math.min(innerWidth, clientX - rect.left - progressTrackPadding),
      );
      const ratio = Math.max(0, Math.min(1, x / innerWidth));
      seekByRate(ratio);
    }

    function updateKnobHover(clientX, clientY) {
      const rect = progressCanvas.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0 || !currentVideo) {
        if (knobHover) {
          knobHover = false;
          drawProgress();
        }
        return;
      }
      const duration = Number(currentVideo.duration);
      const current = Number(currentVideo.currentTime || 0);
      const ratio =
        Number.isFinite(duration) && duration > 0
          ? Math.max(0, Math.min(1, current / duration))
          : 0;
      const knobR = knobHover ? knobRadiusHover : knobRadiusDefault;
      const innerWidth = Math.max(1, rect.width - progressTrackPadding * 2);
      const knobX = rect.left + progressTrackPadding + innerWidth * ratio;
      const knobY = rect.top + rect.height / 2;
      const dx = clientX - knobX;
      const dy = clientY - knobY;
      const hitRadius = knobR + 4;
      const isHover = dx * dx + dy * dy <= hitRadius * hitRadius;
      if (isHover !== knobHover) {
        knobHover = isHover;
        drawProgress();
      }
    }

    progressCanvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      progressCanvas.setPointerCapture(e.pointerId);
      updateKnobHover(e.clientX, e.clientY);
      seekByPointer(e.clientX);
    });
    progressCanvas.addEventListener("pointermove", (e) => {
      updateKnobHover(e.clientX, e.clientY);
      if (!dragging) return;
      seekByPointer(e.clientX);
    });
    progressCanvas.addEventListener("pointerup", (e) => {
      dragging = false;
      try {
        progressCanvas.releasePointerCapture(e.pointerId);
      } catch {}
      updateKnobHover(e.clientX, e.clientY);
      seekByPointer(e.clientX);
    });
    progressCanvas.addEventListener("pointercancel", () => {
      dragging = false;
      if (knobHover) {
        knobHover = false;
        drawProgress();
      }
    });
    progressCanvas.addEventListener("pointerleave", () => {
      if (knobHover) {
        knobHover = false;
        drawProgress();
      }
    });

    btnBack.addEventListener("click", () => {
      if (!currentVideo) return;
      currentVideo.currentTime = Math.max(
        0,
        Number(currentVideo.currentTime || 0) - 10,
      );
      drawProgress();
    });

    btnForward.addEventListener("click", () => {
      if (!currentVideo) return;
      const duration = Number(currentVideo.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      currentVideo.currentTime = Math.min(
        duration,
        Number(currentVideo.currentTime || 0) + 10,
      );
      drawProgress();
    });

    btnPlayPause.addEventListener("click", async () => {
      if (!currentVideo) return;
      try {
        if (currentVideo.paused) {
          await currentVideo.play();
        } else {
          currentVideo.pause();
        }
      } catch (e) {
        console.warn("[知识抓取] 切换播放失败:", e.message);
      }
      updateButtons();
      drawProgress();
    });

    btnMute.addEventListener("click", () => {
      if (!currentVideo) return;
      if (autoMuteEnabled && currentVideo.muted) {
        autoMuteEnabled = false;
        saveVideoAutoMuteEnabled(autoMuteEnabled);
      }
      currentVideo.muted = !currentVideo.muted;
      updateButtons();
    });

    btnAutoMute.addEventListener("click", () => {
      autoMuteEnabled = !autoMuteEnabled;
      saveVideoAutoMuteEnabled(autoMuteEnabled);
      if (autoMuteEnabled && currentVideo) currentVideo.muted = true;
      updateButtons();
      drawProgress();
    });

    function positionPanel() {
      if (
        panel.parentElement &&
        panel.parentElement.id === "zs-assistant-layout-slot"
      ) {
        panel.style.position = "static";
        panel.style.top = "auto";
        panel.style.right = "auto";
        return;
      }
      if (!anchorPanel || !anchorPanel.isConnected) return;
      const anchorRect = anchorPanel.getBoundingClientRect();
      const ownHeight = Math.max(panel.offsetHeight || 140, 120);
      const gap = 10;
      const right = Math.max(8, window.innerWidth - anchorRect.right);
      panel.style.right = `${Math.round(right)}px`;
      const belowTop = anchorRect.bottom + gap;
      const availableBelow = Math.max(0, window.innerHeight - belowTop - 10);
      const availableAbove = Math.max(0, anchorRect.top - gap - 10);
      let top = belowTop;
      if (availableBelow < 140 && availableAbove > availableBelow) {
        top = Math.max(10, anchorRect.top - ownHeight - gap);
        panel.style.maxHeight = `${Math.max(120, availableAbove)}px`;
      } else {
        panel.style.maxHeight = `${Math.max(120, availableBelow)}px`;
      }
      panel.style.top = `${Math.round(top)}px`;
    }

    function syncVideoState() {
      const result = typeof getResult === "function" ? getResult() : null;
      const currentSummary = getCurrentResourceSummary(result);
      const isCurrentVideoResource = !!(
        currentSummary && currentSummary.isVideo
      );
      if (!isCurrentVideoResource) {
        bindVideo(null);
        panel.style.display = "none";
        return;
      }
      const active = getActiveVideoElement();
      if (!active) {
        bindVideo(null);
        panel.style.display = "none";
        return;
      }
      panel.style.display = "flex";
      bindVideo(active);
      if (currentVideo) {
        const seekHint = loadVideoSeekHint();
        if (
          seekHint &&
          currentSummary &&
          String(seekHint.resourceUid || "") ===
            String(currentSummary.resourcesUid || "")
        ) {
          const target = Number(seekHint.seekSeconds || 0);
          const duration = Number(currentVideo.duration || 0);
          const currentTime = Number(currentVideo.currentTime || 0);
          if (
            Number.isFinite(target) &&
            target > 1 &&
            Number.isFinite(duration) &&
            duration > 3
          ) {
            const clamped = Math.max(0, Math.min(duration - 0.8, target));
            if (Math.abs(currentTime - clamped) > 1.2) {
              currentVideo.currentTime = clamped;
            }
            clearVideoSeekHint();
          }
        }
        applyAutoMute(currentVideo);
        const automationRunning =
          typeof isAutomationRunning === "function"
            ? !!isAutomationRunning()
            : false;
        const duration = Number(currentVideo.duration || 0);
        const current = Number(currentVideo.currentTime || 0);
        const canResume =
          automationRunning &&
          currentVideo.paused &&
          !currentVideo.ended &&
          !dragging &&
          Number.isFinite(duration) &&
          duration > 0 &&
          current < duration - 0.2 &&
          Date.now() - lastAutoResumeAt > 2000;
        if (canResume) {
          lastAutoResumeAt = Date.now();
          currentVideo.play().catch((e) => {
            console.warn("[知识抓取] 自动续播失败:", e.message);
          });
        }
      }
      updateButtons();
      drawProgress();
      positionPanel();
    }

    updateButtons();
    drawProgress();
    positionPanel();
    syncVideoState();

    syncTimer = window.setInterval(syncVideoState, 350);
    positionTimer = window.setInterval(positionPanel, 1000);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("beforeunload", () => {
      if (syncTimer) window.clearInterval(syncTimer);
      if (positionTimer) window.clearInterval(positionTimer);
    });

    return panel;
  }

  function getAiAssistantContainer() {
    const selectors = [
      ".right-section-outer",
      ".ai-assistant-new-wrapper",
      ".right-section",
      ".ai-assistant-main",
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function hideAiAssistantContainer(targetEl) {
    const target = targetEl || getAiAssistantContainer();
    if (!target) return null;
    target.setAttribute("data-zs-hidden-ai", "1");
    target.style.setProperty("display", "none", "important");
    target.style.setProperty("visibility", "hidden", "important");
    target.style.setProperty("pointer-events", "none", "important");
    return target;
  }

  function placePanelIntoAiSlot(panel) {
    if (!panel || !panel.isConnected) return false;
    const aiContainer = getAiAssistantContainer();
    if (!aiContainer) return false;
    const rect = aiContainer.getBoundingClientRect();
    if (!rect || rect.width < 120 || rect.height < 120) return false;
    const parent = aiContainer.parentElement;
    if (!parent) return false;
    hideAiAssistantContainer(aiContainer);

    let slot = parent.querySelector("#zs-assistant-layout-slot");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "zs-assistant-layout-slot";
      parent.insertBefore(slot, aiContainer.nextSibling);
    }
    slot.style.display = "block";
    slot.style.position = "static";
    slot.style.width = `${Math.max(260, Math.round(rect.width))}px`;
    slot.style.minWidth = `${Math.max(220, Math.round(rect.width))}px`;
    slot.style.maxWidth = `${Math.max(260, Math.round(rect.width))}px`;
    slot.style.height = `${Math.max(360, Math.round(rect.height))}px`;
    slot.style.display = "flex";
    slot.style.flexDirection = "column";
    slot.style.gap = "8px";
    slot.style.flex = "0 0 auto";
    slot.style.alignSelf = "stretch";
    slot.style.margin = "0";
    slot.style.padding = "0";
    slot.style.minHeight = "0";
    slot.style.overflow = "hidden";
    slot.style.position = "relative";
    slot.style.zIndex = "1000001";

    if (panel.parentElement !== slot) {
      slot.prepend(panel);
    }

    const videoPanel = document.getElementById("zs-video-control-panel");
    if (videoPanel && videoPanel.parentElement !== slot) {
      slot.appendChild(videoPanel);
    }

    const width = Math.max(260, Math.round(rect.width));
    const slotHeight = Math.max(360, Math.round(rect.height));
    const videoDesiredHeight = videoPanel
      ? Math.max(
          220,
          Math.round(videoPanel.scrollHeight || videoPanel.offsetHeight || 220),
        )
      : 0;
    const minMainHeight = 120;
    const mainHeight = Math.max(
      minMainHeight,
      slotHeight - (videoDesiredHeight ? videoDesiredHeight + 8 : 0),
    );
    const videoFinalHeight = videoPanel
      ? Math.max(200, slotHeight - mainHeight - 8)
      : 0;
    panel.style.position = "static";
    panel.style.right = "auto";
    panel.style.left = "auto";
    panel.style.top = "auto";
    panel.style.bottom = "auto";
    panel.style.zIndex = "1000002";
    panel.style.position = "relative";
    panel.style.margin = "0";
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${mainHeight}px`;
    panel.style.height = `${mainHeight}px`;
    panel.style.overflow = "hidden";
    panel.style.minHeight = "0";

    if (videoPanel) {
      videoPanel.style.position = "static";
      videoPanel.style.right = "auto";
      videoPanel.style.left = "auto";
      videoPanel.style.top = "auto";
      videoPanel.style.bottom = "auto";
      videoPanel.style.width = `${width}px`;
      videoPanel.style.height = `${videoFinalHeight}px`;
      videoPanel.style.maxHeight = `${videoFinalHeight}px`;
      videoPanel.style.margin = "0";
      videoPanel.style.zIndex = "1000002";
      videoPanel.style.flex = "0 0 auto";
      videoPanel.style.overflow = "hidden";
    }
    return true;
  }

  function getExamRightsContainer() {
    const selectors = [
      ".content-center.rights",
      ".content-center .rights",
      ".rights",
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function normalizeEtcLeftPreNextLayout(etcLeft) {
    if (!etcLeft) return;
    const preNext = etcLeft.querySelector(":scope > .pre-next, .pre-next");
    if (!preNext) return;
    preNext.style.setProperty("box-sizing", "border-box", "important");
    preNext.style.setProperty("width", "fit-content", "important");
    preNext.style.setProperty("max-width", "100%", "important");
    preNext.style.setProperty("position", "relative", "important");
    preNext.style.setProperty("left", "0px", "important");
    preNext.style.setProperty("margin-left", "auto", "important");
    preNext.style.setProperty("margin-right", "auto", "important");
    preNext.style.setProperty("right", "auto", "important");
    preNext.style.setProperty("transform", "none", "important");
    preNext.style.setProperty("display", "flex", "important");
    preNext.style.setProperty("justify-content", "center", "important");
    preNext.style.setProperty("align-items", "center", "important");
    preNext.style.setProperty("gap", "16px", "important");

    const parent = preNext.parentElement;
    if (parent && parent !== etcLeft) {
      parent.style.setProperty("width", "100%", "important");
      parent.style.setProperty("max-width", "100%", "important");
      parent.style.setProperty("display", "flex", "important");
      parent.style.setProperty("justify-content", "center", "important");
    }

    // 使用实际几何中心做一次像素级纠偏，抵消页面自身布局带来的偏移
    try {
      const etcRect = etcLeft.getBoundingClientRect();
      const preRect = preNext.getBoundingClientRect();
      if (etcRect.width > 0 && preRect.width > 0) {
        const expectedCenter = etcRect.left + etcRect.width / 2;
        const actualCenter = preRect.left + preRect.width / 2;
        const delta = Math.round(expectedCenter - actualCenter);
        if (Math.abs(delta) >= 1 && Math.abs(delta) < 500) {
          preNext.style.setProperty("left", `${delta}px`, "important");
        }
      }
    } catch {}
  }

  function setExamPageVerticalScrollLocked(locked) {
    try {
      const html = document.documentElement;
      const body = document.body;
      if (!html || !body) return;
      if (locked) {
        html.style.setProperty("overflow-y", "hidden", "important");
        body.style.setProperty("overflow-y", "hidden", "important");
      } else {
        html.style.removeProperty("overflow-y");
        body.style.removeProperty("overflow-y");
      }
    } catch {}
  }

  function placePanelIntoExamRightsSlot(panel) {
    if (!panel || !panel.isConnected) return false;
    const rights = getExamRightsContainer();
    if (!rights) return false;
    const etcLeft = rights.querySelector(".ETC-left");
    if (!etcLeft || !etcLeft.parentElement) return false;

    let slot = rights.querySelector("#zs-exam-rights-slot");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "zs-exam-rights-slot";
    }

    const anchorParent = etcLeft.parentElement;
    try {
      const display = window.getComputedStyle(anchorParent).display || "";
      if (!/flex/i.test(display)) {
        anchorParent.style.display = "flex";
        anchorParent.style.flexDirection = "row";
      }
      if (!anchorParent.style.flexWrap) {
        anchorParent.style.flexWrap = "nowrap";
      }
      if (!anchorParent.style.alignItems) {
        anchorParent.style.alignItems = "flex-start";
      }
      if (!anchorParent.style.overflowX) {
        anchorParent.style.overflowX = "hidden";
      }
    } catch {}
    if (slot.parentElement !== anchorParent) {
      anchorParent.insertBefore(slot, etcLeft);
    } else if (slot.nextElementSibling !== etcLeft) {
      anchorParent.insertBefore(slot, etcLeft);
    }

    const etcRect = etcLeft.getBoundingClientRect();
    const rightsRect = rights.getBoundingClientRect();
    const viewportWidth = Math.max(320, Math.round(window.innerWidth || 0));
    const viewportHeight = Math.max(520, Math.round(window.innerHeight || 0));
    const parentRect = anchorParent.getBoundingClientRect();
    const parentWidth = Math.max(
      320,
      Math.round((parentRect && parentRect.width) || viewportWidth),
    );
    const slotGap = 16;
    const ETC_LEFT_FIXED_PERCENT = 35;
    const ETC_RIGHT_FIXED_PERCENT = 35;
    const etcRight = rights.querySelector(".ETC-right");
    const slotPercent = Math.max(
      8,
      100 - ETC_LEFT_FIXED_PERCENT - (etcRight ? ETC_RIGHT_FIXED_PERCENT : 0),
    );
    const rawWidth = Math.max(
      320,
      Math.round((etcRect && etcRect.width) || panel.offsetWidth || 460),
    );
    const maxWidthByViewport = Math.max(
      280,
      Math.min(460, Math.round(viewportWidth * 0.42)),
    );
    const maxWidthByParent = Math.max(280, Math.round(parentWidth - 24));
    const targetWidth = Math.max(
      280,
      Math.min(rawWidth, maxWidthByViewport, maxWidthByParent),
    );
    const topOffset = Math.max(
      0,
      Math.round((rightsRect && rightsRect.top) || 0),
    );
    const fixedColumnHeight = Math.max(
      360,
      Math.round(viewportHeight - topOffset - 10),
    );

    slot.style.display = "flex";
    slot.style.position = "relative";
    slot.style.flexDirection = "column";
    slot.style.flex = `0 0 calc(${slotPercent}% - ${slotGap}px)`;
    slot.style.width = `calc(${slotPercent}% - ${slotGap}px)`;
    slot.style.minWidth = `${Math.min(320, targetWidth)}px`;
    slot.style.maxWidth = `calc(${slotPercent}% - ${slotGap}px)`;
    slot.style.minHeight = `${fixedColumnHeight}px`;
    slot.style.height = `${fixedColumnHeight}px`;
    slot.style.maxHeight = `${fixedColumnHeight}px`;
    slot.style.margin = `0 ${slotGap}px 0 0`;
    slot.style.padding = "0";
    slot.style.overflowX = "hidden";
    slot.style.overflowY = "auto";
    slot.style.overscrollBehavior = "contain";
    slot.style.zIndex = "1000001";
    etcLeft.style.flex = `0 0 ${ETC_LEFT_FIXED_PERCENT}%`;
    etcLeft.style.width = `${ETC_LEFT_FIXED_PERCENT}%`;
    etcLeft.style.minWidth = `${ETC_LEFT_FIXED_PERCENT}%`;
    etcLeft.style.maxWidth = `${ETC_LEFT_FIXED_PERCENT}%`;
    etcLeft.style.height = `${fixedColumnHeight}px`;
    etcLeft.style.minHeight = `${fixedColumnHeight}px`;
    etcLeft.style.maxHeight = `${fixedColumnHeight}px`;
    etcLeft.style.overflowX = "hidden";
    etcLeft.style.overflowY = "hidden";
    etcLeft.style.overscrollBehavior = "contain";
    if (etcRight) {
      etcRight.style.flex = `0 0 ${ETC_RIGHT_FIXED_PERCENT}%`;
      etcRight.style.width = `${ETC_RIGHT_FIXED_PERCENT}%`;
      etcRight.style.minWidth = `${ETC_RIGHT_FIXED_PERCENT}%`;
      etcRight.style.maxWidth = `${ETC_RIGHT_FIXED_PERCENT}%`;
      etcRight.style.height = `${fixedColumnHeight}px`;
      etcRight.style.minHeight = `${fixedColumnHeight}px`;
      etcRight.style.maxHeight = `${fixedColumnHeight}px`;
      etcRight.style.overflowX = "hidden";
      etcRight.style.overflowY = "auto";
      etcRight.style.overscrollBehavior = "contain";
    }
    const reviewContainer = etcLeft.querySelector(".Review-container");
    if (reviewContainer) {
      reviewContainer.style.height = "calc(100% - 58px)";
      reviewContainer.style.minHeight = "0";
      reviewContainer.style.maxHeight = "calc(100% - 58px)";
      reviewContainer.style.overflow = "hidden";
    } else {
      etcLeft.style.overflowY = "auto";
    }
    const preNext = etcLeft.querySelector(".pre-next");
    if (preNext) {
      preNext.style.flex = "0 0 auto";
      preNext.style.marginTop = "8px";
    }
    rights.style.height = `${fixedColumnHeight}px`;
    rights.style.minHeight = `${fixedColumnHeight}px`;
    rights.style.maxHeight = `${fixedColumnHeight}px`;
    rights.style.overflow = "hidden";
    anchorParent.style.height = `${fixedColumnHeight}px`;
    anchorParent.style.minHeight = `${fixedColumnHeight}px`;
    anchorParent.style.maxHeight = `${fixedColumnHeight}px`;
    anchorParent.style.overflow = "hidden";
    setExamPageVerticalScrollLocked(true);
    normalizeEtcLeftPreNextLayout(etcLeft);

    if (panel.parentElement !== slot) {
      slot.prepend(panel);
    }

    panel.style.position = "relative";
    panel.style.left = "auto";
    panel.style.top = "auto";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.margin = "0";
    panel.style.width = "100%";
    panel.style.minWidth = "0";
    panel.style.maxWidth = "100%";
    panel.style.boxSizing = "border-box";
    panel.style.paddingRight = "14px";
    panel.style.height = `${fixedColumnHeight}px`;
    panel.style.minHeight = `${fixedColumnHeight}px`;
    panel.style.maxHeight = `${fixedColumnHeight}px`;
    panel.style.overflowX = "hidden";
    panel.style.overflowY = "auto";
    panel.style.zIndex = "1000002";
    return true;
  }

  function isStudentReviewRoute() {
    try {
      const path = String(location.pathname || "");
      return (
        path.includes("/studentReviewTestOrExam/") ||
        path.includes("/point/") ||
        path.includes("/examPreview/")
      );
    } catch {
      return false;
    }
  }

  function shouldInitMainPanel() {
    try {
      const path = String(location.pathname || "");
      return (
        /\/studentReviewTestOrExam\//.test(path) ||
        /\/point\//.test(path) ||
        /\/examPreview\//.test(path)
      );
    } catch {
      return false;
    }
  }

  function shouldShowBackToExamButton() {
    try {
      const host = String(location.host || "").toLowerCase();
      const path = String(location.pathname || "");
      if (host === "ai-smart-course-student-pro.zhihuishu.com") {
        return /^\/mySpace(?:\/|$)/.test(path);
      }
      if (host === "ai.zhihuishu.com") {
        return /^\/AIstudent(?:\/|$)/.test(path);
      }
      return false;
    } catch {
      return false;
    }
  }

  function isValidExamReturnUrl(url) {
    try {
      const u = new URL(String(url || ""), location.origin);
      const host = String(u.host || "").toLowerCase();
      const path = String(u.pathname || "");
      const isExamHost =
        host === "studentexamcomh5.zhihuishu.com" &&
        path.includes("/studentReviewTestOrExam/");
      const isAiHost =
        host === "ai-smart-course-student-pro.zhihuishu.com" &&
        (path.includes("/point/") || path.includes("/examPreview/"));
      return isExamHost || isAiHost;
    } catch {
      return false;
    }
  }

  function rememberCurrentExamUrl() {
    try {
      const href = String(location.href || "");
      if (!isValidExamReturnUrl(href)) return;
      localStorage.setItem(LAST_EXAM_PAGE_URL_KEY, href);
    } catch {}
  }

  function pickExamReturnUrl() {
    try {
      const cached = String(
        localStorage.getItem(LAST_EXAM_PAGE_URL_KEY) || "",
      ).trim();
      if (cached && isValidExamReturnUrl(cached)) return cached;
    } catch {}
    try {
      const ref = String(document.referrer || "").trim();
      if (ref && isValidExamReturnUrl(ref)) return ref;
    } catch {}
    try {
      const host = String(location.host || "").toLowerCase();
      const seg = String(location.pathname || "")
        .split("/")
        .filter(Boolean);
      if (host === "ai.zhihuishu.com" && seg[0] === "AIstudent") {
        const fallbackKey = `${String(seg[1] || "")}:${String(seg[2] || "")}`;
        const fallbackUrl = String(
          AI_STUDENT_EXAM_RETURN_FALLBACKS[fallbackKey] || "",
        ).trim();
        if (fallbackUrl && isValidExamReturnUrl(fallbackUrl))
          return fallbackUrl;
      }
    } catch {}
    return "";
  }

  function renderBackToExamButton() {
    if (!shouldShowBackToExamButton()) return;
    if (document.getElementById("zs-myspace-back-exam-wrap")) return;
    const targetUrl = pickExamReturnUrl();
    const wrap = document.createElement("div");
    wrap.id = "zs-myspace-back-exam-wrap";
    wrap.style.cssText = [
      "position:fixed",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "z-index:2147483646",
      "pointer-events:none",
    ].join(";");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = targetUrl ? "返回习题页面" : "未找到习题页记录";
    btn.style.cssText = [
      "pointer-events:auto",
      "border:none",
      "padding:14px 28px",
      "min-height:52px",
      "border-radius:12px",
      `background:${targetUrl ? "#2563eb" : "#94a3b8"}`,
      "color:#ffffff",
      "font-size:18px",
      "font-weight:700",
      "line-height:1",
      `cursor:${targetUrl ? "pointer" : "not-allowed"}`,
      "box-shadow:0 10px 30px rgba(15,23,42,.22)",
    ].join(";");
    if (!targetUrl) btn.disabled = true;
    btn.addEventListener("click", () => {
      if (!targetUrl) return;
      window.location.assign(targetUrl);
    });

    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function applyFloatingPanelMode(panel) {
    if (!panel) return;
    setExamPageVerticalScrollLocked(false);
    panel.style.position = "fixed";
    const hasManualPosition = panel.dataset.zsManualPosition === "1";
    if (!hasManualPosition) {
      let aligned = false;
      try {
        const etcLeft = document.querySelector(".ETC-left");
        if (etcLeft) {
          const rect = etcLeft.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const panelWidth = Math.round(panel.offsetWidth || 460);
            const panelHeight = Math.round(panel.offsetHeight || 520);
            const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
            const maxTop = Math.max(8, window.innerHeight - panelHeight - 8);
            const nextLeft = Math.min(
              Math.max(Math.round(rect.right - panelWidth), 8),
              maxLeft,
            );
            const nextTop = Math.min(Math.max(Math.round(rect.top), 8), maxTop);
            panel.style.left = `${nextLeft}px`;
            panel.style.top = `${nextTop}px`;
            panel.style.right = "auto";
            panel.style.bottom = "auto";
            aligned = true;
          }
        }
      } catch {}
      if (aligned) {
        panel.dataset.zsFloatingAnchored = "1";
      } else if (panel.dataset.zsFloatingAnchored !== "1") {
        panel.style.right = "20px";
        panel.style.bottom = "20px";
        panel.style.left = "auto";
        panel.style.top = "auto";
      }
    }
    panel.style.margin = "0";
    panel.style.width = "460px";
    panel.style.maxWidth = "min(460px, calc(100vw - 24px))";
    panel.style.height = "min(78vh, calc(100vh - 24px))";
    panel.style.minHeight = "0";
    panel.style.maxHeight = "78vh";
    panel.style.overflowX = "hidden";
    panel.style.overflowY = "auto";
    panel.style.overscrollBehavior = "contain";
    panel.style.zIndex = "999999";
  }

  function normalizeFloatingPanelPosition(panel) {
    if (!panel || panel.dataset.zsManualPosition !== "1") return;
    const rect = panel.getBoundingClientRect();
    const panelWidth = Math.round(rect.width || panel.offsetWidth || 460);
    const panelHeight = Math.round(rect.height || panel.offsetHeight || 520);
    const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panelHeight - 8);
    const nextLeft = Math.min(Math.max(Math.round(rect.left), 8), maxLeft);
    const nextTop = Math.min(Math.max(Math.round(rect.top), 8), maxTop);
    panel.style.left = `${nextLeft}px`;
    panel.style.top = `${nextTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function enableFloatingPanelDrag(panel, handle) {
    if (!panel || !handle || handle.dataset.zsDragBound === "1") return;
    handle.dataset.zsDragBound = "1";
    handle.style.cursor = "move";
    handle.style.touchAction = "none";

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const panelWidth = Math.round(panel.offsetWidth || 460);
      const panelHeight = Math.round(panel.offsetHeight || 520);
      const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
      const maxTop = Math.max(8, window.innerHeight - panelHeight - 8);
      const nextLeft = clamp(startLeft + dx, 8, maxLeft);
      const nextTop = clamp(startTop + dy, 8, maxTop);
      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      panel.dataset.zsManualPosition = "1";
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const interactive =
        e.target && typeof e.target.closest === "function"
          ? e.target.closest(
              'button, a, input, textarea, select, summary, [role="button"]',
            )
          : null;
      if (interactive && interactive !== handle) return;
      const rect = panel.getBoundingClientRect();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.left = `${Math.round(rect.left)}px`;
      panel.style.top = `${Math.round(rect.top)}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      document.body.style.cursor = "move";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stopDrag);
      window.addEventListener("pointercancel", stopDrag);
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {}
      e.preventDefault();
    });
  }

  function installNoSelectStyle() {
    if (document.getElementById("zs-no-select-style")) return;
    const style = document.createElement("style");
    style.id = "zs-no-select-style";
    style.textContent = [
      "#zs-knowledge-capture-panel, #zs-knowledge-capture-panel * {",
      "  user-select: none !important;",
      "  -webkit-user-select: none !important;",
      "}",
      "#zs-video-control-panel, #zs-video-control-panel * {",
      "  user-select: none !important;",
      "  -webkit-user-select: none !important;",
      "}",
      "#zs-automation-overlay, #zs-automation-overlay * {",
      "  user-select: none !important;",
      "  -webkit-user-select: none !important;",
      "}",
      "#zs-automation-overlay-loader {",
      "  display: inline-flex;",
      "  align-items: center;",
      "  justify-content: center;",
      "  gap: 11px;",
      "  margin-bottom: 16px;",
      "}",
      "#zs-automation-overlay-loader .zs-loader-dot {",
      "  width: 26px;",
      "  height: 26px;",
      "  border-radius: 6px;",
      "  box-shadow: 0 4px 9px rgba(30, 64, 175, .16);",
      "  opacity: .98;",
      "  transform-origin: center 22px;",
      "  will-change: transform;",
      "}",
      "#zs-automation-overlay-loader .zs-loader-dot:nth-child(1) { background:#1d78de; }",
      "#zs-automation-overlay-loader .zs-loader-dot:nth-child(2) { background:#1d8ae2; }",
      "#zs-automation-overlay-loader .zs-loader-dot:nth-child(3) { background:#1e9ce6; }",
      "#zs-automation-overlay-loader .zs-loader-dot:nth-child(4) { background:#1faeea; }",
      "#zs-automation-overlay-loader .zs-loader-dot:nth-child(5) { background:#21c0ee; }",
      "#zs-automation-overlay .zs-overlay-glow {",
      "  position: absolute;",
      "  inset: -4px;",
      "  border-radius: 18px;",
      "  padding: 4px;",
      "  box-sizing: border-box;",
      "  background: linear-gradient(115deg, rgba(59,130,246,0) 12%, rgba(59,130,246,.12) 24%, rgba(34,211,238,1) 38%, rgba(52,211,153,1) 50%, rgba(99,102,241,.26) 62%, rgba(59,130,246,0) 78%);",
      "  background-size: 240% 240%;",
      "  background-position: 160% 50%;",
      "  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);",
      "  -webkit-mask-composite: xor;",
      "  mask-composite: exclude;",
      "  opacity: 0;",
      "  filter: drop-shadow(0 0 8px rgba(34,211,238,.24));",
      "  animation: zs-overlay-glow-sweep 2.2s ease-in-out infinite;",
      "  transition: opacity .22s ease;",
      "  pointer-events: none;",
      "  z-index: 0;",
      "}",
      "#zs-automation-overlay .zs-overlay-glow.active {",
      "  opacity: 1;",
      "}",
      "@keyframes zs-overlay-glow-sweep {",
      "  0% { background-position: 160% 50%; }",
      "  100% { background-position: -60% 50%; }",
      "}",
      "@keyframes zs-popover-fade-up {",
      "  0% { opacity: 0; transform: translateY(6px) scale(.98); }",
      "  100% { opacity: 1; transform: translateY(0) scale(1); }",
      "}",
      "@keyframes zs-preview-fade-in {",
      "  0% { opacity: 0; }",
      "  100% { opacity: 1; }",
      "}",
      "@keyframes zs-preview-image-in {",
      "  0% { opacity: 0; transform: translateY(10px) scale(.985); }",
      "  100% { opacity: 1; transform: translateY(0) scale(1); }",
      "}",
      "#zs-knowledge-capture-panel button, #zs-video-control-panel button {",
      "  cursor: pointer !important;",
      "}",
      "#zs-knowledge-capture-panel button:hover, #zs-video-control-panel button:hover {",
      "  cursor: pointer !important;",
      "}",
      ".zs-btn-loader {",
      "  width: 12px;",
      "  height: 12px;",
      "  border-radius: 999px;",
      "  border: 2px solid rgba(248,250,252,.35);",
      "  border-top-color: #f8fafc;",
      "  border-right-color: #f8fafc;",
      "  animation: zs-spin .9s linear infinite;",
      "  flex: 0 0 auto;",
      "}",
      "@keyframes zs-spin {",
      "  from { transform: rotate(0deg); }",
      "  to { transform: rotate(360deg); }",
      "}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function createPanel() {
    installNoSelectStyle();
    const automationOverlay = document.createElement("div");
    automationOverlay.id = "zs-automation-overlay";
    automationOverlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:1000010",
      "display:flex",
      "align-items:flex-end",
      "justify-content:center",
      "padding:0 16px 18vh",
      "background:transparent",
      "pointer-events:none",
      "opacity:0",
      "visibility:hidden",
      "transition:opacity .22s ease, visibility 0s linear .22s",
    ].join(";");
    const automationOverlayBox = document.createElement("div");
    automationOverlayBox.style.cssText = [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "position:relative",
      "isolation:isolate",
      "overflow:visible",
      "gap:8px",
      "padding:14px 18px",
      "border-radius:14px",
      "border:1px solid rgba(148,163,184,.45)",
      "background:rgba(248,250,252,.72)",
      "backdrop-filter:blur(10px)",
      "-webkit-backdrop-filter:blur(10px)",
      "opacity:.92",
      "transform:translateY(10px) scale(.98)",
      "transition:opacity .22s ease, transform .22s ease",
      "will-change:opacity,transform",
    ].join(";");
    const automationOverlayGlow = document.createElement("span");
    automationOverlayGlow.className = "zs-overlay-glow";
    automationOverlayBox.appendChild(automationOverlayGlow);
    const automationOverlayLoader = document.createElement("div");
    automationOverlayLoader.id = "zs-automation-overlay-loader";
    automationOverlayLoader.style.position = "relative";
    automationOverlayLoader.style.zIndex = "1";
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement("span");
      dot.className = "zs-loader-dot";
      automationOverlayLoader.appendChild(dot);
    }
    const automationOverlayStatusRow = document.createElement("div");
    automationOverlayStatusRow.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;gap:10px;";
    automationOverlayStatusRow.style.position = "relative";
    automationOverlayStatusRow.style.zIndex = "1";
    const automationOverlayText = document.createElement("div");
    automationOverlayText.textContent = "正在执行自动化进程";
    automationOverlayText.style.cssText =
      "color:#0f172a;font-weight:700;font-size:20px;letter-spacing:.5px;line-height:1.2;";
    const automationOverlayProgress = document.createElement("div");
    automationOverlayProgress.textContent = "--%";
    automationOverlayProgress.style.cssText =
      "color:#2563eb;font-weight:800;font-size:20px;line-height:1.2;letter-spacing:.4px;min-width:56px;text-align:left;";
    automationOverlayStatusRow.appendChild(automationOverlayText);
    automationOverlayStatusRow.appendChild(automationOverlayProgress);
    automationOverlayBox.appendChild(automationOverlayLoader);
    automationOverlayBox.appendChild(automationOverlayStatusRow);
    automationOverlay.appendChild(automationOverlayBox);
    document.body.appendChild(automationOverlay);

    const panel = document.createElement("div");
    panel.id = "zs-knowledge-capture-panel";
    panel.style.cssText = [
      "position:fixed",
      "right:20px",
      "bottom:20px",
      "z-index:999999",
      "background:#ffffff",
      "color:#0f172a",
      "padding:12px",
      "border-radius:12px",
      "font-size:12px",
      "border:1px solid #dbe6f3",
      "width:460px",
      "height:min(78vh, calc(100vh - 24px))",
      "max-height:78vh",
      "min-height:0",
      "display:flex",
      "flex-direction:column",
      "gap:10px",
      "overflow:hidden",
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "智慧树习题助手";
    title.style.cssText =
      "font-weight:700;font-size:13px;color:#0f172a;line-height:1.2;";
    const titleBar = document.createElement("div");
    titleBar.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:move;";
    const titleBarActions = document.createElement("div");
    titleBarActions.style.cssText =
      "display:inline-flex;align-items:center;justify-content:flex-end;gap:6px;flex:0 0 auto;";

    const btnSponsor = document.createElement("button");
    btnSponsor.type = "button";
    setButtonIconLabel(btnSponsor, "heart", "赞助支持", 13);
    btnSponsor.style.cssText = [
      "border:1px solid #fbcfe8",
      "background:#fdf2f8",
      "color:#be185d",
      "padding:5px 9px",
      "border-radius:9px",
      "cursor:pointer",
      "font-weight:700",
      "line-height:1.1",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "gap:6px",
      "font-size:11px",
      "flex:0 0 auto",
    ].join(";");
    applyHoverAccent(btnSponsor, {
      hoverBorderColor: "#ec4899",
      hoverShadow: "0 0 0 2px rgba(236,72,153,.14)",
    });

    const sponsorPopover = document.createElement("div");
    sponsorPopover.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "display:none",
      "width:220px",
      "padding:10px",
      "border:1px solid #fbcfe8",
      "border-radius:12px",
      "background:#ffffff",
      "box-shadow:0 16px 34px rgba(15,23,42,.16)",
      "z-index:2147483646",
      "cursor:default",
      "transform-origin:top right",
    ].join(";");
    const sponsorTitle = document.createElement("div");
    sponsorTitle.textContent = "赞助支持";
    sponsorTitle.style.cssText =
      "color:#9d174d;font-size:12px;font-weight:700;line-height:1.2;margin-bottom:8px;text-align:center;";
    const sponsorImageUrl =
      "https://file.157342.xyz/api/share-bundles/vCHE39oDMP05uxXKA_E-GE86/files/4/download/%E8%B5%9E%E8%B5%8F%E7%A0%81.png";
    const sponsorImg = document.createElement("img");
    sponsorImg.src = sponsorImageUrl;
    sponsorImg.alt = "赞赏码";
    sponsorImg.style.cssText =
      "display:block;width:100%;height:auto;border-radius:8px;border:1px solid #fce7f3;background:#fff;";
    const sponsorHint = document.createElement("div");
    sponsorHint.textContent =
      "感谢对本项目的支持。本项目主要通过 Vibe Coding 持续迭代完成（感谢 GPT-5.4 的大力支持），已经消耗近 200M tokens。每一份赞助都会继续用于功能打磨、问题修复和后续维护。";
    sponsorHint.style.cssText =
      "color:#64748b;font-size:11px;line-height:1.35;margin-top:8px;text-align:center;";
    const btnSponsorOpenImage = document.createElement("button");
    btnSponsorOpenImage.type = "button";
    setButtonIconLabel(btnSponsorOpenImage, "externalLink", "打开原图", 12);
    btnSponsorOpenImage.style.cssText = [
      "margin-top:10px",
      "width:100%",
      "border:1px solid #f9a8d4",
      "background:#fff1f7",
      "color:#be185d",
      "padding:7px 10px",
      "border-radius:9px",
      "cursor:pointer",
      "font-weight:700",
      "line-height:1.1",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "gap:6px",
      "font-size:11px",
    ].join(";");
    applyHoverAccent(btnSponsorOpenImage, {
      hoverBorderColor: "#ec4899",
      hoverShadow: "0 0 0 2px rgba(236,72,153,.12)",
    });
    sponsorPopover.appendChild(sponsorTitle);
    sponsorPopover.appendChild(sponsorImg);
    sponsorPopover.appendChild(sponsorHint);
    sponsorPopover.appendChild(btnSponsorOpenImage);

    const sponsorPreviewOverlay = document.createElement("div");
    sponsorPreviewOverlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "background:rgba(15,23,42,.62)",
      "backdrop-filter:blur(4px)",
      "-webkit-backdrop-filter:blur(4px)",
      "z-index:2147483647",
      "animation:none",
    ].join(";");
    const sponsorPreviewImage = document.createElement("img");
    sponsorPreviewImage.src = sponsorImageUrl;
    sponsorPreviewImage.alt = "赞赏码大图预览";
    sponsorPreviewImage.style.cssText =
      "display:block;max-width:min(92vw,960px);max-height:92vh;width:auto;height:auto;border-radius:14px;background:#fff;border:1px solid rgba(255,255,255,.35);box-shadow:0 24px 60px rgba(15,23,42,.42);animation:none;";
    const btnSponsorPreviewClose = document.createElement("button");
    btnSponsorPreviewClose.type = "button";
    btnSponsorPreviewClose.setAttribute("aria-label", "关闭预览");
    btnSponsorPreviewClose.style.cssText =
      "position:absolute;top:18px;right:18px;width:38px;height:38px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(15,23,42,.58);color:#f8fafc;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 10px 28px rgba(15,23,42,.24);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);";
    btnSponsorPreviewClose.appendChild(
      createIcon("close", { size: 18, strokeWidth: 2.4 }),
    );
    sponsorPreviewOverlay.appendChild(sponsorPreviewImage);
    sponsorPreviewOverlay.appendChild(btnSponsorPreviewClose);

    const btnStar = document.createElement("button");
    btnStar.type = "button";
    setButtonIconLabel(btnStar, "star", "Star", 13);
    btnStar.style.cssText = [
      "border:1px solid #fde68a",
      "background:#fef3c7",
      "color:#92400e",
      "padding:5px 9px",
      "border-radius:9px",
      "cursor:pointer",
      "font-weight:700",
      "line-height:1.1",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "gap:6px",
      "font-size:11px",
      "flex:0 0 auto",
    ].join(";");
    applyHoverAccent(btnStar, {
      hoverBorderColor: "#f59e0b",
      hoverShadow: "0 0 0 2px rgba(245,158,11,.14)",
    });

    const btnIssues = document.createElement("button");
    btnIssues.type = "button";
    setButtonIconLabel(btnIssues, "externalLink", "问题反馈", 13);
    btnIssues.style.cssText = [
      "border:1px solid #c7d2fe",
      "background:#eef2ff",
      "color:#3730a3",
      "padding:5px 9px",
      "border-radius:9px",
      "cursor:pointer",
      "font-weight:700",
      "line-height:1.1",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "gap:6px",
      "font-size:11px",
      "flex:0 0 auto",
    ].join(";");
    applyHoverAccent(btnIssues, {
      hoverBorderColor: "#818cf8",
      hoverShadow: "0 0 0 2px rgba(99,102,241,.14)",
    });
    titleBarActions.appendChild(btnSponsor);
    titleBarActions.appendChild(btnStar);
    titleBarActions.appendChild(btnIssues);

    const feedbackHint = document.createElement("div");
    feedbackHint.textContent =
      "问题反馈: 使用中如遇异常，可点击右上角“问题反馈”前往 GitHub Issues 提交。";
    feedbackHint.style.cssText =
      "color:#475569;font-size:11px;line-height:1.45;margin-top:-2px;";

    function applyHoverAccent(el, options = {}) {
      if (!el) return;
      const hoverBorderColor = options.hoverBorderColor || "#60a5fa";
      const hoverShadow =
        options.hoverShadow || "0 0 0 2px rgba(59,130,246,.15)";
      const originalBorderColor = el.style.borderColor || "";
      const originalShadow = el.style.boxShadow || "";
      const baseTransition = el.style.transition || "";
      const transitions = [
        baseTransition,
        "border-color .18s ease",
        "box-shadow .18s ease",
      ]
        .filter(Boolean)
        .join(",");
      el.style.transition = transitions;
      const activate = () => {
        el.style.borderColor = hoverBorderColor;
        el.style.boxShadow = originalShadow
          ? `${originalShadow}, ${hoverShadow}`
          : hoverShadow;
      };
      const deactivate = () => {
        el.style.borderColor = originalBorderColor;
        el.style.boxShadow = originalShadow;
      };
      el.addEventListener("mouseenter", activate);
      el.addEventListener("mouseleave", deactivate);
      el.addEventListener("focus", activate, true);
      el.addEventListener("blur", deactivate, true);
    }

    const btnRefresh = document.createElement("button");
    setButtonIconLabel(btnRefresh, "refresh", "刷新");
    styleAutoControlButton(btnRefresh);
    applyHoverAccent(btnRefresh, {
      hoverBorderColor: "#34d399",
      hoverShadow: "0 0 0 2px rgba(16,185,129,.18)",
      lift: true,
    });

    const primaryTabBar = document.createElement("div");
    primaryTabBar.style.cssText =
      "position:relative;display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:4px;padding:4px;margin-top:2px;margin-bottom:6px;flex:0 0 auto;border:1px solid #dbe6f3;background:#eef2f7;border-radius:12px;overflow:hidden;";
    primaryTabBar.setAttribute("role", "tablist");
    const primaryTabIndicator = document.createElement("div");
    primaryTabIndicator.style.cssText =
      "position:absolute;top:4px;left:0;height:calc(100% - 8px);width:0;background:#ffffff;border-radius:9px;box-shadow:0 1px 3px rgba(15,23,42,.12);transform:translateX(0);transition:transform .22s ease,width .22s ease;";
    primaryTabBar.appendChild(primaryTabIndicator);
    function stylePrimaryTab(btn) {
      btn.style.cssText = [
        "border:none",
        "background:transparent",
        "color:#64748b",
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "padding:7px 12px",
        "border-radius:9px",
        "cursor:pointer",
        "font-weight:600",
        "line-height:1.2",
        "font-size:13px",
        "flex:1 1 0",
        "min-width:0",
        "position:relative",
        "z-index:1",
        "transition:color .2s ease, background-color .2s ease",
      ].join(";");
    }
    const tabPractice = document.createElement("button");
    tabPractice.type = "button";
    tabPractice.textContent = "习题";
    tabPractice.setAttribute("role", "tab");
    stylePrimaryTab(tabPractice);
    primaryTabBar.appendChild(tabPractice);

    const viewTabBar = document.createElement("div");
    viewTabBar.style.cssText =
      "position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;padding:4px;margin-top:0;margin-bottom:8px;flex:0 0 auto;border:1px solid #dbe6f3;background:#eef2f7;border-radius:12px;overflow:hidden;";
    viewTabBar.setAttribute("role", "tablist");
    const viewTabIndicator = document.createElement("div");
    viewTabIndicator.style.cssText =
      "position:absolute;top:4px;left:0;height:calc(100% - 8px);width:0;background:#ffffff;border-radius:9px;box-shadow:0 1px 3px rgba(15,23,42,.12);transform:translateX(0);transition:transform .22s ease,width .22s ease;";
    viewTabBar.appendChild(viewTabIndicator);
    function styleViewTab(btn) {
      btn.style.cssText = [
        "border:none",
        "background:transparent",
        "color:#64748b",
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "padding:6px 10px",
        "border-radius:9px",
        "cursor:pointer",
        "font-weight:600",
        "line-height:1.2",
        "font-size:12px",
        "flex:1 1 0",
        "min-width:0",
        "position:relative",
        "z-index:1",
        "transition:color .2s ease, background-color .2s ease",
      ].join(";");
    }
    const tabOverview = document.createElement("button");
    tabOverview.type = "button";
    tabOverview.textContent = "概览";
    tabOverview.setAttribute("role", "tab");
    tabOverview.setAttribute("aria-controls", "zs-overview-view");
    styleViewTab(tabOverview);
    const tabDetail = document.createElement("button");
    tabDetail.type = "button";
    tabDetail.textContent = "结构树";
    tabDetail.setAttribute("role", "tab");
    tabDetail.setAttribute("aria-controls", "zs-detail-view");
    styleViewTab(tabDetail);
    viewTabBar.appendChild(tabOverview);
    viewTabBar.appendChild(tabDetail);

    const statusCard = document.createElement("div");
    statusCard.style.cssText =
      "border:1px solid #dbe6f3;border-radius:9px;padding:7px 9px;background:#f8fafc;display:flex;flex-direction:column;gap:4px;min-width:0;";
    applyHoverAccent(statusCard, {
      hoverBorderColor: "#93c5fd",
      hoverShadow: "0 0 0 2px rgba(59,130,246,.1)",
    });
    const statusTopRow = document.createElement("div");
    statusTopRow.style.cssText =
      "display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0;";

    const status = document.createElement("div");
    status.textContent = "状态: 待执行";
    status.style.cssText =
      "color:#334155;line-height:1.35;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;";

    const stats = document.createElement("div");
    stats.textContent = "0/0";
    stats.style.cssText =
      "color:#92400e;line-height:1.2;min-width:0;font-size:12px;font-weight:700;flex:0 0 auto;text-align:right;padding-top:1px;";
    const learningProgressRow = document.createElement("div");
    learningProgressRow.style.cssText =
      "display:flex;align-items:center;gap:8px;min-width:0;";
    const learningProgressTrack = document.createElement("div");
    learningProgressTrack.style.cssText =
      "height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;position:relative;flex:1 1 auto;min-width:0;";
    const learningProgressFill = document.createElement("div");
    learningProgressFill.style.cssText =
      "height:100%;width:0%;background:linear-gradient(90deg,#60a5fa 0%,#2563eb 100%);transition:width .2s ease;";
    learningProgressTrack.appendChild(learningProgressFill);
    const learningLoadState = document.createElement("div");
    learningLoadState.textContent = "待执行";
    learningLoadState.style.cssText =
      "flex:0 0 auto;color:#64748b;font-size:11px;line-height:1.2;font-weight:700;min-width:42px;text-align:right;";
    learningProgressRow.appendChild(learningProgressTrack);
    learningProgressRow.appendChild(learningLoadState);
    let learningDone = 0;
    let learningTotal = 0;

    function updateLearningStatusCardVisual() {
      const safeDone = Math.max(0, Number(learningDone) || 0);
      const safeTotal = Math.max(0, Number(learningTotal) || 0);
      stats.textContent = `${safeDone}/${safeTotal}`;
      const percent =
        safeTotal > 0
          ? Math.min(100, Math.round((safeDone / safeTotal) * 100))
          : 0;
      learningProgressFill.style.width = `${percent}%`;
      const statusText = String(status.textContent || "");
      let stateText = "待执行";
      let stateColor = "#64748b";
      if (/(失败|异常|error)/i.test(statusText)) {
        stateText = "失败";
        stateColor = "#b91c1c";
      } else if (safeTotal > 0 && safeDone >= safeTotal) {
        stateText = "已完成";
        stateColor = "#15803d";
      } else if (/(刷新|抓取|加载|检测|打开|自动|中)/.test(statusText)) {
        stateText = "加载中";
        stateColor = "#1d4ed8";
      }
      learningLoadState.textContent = stateText;
      learningLoadState.style.color = stateColor;
    }
    const statusObserver = new MutationObserver(() =>
      updateLearningStatusCardVisual(),
    );
    statusObserver.observe(status, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    updateLearningStatusCardVisual();

    const infoGrid = document.createElement("div");
    infoGrid.style.cssText =
      "display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-height:0;overflow:auto;padding-right:2px;";

    const autoControlCard = document.createElement("div");
    autoControlCard.style.cssText =
      "border:1px solid #dbe6f3;border-radius:9px;padding:8px;background:#f8fafc;color:#334155;";
    applyHoverAccent(autoControlCard, {
      hoverBorderColor: "#93c5fd",
      hoverShadow: "0 0 0 2px rgba(59,130,246,.1)",
    });

    const autoControlHeader = document.createElement("div");
    autoControlHeader.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;";

    const autoControlTitle = document.createElement("div");
    autoControlTitle.textContent = "自动化控制";
    autoControlTitle.style.cssText =
      "color:#1d4ed8;font-weight:700;line-height:1.2;";

    const autoControlToolbar = document.createElement("div");
    autoControlToolbar.style.cssText =
      "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:2px 0 6px 0;";

    function styleAutoControlButton(btn) {
      btn.style.cssText = [
        "border:1px solid #dbe6f3",
        "background:#eef4fb",
        "color:#1f2937",
        "padding:7px 10px",
        "border-radius:10px",
        "cursor:pointer",
        "font-weight:700",
        "line-height:1.2",
        "min-height:34px",
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "text-align:center",
        "gap:6px",
        "box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 2px 6px rgba(2,6,23,.35)",
      ].join(";");
    }

    const btnAutoRun = document.createElement("button");
    setButtonIconLabel(btnAutoRun, "play", "开始");
    styleAutoControlButton(btnAutoRun);
    applyHoverAccent(btnAutoRun, {
      hoverBorderColor: "#22c55e",
      hoverShadow: "0 0 0 2px rgba(34,197,94,.16)",
      lift: true,
    });
    const btnExamAutoRun = document.createElement("button");
    setButtonIconLabel(btnExamAutoRun, "play", "开始自动化");
    styleAutoControlButton(btnExamAutoRun);
    btnExamAutoRun.style.width = "100%";
    applyHoverAccent(btnExamAutoRun, {
      hoverBorderColor: "#22c55e",
      hoverShadow: "0 0 0 2px rgba(34,197,94,.16)",
      lift: true,
    });
    const btnExamRefreshMastery = document.createElement("button");
    setButtonIconLabel(btnExamRefreshMastery, "refresh", "刷新掌握度");
    styleAutoControlButton(btnExamRefreshMastery);
    btnExamRefreshMastery.style.width = "100%";
    btnExamRefreshMastery.style.background = "#2563eb";
    btnExamRefreshMastery.style.borderColor = "#3b82f6";
    btnExamRefreshMastery.style.color = "#f8fafc";
    applyHoverAccent(btnExamRefreshMastery, {
      hoverBorderColor: "#60a5fa",
      hoverShadow: "0 0 0 2px rgba(59,130,246,.16)",
      lift: true,
    });

    const btnMaskToggle = document.createElement("button");
    setButtonIconLabel(btnMaskToggle, "eye", "遮罩: 开");
    styleAutoControlButton(btnMaskToggle);
    applyHoverAccent(btnMaskToggle, {
      hoverBorderColor: "#38bdf8",
      hoverShadow: "0 0 0 2px rgba(56,189,248,.18)",
      lift: true,
    });

    const autoControlState = document.createElement("div");
    autoControlState.textContent = "自动化状态: 未开启";
    autoControlState.style.cssText =
      "color:#166534;line-height:1.2;font-size:11px;flex:0 0 auto;";
    const examAutoControlCard = document.createElement("div");
    examAutoControlCard.style.cssText =
      "border:1px solid #dbe6f3;border-radius:9px;padding:8px 10px;background:#f8fafc;display:flex;flex-direction:column;gap:6px;";
    const examAutoControlTitle = document.createElement("div");
    examAutoControlTitle.textContent = "习题自动化";
    examAutoControlTitle.style.cssText =
      "color:#0f172a;font-size:12px;font-weight:700;line-height:1.25;";
    const examModeCurrent = document.createElement("div");
    examModeCurrent.style.cssText =
      "display:inline-flex;align-items:center;gap:6px;color:#334155;font-size:11px;line-height:1.2;font-weight:700;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px;padding:3px 8px;align-self:flex-start;";
    const examAutoControlState = document.createElement("div");
    examAutoControlState.textContent = "自动化状态: 未开启";
    examAutoControlState.style.cssText =
      "color:#166534;line-height:1.2;font-size:11px;";
    const examAutoControlBtnRow = document.createElement("div");
    examAutoControlBtnRow.style.cssText =
      "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;";
    examAutoControlBtnRow.appendChild(btnExamAutoRun);
    examAutoControlBtnRow.appendChild(btnExamRefreshMastery);
    examAutoControlCard.appendChild(examAutoControlTitle);
    examAutoControlCard.appendChild(examModeCurrent);
    examAutoControlCard.appendChild(examAutoControlState);
    examAutoControlCard.appendChild(examAutoControlBtnRow);

    const nextPending = document.createElement("div");
    nextPending.style.cssText =
      "border:1px solid #dbe6f3;border-radius:9px;padding:8px 10px;background:#f8fafc;color:#334155;font-size:13px;";
    nextPending.textContent = "最近未完成资源: 暂无";
    applyHoverAccent(nextPending, {
      hoverBorderColor: "#93c5fd",
      hoverShadow: "0 0 0 2px rgba(59,130,246,.1)",
    });

    const currentResource = document.createElement("div");
    currentResource.style.cssText =
      "border:1px solid #dbe6f3;border-radius:9px;padding:8px 10px;background:#f8fafc;color:#334155;font-size:13px;";
    currentResource.textContent = "当前资源: 未识别";
    applyHoverAccent(currentResource, {
      hoverBorderColor: "#86efac",
      hoverShadow: "0 0 0 2px rgba(34,197,94,.12)",
    });

    const treeWrap = document.createElement("div");
    treeWrap.style.cssText =
      "overflow:auto;border:1px solid #dbe6f3;border-radius:9px;padding:8px;background:#ffffff;min-height:0;max-height:none;flex:1 1 auto;font-size:13px;overscroll-behavior:contain;";
    treeWrap.textContent = "点击“刷新”后在这里显示结构";

    const switchViewport = document.createElement("div");
    switchViewport.style.cssText =
      "position:relative;flex:1 1 auto;min-height:0;overflow:hidden;";
    const studyStatusWrap = document.createElement("div");
    studyStatusWrap.style.cssText =
      "display:flex;flex-direction:column;gap:8px;flex:0 0 auto;margin-bottom:8px;";
    const switchTrack = document.createElement("div");
    switchTrack.style.cssText = "display:flex;width:100%;height:100%;";

    const overviewView = document.createElement("div");
    overviewView.style.cssText =
      "display:flex;flex-direction:column;gap:0;min-height:0;flex:1 1 auto;width:100%;max-width:100%;overflow:hidden;";
    overviewView.id = "zs-overview-view";

    const detailView = document.createElement("div");
    detailView.style.cssText =
      "display:none;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto;width:100%;max-width:100%;overflow:hidden;";
    detailView.id = "zs-detail-view";

    const examView = document.createElement("div");
    examView.style.cssText =
      "display:none;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto;width:100%;max-width:100%;overflow:hidden;";
    examView.id = "zs-exam-view";
    const examOverviewSubView = document.createElement("div");
    examOverviewSubView.style.cssText =
      "display:flex;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto;width:100%;max-width:100%;overflow:auto;";
    const examDetailSubView = document.createElement("div");
    examDetailSubView.style.cssText =
      "display:none;flex-direction:column;gap:8px;min-height:0;flex:1 1 auto;width:100%;max-width:100%;overflow:auto;";

    const examToolbar = document.createElement("div");
    examToolbar.style.cssText =
      "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:0 0 auto;margin-bottom:2px;";
    const examProgressCard = document.createElement("div");
    examProgressCard.style.cssText =
      "border:1px solid #dbe6f3;border-radius:11px;padding:8px 10px;background:#f8fafc;display:flex;align-items:center;gap:10px;flex:0 0 auto;";
    const examProgressLeft = document.createElement("div");
    examProgressLeft.style.cssText =
      "display:flex;flex-direction:column;gap:0;min-width:0;flex:1 1 auto;";
    const examProgressTopRow = document.createElement("div");
    examProgressTopRow.style.cssText =
      "display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0;";
    const examProgressStatusText = document.createElement("div");
    examProgressStatusText.style.cssText =
      "color:#334155;line-height:1.35;min-width:0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto;";
    const examProgressText = document.createElement("div");
    examProgressText.style.cssText =
      "display:none;color:#92400e;line-height:1.2;font-size:12px;font-weight:700;flex:0 0 auto;text-align:right;padding-top:1px;";
    examProgressText.textContent = "0 / 0";
    const examProgressTrack = document.createElement("div");
    examProgressTrack.style.cssText =
      "display:none;height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;position:relative;";
    const examProgressFill = document.createElement("div");
    examProgressFill.style.cssText =
      "height:100%;width:0%;background:linear-gradient(90deg,#60a5fa 0%,#2563eb 100%);transition:width .2s ease;";
    examProgressTrack.appendChild(examProgressFill);
    examProgressTopRow.appendChild(examProgressStatusText);
    examProgressTopRow.appendChild(examProgressText);
    examProgressLeft.appendChild(examProgressTopRow);
    examProgressLeft.appendChild(examProgressTrack);
    const examProgressIconWrap = document.createElement("div");
    examProgressIconWrap.style.cssText =
      "flex:0 0 auto;width:26px;height:26px;border-radius:999px;border:1px solid #cbd5e1;background:#f1f5f9;color:#475569;display:inline-flex;align-items:center;justify-content:center;";
    examProgressCard.appendChild(examProgressLeft);
    examProgressCard.appendChild(examProgressIconWrap);
    let examStatusText = "";
    let examProgressDone = 0;
    let examProgressTotal = 0;
    const examResultWrap = document.createElement("div");
    examResultWrap.style.cssText =
      "overflow:auto;border:1px solid #dbe6f3;border-radius:9px;padding:8px;background:#ffffff;min-height:0;max-height:none;flex:1 1 auto;font-size:13px;overscroll-behavior:contain;";
    examResultWrap.textContent = "点击“提取测试链接”后显示结果";
    const examOverviewWrap = document.createElement("div");
    examOverviewWrap.style.cssText =
      "overflow:auto;border:1px solid #dbe6f3;border-radius:9px;padding:8px;background:#ffffff;min-height:0;flex:1 1 auto;font-size:13px;overscroll-behavior:contain;";
    examOverviewWrap.textContent = "习题概览加载中...";
    const examNextPendingWrap = document.createElement("div");
    examNextPendingWrap.style.cssText =
      "overflow:auto;border:1px solid #fdba74;border-radius:9px;padding:8px;background:#fff7ed;flex:0 0 auto;font-size:13px;";
    examNextPendingWrap.textContent = "下一个未完成习题: 暂无";

    const btnExamExtract = document.createElement("button");
    setButtonIconLabel(btnExamExtract, "refresh", "提取测试链接");
    styleAutoControlButton(btnExamExtract);
    btnExamExtract.style.width = "100%";
    btnExamExtract.style.background = "#2563eb";
    btnExamExtract.style.borderColor = "#3b82f6";
    btnExamExtract.style.color = "#f8fafc";
    applyHoverAccent(btnExamExtract, {
      hoverBorderColor: "#3b82f6",
      hoverShadow: "0 0 0 2px rgba(59,130,246,.16)",
      lift: true,
    });
    const btnExamClearCache = document.createElement("button");
    setButtonIconLabel(btnExamClearCache, "refresh", "清缓存");
    styleAutoControlButton(btnExamClearCache);
    btnExamClearCache.style.width = "100%";
    btnExamClearCache.style.background = "#dc2626";
    btnExamClearCache.style.borderColor = "#ef4444";
    btnExamClearCache.style.color = "#fef2f2";
    applyHoverAccent(btnExamClearCache, {
      hoverBorderColor: "#f87171",
      hoverShadow: "0 0 0 2px rgba(239,68,68,.16)",
      lift: true,
    });
    btnExamClearCache.style.boxShadow =
      "inset 0 1px 0 rgba(255,255,255,.08), 0 3px 10px rgba(2,6,23,.28)";
    examToolbar.appendChild(btnExamExtract);
    examToolbar.appendChild(btnExamClearCache);
    const examAnswerToolbar = document.createElement("div");
    examAnswerToolbar.style.cssText =
      "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:0 0 auto;margin-top:2px;";
    const btnExamSetToken = document.createElement("button");
    setButtonIconLabel(btnExamSetToken, "key", "设置Token");
    styleAutoControlButton(btnExamSetToken);
    btnExamSetToken.style.width = "100%";
    btnExamSetToken.style.background = "#475569";
    btnExamSetToken.style.borderColor = "#64748b";
    btnExamSetToken.style.color = "#f8fafc";
    applyHoverAccent(btnExamSetToken, {
      hoverBorderColor: "#94a3b8",
      hoverShadow: "0 0 0 2px rgba(148,163,184,.18)",
      lift: true,
    });
    const btnExamQueryAnswer = document.createElement("button");
    setButtonIconLabel(btnExamQueryAnswer, "search", "查当前题");
    styleAutoControlButton(btnExamQueryAnswer);
    btnExamQueryAnswer.style.width = "100%";
    btnExamQueryAnswer.style.background = "#0f9f7d";
    btnExamQueryAnswer.style.borderColor = "#1fb493";
    btnExamQueryAnswer.style.color = "#f8fafc";
    applyHoverAccent(btnExamQueryAnswer, {
      hoverBorderColor: "#34d399",
      hoverShadow: "0 0 0 2px rgba(52,211,153,.2)",
      lift: true,
    });
    examAnswerToolbar.appendChild(btnExamSetToken);
    examAnswerToolbar.appendChild(btnExamQueryAnswer);
    const initialToken = getStoredExamQueryToken();
    function updateExamTokenButtonVisual(token) {
      const hasToken = !!String(token || "").trim();
      if (hasToken) {
        setButtonIconLabel(btnExamSetToken, "check", "修改token");
        btnExamSetToken.style.background = "#15803d";
        btnExamSetToken.style.borderColor = "#22c55e";
        btnExamSetToken.style.color = "#f0fdf4";
      } else {
        setButtonIconLabel(btnExamSetToken, "key", "设置Token");
        btnExamSetToken.style.background = "#475569";
        btnExamSetToken.style.borderColor = "#64748b";
        btnExamSetToken.style.color = "#f8fafc";
      }
    }
    function setExamQueryButtonBusy(isBusy) {
      const busy = !!isBusy;
      btnExamQueryAnswer.disabled = busy;
      if (busy) {
        btnExamQueryAnswer.innerHTML = "";
        const loader = document.createElement("span");
        loader.className = "zs-btn-loader";
        const text = document.createElement("span");
        text.textContent = "查询中...";
        btnExamQueryAnswer.appendChild(loader);
        btnExamQueryAnswer.appendChild(text);
      } else {
        setButtonIconLabel(btnExamQueryAnswer, "search", "查当前题");
      }
      btnExamQueryAnswer.style.opacity = busy ? ".9" : "1";
    }
    updateExamTokenButtonVisual(initialToken);
    const examActionsWrap = document.createElement("div");
    examActionsWrap.style.cssText =
      "border:1px solid #dbe6f3;border-radius:11px;padding:8px;background:#f8fafc;display:flex;flex-direction:column;gap:6px;overflow:visible;position:relative;z-index:2;margin-bottom:6px;";
    examActionsWrap.appendChild(examToolbar);
    const examDetailStatusWrap = document.createElement("div");
    examDetailStatusWrap.style.cssText =
      "border:1px solid #dbe6f3;border-radius:10px;padding:8px 10px;background:#f8fafc;color:#334155;font-size:12px;line-height:1.45;";
    examDetailStatusWrap.textContent = "提取状态: 待执行";
    const examQuickAnswerWrap = document.createElement("div");
    examQuickAnswerWrap.style.cssText =
      "border:1px solid #dbe6f3;border-radius:11px;padding:8px;background:#f8fafc;display:flex;flex-direction:column;gap:6px;overflow:visible;position:relative;z-index:2;";
    examQuickAnswerWrap.appendChild(examAnswerToolbar);
    const examTokenModal = document.createElement("div");
    examTokenModal.style.cssText =
      "position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:2147483646;padding:20px;";
    const examTokenModalCard = document.createElement("div");
    examTokenModalCard.style.cssText =
      "width:min(520px,calc(100vw - 40px));background:#ffffff;border:1px solid #dbe6f3;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 16px 48px rgba(2,6,23,.28);overflow:hidden;";
    const examTokenModalTitle = document.createElement("div");
    examTokenModalTitle.textContent = "设置题库 Token";
    examTokenModalTitle.style.cssText =
      "color:#0f172a;font-size:14px;font-weight:700;line-height:1.3;";
    const examTokenModalHint = document.createElement("div");
    examTokenModalHint.textContent = "请输入查询 Token（如：qry_xxx）";
    examTokenModalHint.style.cssText =
      "color:#64748b;font-size:12px;line-height:1.4;";
    const examTokenModalInput = document.createElement("input");
    examTokenModalInput.type = "text";
    examTokenModalInput.placeholder = "请输入题库查询 Token（qry_xxx）";
    examTokenModalInput.style.cssText =
      "box-sizing:border-box;width:100%;max-width:100%;min-width:0;height:36px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;background:#fff;color:#0f172a;font-size:12px;outline:none;";
    examTokenModalInput.addEventListener("focus", () => {
      examTokenModalInput.style.borderColor = "#60a5fa";
      examTokenModalInput.style.boxShadow = "0 0 0 2px rgba(96,165,250,.16)";
    });
    examTokenModalInput.addEventListener("blur", () => {
      examTokenModalInput.style.borderColor = "#cbd5e1";
      examTokenModalInput.style.boxShadow = "none";
    });
    const examTokenModalActionRow = document.createElement("div");
    examTokenModalActionRow.style.cssText =
      "display:flex;justify-content:flex-end;gap:8px;";
    const btnExamTokenSave = document.createElement("button");
    setButtonIconLabel(btnExamTokenSave, "check", "保存");
    styleAutoControlButton(btnExamTokenSave);
    btnExamTokenSave.style.minWidth = "88px";
    btnExamTokenSave.style.background = "#2563eb";
    btnExamTokenSave.style.borderColor = "#3b82f6";
    btnExamTokenSave.style.color = "#f8fafc";
    applyHoverAccent(btnExamTokenSave, {
      hoverBorderColor: "#60a5fa",
      hoverShadow: "0 0 0 2px rgba(59,130,246,.16)",
      lift: true,
    });
    examTokenModalActionRow.appendChild(btnExamTokenSave);
    examTokenModalCard.appendChild(examTokenModalTitle);
    examTokenModalCard.appendChild(examTokenModalHint);
    examTokenModalCard.appendChild(examTokenModalInput);
    examTokenModalCard.appendChild(examTokenModalActionRow);
    examTokenModal.appendChild(examTokenModalCard);
    document.body.appendChild(examTokenModal);

    let lastResult = null;
    let currentResourceTimer = 0;
    let currentView = "exam-overview";
    let lastStudyView = "overview";
    let lastExamView = "exam-overview";
    let autoLoopTimer = 0;
    let autoLoopBusy = false;
    let autoRunning = false;
    let autoProgressTimer = 0;
    let autoProgressBusy = false;
    let autoStateSyncTimer = 0;
    let examMasteryPollingTimer = 0;
    let examMasteryPollingBusy = false;
    let autoTargetUid = "";
    let autoExamTargetPointId = "";
    let autoMode = "exam";
    const examAnsweredMap = new Map();
    let examAnsweredMapPaperKey = "";
    let automationMaskEnabled = loadAutomationMaskEnabled();
    let aiSlotSyncTimer = 0;
    let externalStuckCount = 0;
    const examState = {
      running: false,
      questionRunning: false,
      rows: [],
      questionRows: [],
      lastContext: null,
      openingExam: new Set(),
      autoExtractScheduled: false,
      autoExtractTriggered: false,
    };
    updateExamProgressCard();
    const EXAM_CACHE_TTL_POINTS = 12 * 60 * 60 * 1000;
    const overlayLoaderDots = Array.from(
      automationOverlayLoader.querySelectorAll(".zs-loader-dot"),
    );
    let overlayLoaderTimer = 0;
    let overlayLoaderFrameIndex = 0;
    let overlayLoaderRunning = false;
    let overlayProgressTimer = 0;
    let overlayVisible = false;
    let overlayHideTimer = 0;
    let overlayPinnedMessage = "";
    let overlayPinnedUntil = 0;
    let overlayPinnedTimer = 0;
    let examAnswerBusy = false;
    let examSubmitBusy = false;
    const examAnswerCache = new Map();
    let lastExamAutoAnswerKey = "";
    let lastExamAutoAnswerAt = 0;
    let pendingSubmittedPointId = "";
    let pendingSubmittedAt = 0;
    let lastTokenNoticeText = "";
    let lastTokenNoticeAt = 0;
    let examQaUserInfoCache = null;
    let examQaUsernameBindKey = "";
    let examQaUsernameBindAt = 0;
    let examQaUsernameBindPromise = null;
    let examQaUsernameBindPromiseKey = "";
    let examQaClientIpCache = "";
    let examQaClientIpPromise = null;
    let examWrongSyncTimer = 0;
    let examWrongSyncBusy = false;
    let lastPreviewNavAt = 0;
    const panelNoticeContainer = document.createElement("div");
    panelNoticeContainer.style.cssText =
      "position:fixed;top:18px;right:18px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:10px;pointer-events:none;";
    document.body.appendChild(panelNoticeContainer);

    function showPanelNotification(
      message,
      type = "warning",
      timeoutMs = 3200,
    ) {
      const text = String(message || "").trim();
      if (!text) return;
      const card = document.createElement("div");
      const isError = type === "error";
      card.style.cssText = [
        "min-width:260px;max-width:420px;",
        "padding:10px 12px;border-radius:10px;",
        "border:1px solid rgba(15,23,42,.14);",
        `background:${isError ? "#fef2f2" : "#fff7ed"};`,
        `color:${isError ? "#991b1b" : "#9a3412"};`,
        "font-size:13px;line-height:1.45;font-weight:600;",
        "box-shadow:0 10px 24px rgba(15,23,42,.16);",
        "pointer-events:auto;",
      ].join("");
      card.textContent = text;
      panelNoticeContainer.appendChild(card);
      window.setTimeout(
        () => {
          try {
            card.remove();
          } catch {}
        },
        Math.max(1200, Number(timeoutMs || 0)),
      );
    }

    function shouldCelebrateAutomationStop(message) {
      const text = String(message || "").trim();
      if (!text) return false;
      return /(自动答题完成|全部待处理知识点已处理|自动化完成，已无未完成资源|自动化完成，已全部学习)/.test(
        text,
      );
    }

    function clearOverlayHideTimer() {
      if (!overlayHideTimer) return;
      window.clearTimeout(overlayHideTimer);
      overlayHideTimer = 0;
    }

    function setOverlayVisible(visible) {
      if (visible) {
        clearOverlayHideTimer();
        if (overlayVisible) return;
        overlayVisible = true;
        automationOverlay.style.transition =
          "opacity .22s ease, visibility 0s linear 0s";
        automationOverlay.style.visibility = "visible";
        automationOverlay.style.opacity = "1";
        automationOverlayBox.style.opacity = "1";
        automationOverlayBox.style.transform = "translateY(0) scale(1)";
        return;
      }
      overlayVisible = false;
      automationOverlay.style.transition =
        "opacity .2s ease, visibility 0s linear .2s";
      automationOverlay.style.opacity = "0";
      automationOverlayBox.style.opacity = ".92";
      automationOverlayBox.style.transform = "translateY(10px) scale(.98)";
      clearOverlayHideTimer();
      overlayHideTimer = window.setTimeout(() => {
        overlayHideTimer = 0;
        if (!overlayVisible) {
          automationOverlay.style.visibility = "hidden";
        }
      }, 220);
    }

    function isTokenUnavailableMessage(raw) {
      const text = String(raw || "").toLowerCase();
      if (!text) return false;
      if (
        text.includes("未设置题库 token") ||
        text.includes("请先设置查询 token")
      )
        return true;
      if (
        /绑定\s*用户名|当前\s*用户名|缺少\s*username|x-query-username|username\s*不能为空|username/.test(
          text,
        )
      )
        return true;
      if (
        /缺少\s*身份字段|studentname|studentcode|traceid|x-query-student-name|x-query-student-code|x-query-trace-id/.test(
          text,
        )
      )
        return true;
      if (
        text.includes("token") &&
        /(失效|无效|过期|不存在|不可用|错误|invalid|expired|unauthorized|forbidden|401|403)/i.test(
          text,
        )
      )
        return true;
      return false;
    }

    function isExamQaIpValidationMessage(raw) {
      const text = String(raw || "").toLowerCase();
      if (!text) return false;
      return /绑定\s*ip|current\s*ip|当前\s*ip|ip\s*不一致|已绑定/i.test(text);
    }

    function notifyTokenUnavailable(message) {
      const detail = String(message || "请重新设置 Token").trim();
      const text = `题库 Token 不可用：${detail}`;
      const now = Date.now();
      if (text === lastTokenNoticeText && now - lastTokenNoticeAt < 8000)
        return;
      lastTokenNoticeText = text;
      lastTokenNoticeAt = now;
      showPanelNotification(text, "warning", 4200);
    }

    function setOverlayProgressAsText(text) {
      automationOverlayProgress.innerHTML = "";
      automationOverlayProgress.textContent = String(text || "--%");
      automationOverlayProgress.style.color = "#2563eb";
      automationOverlayProgress.style.display = "block";
      automationOverlayProgress.style.textAlign = "left";
    }

    function setOverlayProgressAsCheckIcon() {
      automationOverlayProgress.innerHTML = "";
      automationOverlayProgress.style.display = "inline-flex";
      automationOverlayProgress.style.alignItems = "center";
      automationOverlayProgress.style.justifyContent = "center";
      automationOverlayProgress.style.textAlign = "center";
      const iconWrap = document.createElement("span");
      iconWrap.style.cssText =
        "display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#dcfce7;border:1px solid #86efac;color:#15803d;";
      const icon = createIcon("check", { size: 16, strokeWidth: 2.6 });
      iconWrap.appendChild(icon);
      automationOverlayProgress.appendChild(iconWrap);
    }

    function setOverlayCompletionGlow(active) {
      if (!automationOverlayGlow) return;
      automationOverlayGlow.classList.toggle("active", !!active);
    }

    function shouldShowOverlayCompletionIcon(message) {
      const text = String(message || "").trim();
      return /自动化任务完成/.test(text);
    }

    function setAutomationOverlayPinnedMessage(message, durationMs = 5200) {
      const text = String(message || "").trim();
      if (!text) return;
      overlayPinnedMessage = text;
      overlayPinnedUntil = Date.now() + Math.max(1200, Number(durationMs || 0));
      automationOverlayText.textContent = text;
      if (shouldShowOverlayCompletionIcon(text)) {
        setOverlayProgressAsCheckIcon();
        setOverlayCompletionGlow(true);
      } else {
        setOverlayProgressAsText("--%");
        setOverlayCompletionGlow(false);
      }
      setOverlayVisible(true);
      stopOverlayLoaderAnimation(true);
      clearOverlayProgressTimer();
      if (overlayPinnedTimer) {
        window.clearTimeout(overlayPinnedTimer);
        overlayPinnedTimer = 0;
      }
      overlayPinnedTimer = window.setTimeout(
        () => {
          overlayPinnedTimer = 0;
          overlayPinnedMessage = "";
          overlayPinnedUntil = 0;
          setOverlayCompletionGlow(false);
          if (autoRunning && automationMaskEnabled) {
            automationOverlayText.textContent = "正在执行自动化进程";
            updateOverlayVisibility();
            updateOverlayProgressText();
            return;
          }
          setOverlayVisible(false);
        },
        Math.max(1200, Number(durationMs || 0)),
      );
    }

    function stopExamAutomationByTokenError(message) {
      const detail = String(message || "请重新设置查询 Token").trim();
      const modeLabel = getExamAutomationModeLabel(autoMode);
      stopAutoLoop(`状态: ${modeLabel}已停止（Token异常：${detail}）`);
      setAutomationOverlayPinnedMessage(`${modeLabel}已停止：${detail}`, 5200);
    }

    function moveTabIndicator(indicator, btn) {
      if (!indicator || !btn || !btn.parentElement) return false;
      const parentRect = btn.parentElement.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const width = Math.round(btnRect.width || btn.offsetWidth || 0);
      if (width <= 0 || parentRect.width <= 0) return false;
      const left = Math.max(0, btnRect.left - parentRect.left);
      indicator.style.width = `${width}px`;
      indicator.style.transform = `translateX(${left}px)`;
      return true;
    }

    function getActiveSecondaryTabButton() {
      return currentView === "exam-detail" ? tabDetail : tabOverview;
    }

    function refreshSegmentedTabsVisualNow() {
      updateSegmentedTabsVisual(tabPractice, getActiveSecondaryTabButton());
    }

    let tabIndicatorRefreshTimer1 = null;
    let tabIndicatorRefreshTimer2 = null;
    let tabIndicatorRefreshRaf = null;
    function scheduleSegmentedTabsVisualRefresh() {
      if (tabIndicatorRefreshRaf) {
        try {
          window.cancelAnimationFrame(tabIndicatorRefreshRaf);
        } catch {}
        tabIndicatorRefreshRaf = null;
      }
      if (tabIndicatorRefreshTimer1) {
        window.clearTimeout(tabIndicatorRefreshTimer1);
        tabIndicatorRefreshTimer1 = null;
      }
      if (tabIndicatorRefreshTimer2) {
        window.clearTimeout(tabIndicatorRefreshTimer2);
        tabIndicatorRefreshTimer2 = null;
      }
      tabIndicatorRefreshRaf = window.requestAnimationFrame(() => {
        tabIndicatorRefreshRaf = null;
        refreshSegmentedTabsVisualNow();
        tabIndicatorRefreshTimer1 = window.setTimeout(() => {
          tabIndicatorRefreshTimer1 = null;
          refreshSegmentedTabsVisualNow();
        }, 80);
        tabIndicatorRefreshTimer2 = window.setTimeout(() => {
          tabIndicatorRefreshTimer2 = null;
          refreshSegmentedTabsVisualNow();
        }, 220);
      });
    }

    function updateSegmentedTabsVisual(activePrimaryBtn, activeSecondaryBtn) {
      [tabPractice].forEach((btn) => {
        const active = btn === activePrimaryBtn;
        btn.style.color = active ? "#0f172a" : "#64748b";
        btn.style.fontWeight = active ? "700" : "600";
        btn.style.background = "transparent";
        btn.dataset.zsActive = active ? "1" : "0";
      });
      [tabOverview, tabDetail].forEach((btn) => {
        const active = btn === activeSecondaryBtn;
        btn.style.color = active ? "#0f172a" : "#64748b";
        btn.style.fontWeight = active ? "700" : "600";
        btn.style.background = "transparent";
        btn.dataset.zsActive = active ? "1" : "0";
      });
      const primaryOk = moveTabIndicator(primaryTabIndicator, activePrimaryBtn);
      const secondaryOk = moveTabIndicator(
        viewTabIndicator,
        activeSecondaryBtn,
      );
      if (!primaryOk || !secondaryOk) {
        scheduleSegmentedTabsVisualRefresh();
      }
    }

    function bindSegmentTabHover(btn) {
      if (!btn) return;
      btn.addEventListener("mouseenter", () => {
        if (btn.dataset.zsActive === "1") return;
        btn.style.color = "#334155";
        btn.style.background = "rgba(148,163,184,.18)";
      });
      btn.addEventListener("mouseleave", () => {
        if (btn.dataset.zsActive === "1") return;
        btn.style.color = "#64748b";
        btn.style.background = "transparent";
      });
      btn.addEventListener(
        "focus",
        () => {
          if (btn.dataset.zsActive === "1") return;
          btn.style.color = "#334155";
          btn.style.background = "rgba(148,163,184,.18)";
        },
        true,
      );
      btn.addEventListener(
        "blur",
        () => {
          if (btn.dataset.zsActive === "1") return;
          btn.style.color = "#64748b";
          btn.style.background = "transparent";
        },
        true,
      );
    }
    [tabPractice, tabOverview, tabDetail].forEach(bindSegmentTabHover);

    function applyOverlayLoaderFrame(frameIndex) {
      const totalFrames = LOADER_GIF_FRAMES.length;
      if (!totalFrames || !overlayLoaderDots.length) return;
      const normalizedIndex =
        (((Number(frameIndex) || 0) % totalFrames) + totalFrames) % totalFrames;
      const frame = LOADER_GIF_FRAMES[normalizedIndex];
      for (let i = 0; i < overlayLoaderDots.length; i++) {
        const dot = overlayLoaderDots[i];
        if (!dot) continue;
        const state = frame && frame[i] ? frame[i] : [0, 0, 1, 1, 0];
        const dx = Number(state[0]) || 0;
        const dy = Number(state[1]) || 0;
        const sx = Number(state[2]) || 1;
        const sy = Number(state[3]) || 1;
        const angle = Number(state[4]) || 0;
        dot.style.transform = `translate(${dx}px, ${dy}px) scaleX(${sx}) scaleY(${sy}) rotate(${angle}deg)`;
      }
    }

    function stopOverlayLoaderAnimation(resetToFirstFrame = true) {
      overlayLoaderRunning = false;
      if (overlayLoaderTimer) {
        window.clearTimeout(overlayLoaderTimer);
        overlayLoaderTimer = 0;
      }
      if (resetToFirstFrame) {
        overlayLoaderFrameIndex = 0;
        applyOverlayLoaderFrame(0);
      }
    }

    function tickOverlayLoaderAnimation() {
      if (!overlayLoaderRunning) return;
      const totalFrames = LOADER_GIF_FRAMES.length;
      if (!totalFrames) return;
      applyOverlayLoaderFrame(overlayLoaderFrameIndex);
      const duration = Math.max(
        16,
        Number(LOADER_GIF_FRAME_DURATIONS[overlayLoaderFrameIndex]) || 20,
      );
      overlayLoaderFrameIndex = (overlayLoaderFrameIndex + 1) % totalFrames;
      overlayLoaderTimer = window.setTimeout(
        tickOverlayLoaderAnimation,
        duration,
      );
    }

    function startOverlayLoaderAnimation() {
      if (overlayLoaderRunning) return;
      overlayLoaderRunning = true;
      overlayLoaderFrameIndex = 0;
      tickOverlayLoaderAnimation();
    }

    function findVisibleVideoForOverlay() {
      const videos = Array.from(document.querySelectorAll("video"));
      for (const video of videos) {
        if (!video || video.readyState <= 0) continue;
        const rect = video.getBoundingClientRect();
        if (rect.width > 24 && rect.height > 24) return video;
      }
      return videos[0] || null;
    }

    function getExamOverlayProgressTextFromDom() {
      const candidates = [
        ".answer-pro.com-style",
        ".answer-pro.comStyle",
        ".answer-pro",
      ];
      for (const selector of candidates) {
        const list = Array.from(document.querySelectorAll(selector));
        for (const el of list) {
          const text = String((el && el.textContent) || "")
            .replace(/\s+/g, "")
            .trim();
          if (!text) continue;
          const percentMatch = text.match(/(\d+(?:\.\d+)?)%/);
          if (percentMatch)
            return `${Math.round(Number(percentMatch[1]) || 0)}%`;
          const ratioMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
          if (ratioMatch) {
            const done = Number(ratioMatch[1] || 0);
            const total = Number(ratioMatch[2] || 0);
            if (Number.isFinite(done) && Number.isFinite(total) && total > 0) {
              return `${Math.max(0, Math.min(100, Math.round((done / total) * 100)))}%`;
            }
          }
        }
      }
      return "";
    }

    function buildOverlayProgressText() {
      if (isExamAutomationMode(autoMode)) {
        const ctx = getExamContext();
        const routeType = String((ctx && ctx.routeType) || "");
        if (routeType === "point") {
          const overallText = getExamOverallProgressTextFromRows();
          if (overallText) return `总进度 ${overallText}`;
        }
        const recordedProgress = getCurrentPaperRecordedProgress();
        const total = Math.max(
          0,
          Number((recordedProgress && recordedProgress.total) || 0),
        );
        if (total > 0) {
          const done = Math.max(
            0,
            Number((recordedProgress && recordedProgress.done) || 0),
          );
          const percent = Math.max(
            0,
            Math.min(100, Math.round((done / total) * 100)),
          );
          return `${percent}% (${done}/${total})`;
        }
        return "--%";
      }
      const summary = lastResult ? getCurrentResourceSummary(lastResult) : null;
      if (!summary) {
        if (autoTargetUid) return "--%";
        return "--%";
      }
      if (Number(summary.studyStatus) === 1) {
        return "100%";
      }
      if (summary.isVideo) {
        const percent = getVideoProgressPercent(summary);
        if (percent !== null) return `${percent}%`;
      }
      return "0%";
    }

    function updateOverlayProgressText() {
      if (overlayPinnedMessage && Date.now() < overlayPinnedUntil) {
        automationOverlayText.textContent = overlayPinnedMessage;
        if (shouldShowOverlayCompletionIcon(overlayPinnedMessage)) {
          setOverlayProgressAsCheckIcon();
          setOverlayCompletionGlow(true);
        } else {
          setOverlayProgressAsText("--%");
          setOverlayCompletionGlow(false);
        }
        refreshExamAutoControlStateText();
        return;
      }
      setOverlayCompletionGlow(false);
      automationOverlayText.textContent = "正在执行自动化进程";
      if (!autoRunning) {
        setOverlayProgressAsText("--%");
        refreshExamAutoControlStateText();
        return;
      }
      setOverlayProgressAsText(buildOverlayProgressText());
      refreshExamAutoControlStateText();
    }

    function clearOverlayProgressTimer() {
      if (!overlayProgressTimer) return;
      window.clearInterval(overlayProgressTimer);
      overlayProgressTimer = 0;
    }

    function syncOverlayProgressTimer() {
      clearOverlayProgressTimer();
      if (!(autoRunning && automationMaskEnabled)) return;
      updateOverlayProgressText();
      overlayProgressTimer = window.setInterval(updateOverlayProgressText, 200);
    }

    function setView(mode) {
      const normalized =
        mode === "exam-detail" ? "exam-detail" : "exam-overview";
      currentView = normalized;
      const isExamOverview = currentView === "exam-overview";
      const isExamDetail = currentView === "exam-detail";
      lastExamView = currentView;

      overviewView.style.display = "none";
      detailView.style.display = "none";
      examView.style.display = "flex";
      examOverviewSubView.style.display = isExamOverview ? "flex" : "none";
      examDetailSubView.style.display = isExamDetail ? "flex" : "none";
      studyStatusWrap.style.display = "none";
      viewTabBar.style.display = "grid";
      primaryTabBar.style.display = "grid";
      overviewView.setAttribute("aria-hidden", "true");
      detailView.setAttribute("aria-hidden", "true");
      examView.setAttribute("aria-hidden", "false");

      tabPractice.setAttribute("aria-selected", "true");
      tabOverview.setAttribute(
        "aria-selected",
        isExamOverview ? "true" : "false",
      );
      tabDetail.setAttribute("aria-selected", isExamDetail ? "true" : "false");
      updateSegmentedTabsVisual(
        tabPractice,
        isExamOverview ? tabOverview : tabDetail,
      );
      if (isExamOverview) renderExamOverviewPanel();
    }

    function renderExamProgressIcon(state) {
      examProgressIconWrap.innerHTML = "";
      let iconName = "pause";
      let iconColor = "#475569";
      let bgColor = "#f1f5f9";
      let borderColor = "#cbd5e1";
      let spin = false;
      if (state === "loading") {
        iconName = "refresh";
        iconColor = "#1d4ed8";
        bgColor = "#dbeafe";
        borderColor = "#93c5fd";
        spin = true;
      } else if (state === "done") {
        iconName = "check";
        iconColor = "#15803d";
        bgColor = "#dcfce7";
        borderColor = "#86efac";
      } else if (state === "error") {
        iconName = "stop";
        iconColor = "#b91c1c";
        bgColor = "#fee2e2";
        borderColor = "#fecaca";
      }
      examProgressIconWrap.style.color = iconColor;
      examProgressIconWrap.style.background = bgColor;
      examProgressIconWrap.style.borderColor = borderColor;
      const icon = createIcon(iconName, { size: 15, strokeWidth: 2.3 });
      if (spin) icon.style.animation = "zs-spin .9s linear infinite";
      examProgressIconWrap.appendChild(icon);
    }

    function updateExamProgressCard() {
      const ctx = getExamContext();
      const isPointRoute = String((ctx && ctx.routeType) || "") === "point";
      examProgressCard.style.display = isPointRoute ? "none" : "flex";
      if (isPointRoute) return;
      const statusDisplay =
        String(examStatusText || "").trim() || getExamIdleStatusText(autoMode);
      examProgressStatusText.textContent = `答题状态: ${statusDisplay}`;
      const recordedProgress = getCurrentPaperRecordedProgress();
      const safeDone =
        recordedProgress.total > 0
          ? Math.max(0, Number(recordedProgress.done) || 0)
          : Math.max(0, Number(examProgressDone) || 0);
      const safeTotal =
        recordedProgress.total > 0
          ? Math.max(0, Number(recordedProgress.total) || 0)
          : Math.max(0, Number(examProgressTotal) || 0);
      const percent =
        safeTotal > 0
          ? Math.min(100, Math.round((safeDone / safeTotal) * 100))
          : 0;
      examProgressFill.style.width = `${percent}%`;
      examProgressText.textContent = `${safeDone} / ${safeTotal}`;
      let state = "idle";
      const statusText = String(examStatusText || "");
      if (/(失败|error|异常)/i.test(String(examStatusText || ""))) {
        state = "error";
      } else if (safeTotal > 0 && safeDone >= safeTotal) {
        state = "done";
      } else if (
        examState.running ||
        (!/(待执行|未开启|未开始|空闲|已停止)/.test(statusText) &&
          /(准备中|拉取|提取|加载中|处理中|正在|刷新中|提交中|等待)/.test(
            statusText,
          ))
      ) {
        state = "loading";
      }
      renderExamProgressIcon(state);
    }

    function isAnswerStatusMessage(text) {
      const s = String(text || "").trim();
      if (!s) return false;
      if (
        /(题库|命中|未命中|选项|当前题干|应用失败|输入框|查询 Token|Token|答题|交卷|提交试卷|下一题)/.test(
          s,
        )
      )
        return true;
      if (/(失败|异常|error)/i.test(s) && /题库|答题|交卷|提交/.test(s))
        return true;
      return false;
    }

    function getExamIdleStatusText(mode = autoMode) {
      return `待执行（${getExamModeName(mode)}）`;
    }

    function normalizeExamStatusText(text) {
      const normalized = String(text || "").trim();
      if (!normalized) return "";
      return normalized.replace(/^状态\s*[:：]\s*/, "").trim();
    }

    function setExamProgressStatusText(text, options = {}) {
      const normalized = normalizeExamStatusText(text);
      if (normalized) {
        examStatusText = normalized;
      } else if (options.useModeIdleFallback) {
        examStatusText = getExamIdleStatusText(autoMode);
      }
      updateExamProgressCard();
    }

    function setExamAutomationRuntimeStatus(text, options = {}) {
      const raw = String(text || "").trim();
      if (!raw) return;
      const plain = normalizeExamStatusText(raw) || raw;
      const now = Date.now();
      const holdMs = Math.max(0, Number(options.holdMs || 0));
      const force = options.force === true;
      if (
        !force &&
        now < Number(setExamAutomationRuntimeStatus._lockedUntil || 0)
      ) {
        return;
      }
      if (options.updateMain !== false) {
        status.textContent = `状态: ${plain}`;
      }
      if (options.updateProgress !== false && isExamAutomationMode(autoMode)) {
        setExamProgressStatusText(plain);
      }
      if (holdMs > 0) {
        setExamAutomationRuntimeStatus._lockedUntil = now + holdMs;
      }
    }

    function panelSetExamStatus(text) {
      const nextText = String(text || "").trim();
      if (!nextText) return;
      if (isAnswerStatusMessage(nextText)) {
        setExamProgressStatusText(nextText);
        return;
      }
      examDetailStatusWrap.textContent = `提取状态: ${nextText}`;
    }

    function panelSetExamProgress(text) {
      const raw = String(text || "0 / 0");
      const m = raw.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        examProgressDone = Number(m[1] || 0);
        examProgressTotal = Number(m[2] || 0);
      } else {
        examProgressDone = 0;
        examProgressTotal = 0;
      }
      updateExamProgressCard();
    }

    function pickFirstExamText(selectors, maxLen = 80) {
      for (const selector of selectors || []) {
        const list = Array.from(document.querySelectorAll(selector));
        for (const el of list) {
          const t = String((el && el.textContent) || "")
            .replace(/\s+/g, " ")
            .trim();
          if (!t) continue;
          return t.length > maxLen
            ? `${t.slice(0, Math.max(0, maxLen - 1))}...`
            : t;
        }
      }
      return "";
    }

    function renderExamOverviewPanel() {
      const ctx = getExamContext();
      const titleText = pickFirstExamText(
        [".questionContent .questionTitle .letterSortNum"],
        90,
      );
      const stemText = pickFirstExamText(
        [".questionContent .centent-pre .preStyle"],
        120,
      );
      const nodeText = String(ctx.nodeName || "").trim();
      const currentPointId = String(ctx.nodeUid || "").trim();
      const currentStatusText = String(
        (status && status.textContent) || "",
      ).trim();
      const allExamRows = Array.isArray(examState.rows) ? examState.rows : [];
      const validExamRows = allExamRows.filter((row) => {
        if (!row) return false;
        const pointId = String(row.pointId || "").trim();
        if (!pointId) return false;
        const status = String(row.status || "").trim();
        return status !== "error" && status !== "no-question";
      });
      const examTotalCount = validExamRows.length;
      const examDoneCount = validExamRows.filter((row) => {
        return isExamMasteryReachedByMode(row && row.masteryScore, autoMode);
      }).length;
      const examOverallProgressText =
        examTotalCount > 0 ? `${examDoneCount}/${examTotalCount}` : "-/-";
      const autoTaskText = autoRunning
        ? isExamAutomationMode(autoMode)
          ? `自动答题运行中（目标知识点: ${String(autoExamTargetPointId || currentPointId || "未定位")})`
          : "学习自动化运行中（当前不执行习题自动答题）"
        : "未开启自动化任务";
      const nextPending = pickNextExamAutoRow(examState.rows);
      examNextPendingWrap.innerHTML = "";
      const npTitle = document.createElement("div");
      npTitle.textContent = "下一个待处理习题";
      npTitle.style.cssText =
        "color:#c2410c;font-weight:700;line-height:1.3;font-size:13px;margin-bottom:4px;";
      examNextPendingWrap.appendChild(npTitle);
      const npName = document.createElement("div");
      npName.style.cssText =
        "color:#0f172a;font-size:13px;line-height:1.45;font-weight:600;word-break:break-all;";
      const npPath = document.createElement("div");
      npPath.style.cssText =
        "color:#7c2d12;font-size:12px;line-height:1.45;margin-top:3px;word-break:break-all;";
      if (nextPending) {
        const pointName = String(
          nextPending.pointName || nextPending.pointId || "-",
        );
        const pathText = String(nextPending.path || "-");
        npName.textContent =
          pointName.length > 140 ? `${pointName.slice(0, 140)}...` : pointName;
        npName.title = pointName;
        npPath.textContent =
          pathText.length > 180 ? `${pathText.slice(0, 180)}...` : pathText;
        npPath.title = pathText;
      } else if (examState.rows.length) {
        npName.textContent = "暂无（待处理知识点已处理完）";
        npPath.textContent = "-";
      } else {
        npName.textContent = "暂无（请先提取测试链接）";
        npPath.textContent = "-";
      }
      examNextPendingWrap.appendChild(npName);
      examNextPendingWrap.appendChild(npPath);
      examOverviewWrap.innerHTML = "";
      const cardWrap = document.createElement("div");
      cardWrap.style.cssText = "display:flex;flex-direction:column;gap:8px;";

      const makeInfoCard = (title, rows, tone) => {
        const card = document.createElement("div");
        const border = tone === "auto" ? "#bfdbfe" : "#cbd5e1";
        const bg = tone === "auto" ? "#f8fbff" : "#f8fafc";
        card.style.cssText = `border:1px solid ${border};border-radius:10px;padding:8px 10px;background:${bg};`;

        const header = document.createElement("div");
        header.textContent = title;
        header.style.cssText =
          "color:#1d4ed8;font-weight:700;font-size:12px;line-height:1.25;margin-bottom:6px;";
        card.appendChild(header);

        for (const [k, v] of rows) {
          const row = document.createElement("div");
          row.style.cssText =
            "display:flex;align-items:flex-start;gap:8px;padding:3px 0;border-bottom:1px dashed #e2e8f0;";
          const key = document.createElement("div");
          key.style.cssText =
            "flex:0 0 70px;color:#64748b;font-size:12px;line-height:1.4;";
          key.textContent = k;
          const val = document.createElement("div");
          val.style.cssText =
            "flex:1 1 auto;color:#0f172a;font-size:12px;line-height:1.45;word-break:break-all;";
          const text = String(v || "-");
          val.textContent =
            text.length > 180 ? `${text.slice(0, 180)}...` : text;
          val.title = text;
          row.appendChild(key);
          row.appendChild(val);
          card.appendChild(row);
        }
        return card;
      };

      cardWrap.appendChild(
        makeInfoCard(
          "自动任务",
          [
            ["任务", autoTaskText],
            ["总进度", examOverallProgressText],
            ["状态", currentStatusText || "-"],
          ],
          "auto",
        ),
      );

      cardWrap.appendChild(
        makeInfoCard(
          "当前习题",
          [
            ["知识点", nodeText || "-"],
            ["题型", titleText || "-"],
            ["题干", stemText || "-"],
          ],
          "question",
        ),
      );

      const paperKey = getCurrentExamPaperKey();
      if (paperKey !== examAnsweredMapPaperKey) {
        examAnsweredMapPaperKey = paperKey;
        examAnsweredMap.clear();
      }
      const answeredList = Array.from(examAnsweredMap.values()).sort((a, b) => {
        const na = Number((a && a.questionNo) || 0);
        const nb = Number((b && b.questionNo) || 0);
        if (na > 0 && nb > 0) return na - nb;
        return Number((a && a.ts) || 0) - Number((b && b.ts) || 0);
      });
      const answerCard = document.createElement("div");
      answerCard.style.cssText =
        "border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;background:#f8fafc;";
      const paperProgress = getCurrentPaperRecordedProgress();
      const answerHeader = document.createElement("div");
      answerHeader.textContent =
        paperProgress.total > 0
          ? `当前试卷答题情况（${paperProgress.done}/${paperProgress.total}）`
          : "当前试卷答题情况";
      answerHeader.style.cssText =
        "color:#1d4ed8;font-weight:700;font-size:12px;line-height:1.25;margin-bottom:6px;";
      answerCard.appendChild(answerHeader);

      const recent = answeredList.slice(-12);
      if (!recent.length) {
        const empty = document.createElement("div");
        empty.textContent = "暂无答题记录（自动答题后会显示已选答案）";
        empty.style.cssText = "color:#64748b;font-size:12px;line-height:1.45;";
        answerCard.appendChild(empty);
      } else {
        for (const item of recent) {
          const row = document.createElement("div");
          row.style.cssText =
            "display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px dashed #e2e8f0;";

          const key = document.createElement("div");
          const noText =
            item.questionNo > 0 ? `第${item.questionNo}题` : "题目";
          const typeText = String(item.type || "");
          key.textContent = `${noText}${typeText ? `(${typeText})` : ""}`;
          const stemText = String(item.stem || "")
            .replace(/\s+/g, " ")
            .trim();
          key.title = stemText || key.textContent;
          key.style.cssText =
            "flex:0 0 110px;color:#64748b;font-size:12px;line-height:1.4;cursor:help;";

          const val = document.createElement("div");
          val.style.cssText =
            "flex:1 1 auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center;";

          const details = Array.isArray(item.selectedOptionDetails)
            ? item.selectedOptionDetails.filter((d) => d && d.label)
            : [];
          const optionMap =
            item && item.optionMap && typeof item.optionMap === "object"
              ? item.optionMap
              : {};
          const fallbackLabels = Array.from(
            parseAnswerLabels(
              String(item.selectedText || item.sourceAnswer || ""),
            ),
          );
          const mergedDetails = details.length
            ? details
            : fallbackLabels.map((label) => ({
                label,
                content: String(optionMap[label] || "").trim(),
              }));
          if (mergedDetails.length) {
            for (const d of mergedDetails) {
              const chip = document.createElement("span");
              chip.textContent = String(d.label || "").toUpperCase();
              chip.title = String(d.content || "-");
              chip.style.cssText =
                "display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;cursor:help;";
              val.appendChild(chip);
            }
          } else {
            const text = document.createElement("span");
            text.textContent = String(
              item.selectedText || item.sourceAnswer || "-",
            );
            text.style.cssText =
              "color:#0f172a;font-size:12px;line-height:1.45;word-break:break-all;";
            val.appendChild(text);
          }

          row.appendChild(key);
          row.appendChild(val);
          answerCard.appendChild(row);
        }
      }
      cardWrap.appendChild(answerCard);

      examOverviewWrap.appendChild(cardWrap);
    }

    function getStoredExamQueryToken() {
      let gmToken = "";
      try {
        if (typeof GM_getValue === "function") {
          gmToken = String(
            GM_getValue(EXAM_QA_TOKEN_STORAGE_KEY, "") || "",
          ).trim();
        }
      } catch {}

      let localToken = "";
      try {
        localToken = String(
          localStorage.getItem(EXAM_QA_TOKEN_STORAGE_KEY) || "",
        ).trim();
      } catch {}

      const token = gmToken || localToken;
      if (gmToken && gmToken !== localToken) {
        try {
          localStorage.setItem(EXAM_QA_TOKEN_STORAGE_KEY, gmToken);
        } catch {}
      } else if (!gmToken && localToken) {
        try {
          if (typeof GM_setValue === "function") {
            GM_setValue(EXAM_QA_TOKEN_STORAGE_KEY, localToken);
          }
        } catch {}
      }
      return token;
    }

    function setStoredExamQueryToken(token) {
      const value = String(token || "").trim();
      try {
        if (typeof GM_setValue === "function") {
          GM_setValue(EXAM_QA_TOKEN_STORAGE_KEY, value);
        }
      } catch {}
      try {
        if (!value) localStorage.removeItem(EXAM_QA_TOKEN_STORAGE_KEY);
        else localStorage.setItem(EXAM_QA_TOKEN_STORAGE_KEY, value);
      } catch {}
      return value;
    }

    function normalizeExamQaIp(raw) {
      const text = String(raw || "").trim();
      if (!text || text.length > 64) return "";
      if (/^[0-9a-f:.]+$/i.test(text) || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(text))
        return text;
      return "";
    }

    function getStoredExamQaClientIp() {
      let gmValue = "";
      try {
        if (typeof GM_getValue === "function") {
          gmValue = normalizeExamQaIp(GM_getValue(EXAM_QA_IP_STORAGE_KEY, ""));
        }
      } catch {}
      let localValue = "";
      try {
        localValue = normalizeExamQaIp(
          localStorage.getItem(EXAM_QA_IP_STORAGE_KEY) || "",
        );
      } catch {}
      const value = gmValue || localValue;
      if (value) examQaClientIpCache = value;
      return value;
    }

    function setStoredExamQaClientIp(ip) {
      const value = normalizeExamQaIp(ip);
      if (value) examQaClientIpCache = value;
      try {
        if (typeof GM_setValue === "function") {
          GM_setValue(EXAM_QA_IP_STORAGE_KEY, value);
        }
      } catch {}
      try {
        if (value) localStorage.setItem(EXAM_QA_IP_STORAGE_KEY, value);
        else localStorage.removeItem(EXAM_QA_IP_STORAGE_KEY);
      } catch {}
      return value;
    }

    async function getExamQaUploadIp() {
      if (examQaClientIpCache) return examQaClientIpCache;
      const cached = getStoredExamQaClientIp();
      if (cached) return cached;
      if (examQaClientIpPromise) return examQaClientIpPromise;
      examQaClientIpPromise = (async () => {
        try {
          if (typeof fetch !== "function") return "";
          const res = await fetch("https://api.ipify.org?format=json", {
            cache: "no-store",
            credentials: "omit",
          });
          const json = await res.json();
          return setStoredExamQaClientIp(json && json.ip);
        } catch {
          return "";
        } finally {
          examQaClientIpPromise = null;
        }
      })();
      return examQaClientIpPromise;
    }

    function normalizeExamQuestionType(raw) {
      const text = String(raw || "").replace(/\s+/g, "");
      if (!text) return "";
      if (text.includes("不定项")) return "不定项选择题";
      if (text.includes("多选")) return "多选题";
      if (text.includes("单选")) return "单选题";
      if (text.includes("判断")) return "判断题";
      if (text.includes("填空")) return "填空题";
      if (text.includes("简答")) return "简答题";
      return "";
    }

    function getCurrentExamQuestionType() {
      const selectors = [
        ".questionContent .questionTitle",
        ".questionTitle",
        ".topic-title",
        ".title-box",
      ];
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          const t = normalizeExamQuestionType(el && el.textContent);
          if (t) return t;
        }
      }
      return "";
    }

    function getCurrentExamQuestionStem() {
      const selectors = [
        ".questionContent .centent-pre .preStyle",
        ".questionContent .questionTitle .letterSortNum",
        ".questionContent .questionTitle",
        ".questionContent .centent-pre",
        ".questionContent",
      ];
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          const raw = stripHtml(el && el.textContent)
            .replace(/\s+/g, " ")
            .trim();
          if (!raw || raw.length < 6) continue;
          return raw;
        }
      }
      return "";
    }

    function normalizeExamStemForApiQuery(raw) {
      const text = stripHtml(raw);
      return String(text || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\u00A0\u1680\u180E\u2000-\u200D\u202F\u205F\u3000]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalizeExamStemKeepSpaces(raw) {
      const text = stripHtml(raw);
      return String(text || "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\u00A0\u1680\u180E\u2000-\u200D\u202F\u205F\u3000]/g, " ")
        .replace(/[\r\n\t\f\v]+/g, " ")
        .trim();
    }

    function toFullWidthPunct(raw) {
      return String(raw || "")
        .replace(/\(/g, "（")
        .replace(/\)/g, "）")
        .replace(/,/g, "，")
        .replace(/;/g, "；")
        .replace(/:/g, "：")
        .replace(/!/g, "！")
        .replace(/\?/g, "？");
    }

    function extractStemPrefixBeforeBlank(raw) {
      const text = normalizeExamStemForApiQuery(raw);
      if (!text || !/\s/.test(text)) return "";
      const firstPart = String(text.split(/\s+/)[0] || "").trim();
      if (firstPart.length >= 6) return firstPart;
      return "";
    }

    function normalizeExamStemForSearch(raw) {
      const text = stripHtml(raw);
      return String(text || "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\u00A0\u1680\u180E\u2000-\u200D\u202F\u205F\u3000]/g, " ")
        .replace(/\s+/g, "")
        .trim();
    }

    function getCurrentExamOptionItems() {
      const selectors = [
        ".questionContent .el-checkbox-group > label.el-checkbox",
        ".questionContent .el-radio-group > label.el-radio",
        ".questionContent ul.radio-view > li",
        ".questionContent ul.checkbox-view > li",
        ".questionContent .topic-list li",
        ".questionContent .option-list li",
        ".questionContent .answer-list li",
        ".questionContent .el-radio",
        ".questionContent .el-checkbox",
        ".option-list li",
        ".topic-list li",
      ];
      const seen = new Set();
      const out = [];
      for (const selector of selectors) {
        for (const node of Array.from(document.querySelectorAll(selector))) {
          if (!node || seen.has(node)) continue;
          seen.add(node);
          const optionRoot =
            (node.closest &&
              node.closest("label.el-checkbox, label.el-radio")) ||
            node;
          const rawLetter = stripHtml(
            optionRoot.querySelector && optionRoot.querySelector(".letterSort")
              ? optionRoot.querySelector(".letterSort").textContent
              : "",
          );
          const text = stripHtml(optionRoot.textContent)
            .replace(/\s+/g, " ")
            .trim();
          if (!text) continue;
          const m =
            (rawLetter && rawLetter.match(/[A-H]/i)) ||
            text.match(/^([A-H])[\.\、\s\)]?/i);
          out.push({
            node: optionRoot,
            label: m ? String(m[1] || "").toUpperCase() : "",
            text,
          });
        }
      }
      for (let i = 0; i < out.length; i++) {
        if (!out[i].label) out[i].label = String.fromCharCode(65 + i);
      }
      return out;
    }

    function getCurrentExamQuestionNo() {
      const candidates = [
        ".questionContent .questionTitle .letterSortNum",
        ".questionTitle .letterSortNum",
        ".letterSortNum",
      ];
      for (const selector of candidates) {
        const el = document.querySelector(selector);
        const txt = stripHtml(el && el.textContent);
        const m = String(txt || "").match(/(\d+)/);
        if (m) return Number(m[1]);
      }
      return 0;
    }

    function findExamQuestionTreeItemByNo(questionNo) {
      const targetNo = Number(questionNo || 0);
      if (!Number.isFinite(targetNo) || targetNo <= 0) return null;
      const selectors = [
        ".sheetR .font-sec-style-node",
        ".ETC-right .font-sec-style-node",
        ".el-tree .font-sec-style-node",
      ];
      for (const selector of selectors) {
        const list = Array.from(document.querySelectorAll(selector));
        for (const el of list) {
          const n = Number(
            String(stripHtml(el && el.textContent) || "").trim(),
          );
          if (!Number.isFinite(n) || n !== targetNo) continue;
          const root =
            (el.closest &&
              (el.closest(".el-tree-node__content") ||
                el.closest(".custom-tree-answer-normal") ||
                el.closest(".el-tree-node"))) ||
            el;
          if (root) return root;
        }
      }
      return null;
    }

    function clickExamTreeQuestionNo(questionNo) {
      const target = findExamQuestionTreeItemByNo(questionNo);
      if (!target) return false;
      const fire = (type) => {
        try {
          target.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
        } catch {}
      };
      fire("mouseover");
      fire("mousedown");
      fire("mouseup");
      fire("click");
      try {
        target.click();
      } catch {}
      return true;
    }

    async function ensureStartFromFirstExamQuestion() {
      const currentNo = Number(getCurrentExamQuestionNo() || 0);
      if (currentNo <= 0 || currentNo === 1) return true;
      setExamAutomationRuntimeStatus(
        `自动化启动前定位到第1题（当前第${currentNo}题）...`,
      );
      if (!clickExamTreeQuestionNo(1)) return false;
      const startedAt = Date.now();
      while (Date.now() - startedAt < 5000) {
        await sleep(150);
        if (Number(getCurrentExamQuestionNo() || 0) === 1) return true;
      }
      return Number(getCurrentExamQuestionNo() || 0) === 1;
    }

    function getCurrentPaperStatsFromDom() {
      const numNodes = Array.from(
        document.querySelectorAll(".sheetR .font-sec-style-node"),
      );
      const total = numNodes.length;
      if (!total) return { total: 0, answered: 0 };
      let answered = 0;
      for (const node of numNodes) {
        const marker =
          node.closest && node.closest(".custom-tree-answer-normal");
        if (marker && /\banswer\b/.test(String(marker.className || ""))) {
          answered += 1;
        }
      }
      return { total, answered };
    }

    function getCurrentPaperRecordedProgress() {
      const stats = getCurrentPaperStatsFromDom();
      const total = Math.max(0, Number((stats && stats.total) || 0));
      const done = Math.max(
        0,
        getRecordedAnsweredQuestionNosForCurrentPaper().size,
      );
      return { done, total };
    }

    function getCurrentPaperRecordedProgressText() {
      const progress = getCurrentPaperRecordedProgress();
      const done = Math.max(0, Number((progress && progress.done) || 0));
      const total = Math.max(0, Number((progress && progress.total) || 0));
      return `${done}/${total}`;
    }

    function getExamOverallProgressTextFromRows() {
      const allRows = Array.isArray(examState && examState.rows)
        ? examState.rows
        : [];
      const validRows = allRows.filter((row) => {
        if (!row) return false;
        const pointId = String(row.pointId || "").trim();
        if (!pointId) return false;
        const status = String(row.status || "").trim();
        return status !== "error" && status !== "no-question";
      });
      const total = validRows.length;
      if (total <= 0) return "";
      const done = validRows.filter((row) => {
        return isExamMasteryReachedByMode(row && row.masteryScore, autoMode);
      }).length;
      return `${done}/${total}`;
    }

    function getCurrentQuestionPositionText() {
      const currentNo = Math.max(0, Number(getCurrentExamQuestionNo() || 0));
      const stats = getCurrentPaperStatsFromDom();
      const totalNo = Math.max(0, Number((stats && stats.total) || 0));
      if (currentNo > 0 && totalNo > 0) return `${currentNo}/${totalNo}`;
      return "";
    }

    function refreshExamAutoControlStateText() {
      const examActive = autoRunning && isExamAutomationMode(autoMode);
      if (!examActive) {
        examAutoControlState.textContent = "自动化状态: 未开启";
        return;
      }
      const ctx = getExamContext();
      const routeType = String((ctx && ctx.routeType) || "");
      if (routeType === "point") {
        const overallText = getExamOverallProgressTextFromRows();
        if (overallText) {
          examAutoControlState.textContent = `自动化状态: 运行中 (总进度 ${overallText})`;
          return;
        }
      }
      examAutoControlState.textContent = `自动化状态: 运行中 (${getCurrentPaperRecordedProgressText()})`;
    }

    function getRecordedAnsweredQuestionNosForCurrentPaper() {
      const paperKey = getCurrentExamPaperKey();
      if (paperKey !== examAnsweredMapPaperKey) {
        examAnsweredMapPaperKey = paperKey;
        examAnsweredMap.clear();
        return new Set();
      }
      const answeredNos = new Set();
      for (const item of examAnsweredMap.values()) {
        const no = Number((item && item.questionNo) || 0);
        if (no <= 0) continue;
        const details = Array.isArray(item && item.selectedOptionDetails)
          ? item.selectedOptionDetails
          : [];
        const selectedText = String(
          (item && (item.selectedText || item.sourceAnswer)) || "",
        ).trim();
        const hasAnswer = details.some((d) => d && d.label) || !!selectedText;
        if (hasAnswer) answeredNos.add(no);
      }
      return answeredNos;
    }

    function isCurrentPaperAnswerRecordComplete() {
      const stats = getCurrentPaperStatsFromDom();
      const total = Number((stats && stats.total) || 0);
      if (total <= 0) return false;
      const answeredNos = getRecordedAnsweredQuestionNosForCurrentPaper();
      return answeredNos.size >= total;
    }

    function normalizeOptionNode(node) {
      if (!node) return null;
      return (
        (node.closest && node.closest("label.el-checkbox, label.el-radio")) ||
        node
      );
    }

    function buildExamQuestionSnapshot() {
      const stem = getCurrentExamQuestionStem();
      const type = getCurrentExamQuestionType();
      const options = getCurrentExamOptionItems();
      const questionNo = getCurrentExamQuestionNo();
      return { stem, type, options, questionNo };
    }

    function getQuestionField(item) {
      if (!item || typeof item !== "object") return "";
      const keys = [
        "question",
        "stem",
        "title",
        "questionTitle",
        "questionStem",
        "content",
      ];
      for (const key of keys) {
        const v = stripHtml(item[key]);
        if (v) return v;
      }
      return "";
    }

    function getQuestionTypeField(item) {
      if (!item || typeof item !== "object") return "";
      const keys = ["type", "questionType", "typeName", "questionTypeName"];
      for (const key of keys) {
        const v = normalizeExamQuestionType(item[key]);
        if (v) return v;
      }
      return "";
    }

    function getQuestionAnswerField(item) {
      if (!item || typeof item !== "object") return "";
      const keys = [
        "answer",
        "answers",
        "correctAnswer",
        "standardAnswer",
        "rightAnswer",
        "result",
        "answerText",
      ];
      for (const key of keys) {
        const v = item[key];
        if (Array.isArray(v)) {
          const joined = v
            .map((x) => stripHtml(x))
            .filter(Boolean)
            .join(" ");
          if (joined) return joined;
        } else if (v && typeof v === "object") {
          const nested = stripHtml(v.content || v.text || v.value || "");
          if (nested) return nested;
        } else {
          const s = stripHtml(v);
          if (s) return s;
        }
      }
      return "";
    }

    function splitAnswerParts(answerText) {
      return String(answerText || "")
        .split(/[，,;；|、\/\s]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    }

    function normalizeTextForMatch(text) {
      return String(stripHtml(text) || "")
        .toUpperCase()
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[“”"‘’']/g, "")
        .replace(/[，,。\.、；;：:！？!?（）()\[\]【】《》<>\-—_]/g, "")
        .replace(/\s+/g, "")
        .trim();
    }

    function normalizeStemWithBlankSignature(text) {
      const normalized = normalizeExamStemKeepSpaces(text)
        .toUpperCase()
        .replace(/[“”"‘’']/g, "")
        .replace(/[_＿﹍▁□◻◽◾•·]+/g, "¤")
        .replace(/([A-Z0-9\u4E00-\u9FFF])\s+([A-Z0-9\u4E00-\u9FFF])/g, "$1¤$2")
        .replace(/[，,。\.、；;：:！？!?（）()\[\]【】《》<>\-—_]/g, "")
        .replace(/\s+/g, "")
        .replace(/¤+/g, "¤")
        .trim();
      return normalized;
    }

    function collapseInlineBlankGaps(text) {
      return normalizeExamStemKeepSpaces(text)
        .replace(
          /([A-Za-z0-9\u4E00-\u9FFF])\s+([A-Za-z0-9\u4E00-\u9FFF])/g,
          "$1$2",
        )
        .replace(/\s+/g, " ")
        .trim();
    }

    function getServerSimilarityRatio(item) {
      if (!item || typeof item !== "object") return 0;
      const keys = ["similarity", "score", "matchScore", "sim", "match_rate"];
      for (const key of keys) {
        const n = Number(item[key]);
        if (!Number.isFinite(n) || n < 0) continue;
        if (n <= 1) return n;
        if (n <= 100) return n / 100;
      }
      return 0;
    }

    function buildBigrams(text) {
      const out = [];
      const source = String(text || "");
      if (!source) return out;
      if (source.length <= 1) return [source];
      for (let i = 0; i < source.length - 1; i++) {
        out.push(source.slice(i, i + 2));
      }
      return out;
    }

    function calcDiceSimilarity(a, b) {
      const aa = buildBigrams(a);
      const bb = buildBigrams(b);
      if (!aa.length || !bb.length) return 0;
      const counts = new Map();
      for (const token of aa) {
        counts.set(token, (counts.get(token) || 0) + 1);
      }
      let overlap = 0;
      for (const token of bb) {
        const c = counts.get(token) || 0;
        if (c <= 0) continue;
        overlap += 1;
        counts.set(token, c - 1);
      }
      return (2 * overlap) / (aa.length + bb.length);
    }

    function calcCharOverlapSimilarity(a, b) {
      const s1 = String(a || "");
      const s2 = String(b || "");
      if (!s1 || !s2) return 0;
      const counts = new Map();
      for (const ch of s1) {
        counts.set(ch, (counts.get(ch) || 0) + 1);
      }
      let overlap = 0;
      for (const ch of s2) {
        const c = counts.get(ch) || 0;
        if (c <= 0) continue;
        overlap += 1;
        counts.set(ch, c - 1);
      }
      return overlap / Math.max(s1.length, s2.length);
    }

    function calcStemSimilarity(a, b) {
      const s1 = normalizeTextForMatch(a);
      const s2 = normalizeTextForMatch(b);
      if (!s1 || !s2) return 0;
      if (s1 === s2) return 1;
      const minLen = Math.min(s1.length, s2.length);
      const maxLen = Math.max(s1.length, s2.length);
      const containRatio =
        s1.includes(s2) || s2.includes(s1) ? minLen / maxLen : 0;
      const dice = calcDiceSimilarity(s1, s2);
      const overlap = calcCharOverlapSimilarity(s1, s2);
      const mix = dice * 0.72 + overlap * 0.28;
      return Math.max(containRatio, mix);
    }

    function parseAnswerLabels(answerText) {
      const labels = new Set();
      const upper = String(answerText || "").toUpperCase();
      for (const c of upper.match(/[A-H]/g) || []) labels.add(c);
      return labels;
    }

    function buildOptionMatchScore(
      optionItem,
      labelSet,
      answerParts,
      fullAnswer,
    ) {
      const label = String(
        (optionItem && optionItem.label) || "",
      ).toUpperCase();
      const optionNorm = normalizeTextForMatch(optionItem && optionItem.text);
      const fullNorm = normalizeTextForMatch(fullAnswer);
      let score = 0;

      if (label && labelSet.has(label)) score += 100;
      if (!optionNorm) return score;

      for (const part of answerParts) {
        const pn = normalizeTextForMatch(part);
        if (!pn || /^[A-H]+$/.test(pn)) continue;
        if (optionNorm === pn) {
          score += 80;
          continue;
        }
        if (optionNorm.includes(pn)) {
          score += 40 + Math.min(20, pn.length);
          continue;
        }
        if (pn.length >= 4 && pn.includes(optionNorm)) {
          score += 20;
        }
      }

      if (fullNorm && fullNorm.length >= 6 && optionNorm.includes(fullNorm)) {
        score += 15;
      }
      return score;
    }

    function isOptionSelected(node) {
      const root = normalizeOptionNode(node);
      if (!root) return false;
      const className = String(root.className || "");
      if (/\bis-checked\b/i.test(className)) return true;
      const inputWrap =
        root.querySelector &&
        root.querySelector(".el-checkbox__input, .el-radio__input");
      if (
        inputWrap &&
        /\bis-checked\b/i.test(String(inputWrap.className || ""))
      )
        return true;
      const input =
        root.querySelector &&
        root.querySelector('input[type="radio"],input[type="checkbox"]');
      return !!(input && input.checked);
    }

    function getOptionClickTargets(node) {
      const root = normalizeOptionNode(node);
      if (!root) return [];
      const targets = [];
      const push = (el) => {
        if (!el) return;
        if (!targets.includes(el)) targets.push(el);
      };
      push(
        root.querySelector &&
          root.querySelector(
            "input.el-checkbox__original, input.el-radio__original",
          ),
      );
      push(
        root.querySelector &&
          root.querySelector(".el-checkbox__inner, .el-radio__inner"),
      );
      push(root);
      return targets;
    }

    function clickOptionNode(node) {
      const root = normalizeOptionNode(node);
      if (!root) return false;
      if (isOptionSelected(root)) return true;
      const targets = getOptionClickTargets(root);
      for (const target of targets) {
        if (!target) continue;
        if (
          target.matches &&
          target.matches('input[type="checkbox"], input[type="radio"]')
        ) {
          try {
            target.focus();
            target.click();
            target.dispatchEvent(new Event("input", { bubbles: true }));
            target.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {}
          if (isOptionSelected(root)) return true;
          continue;
        }
        triggerElementClick(target);
        if (isOptionSelected(root)) return true;
      }
      return isOptionSelected(root);
    }

    function resolveLiveOptionNode(optionHint) {
      if (!optionHint) return null;
      const options = getCurrentExamOptionItems();
      const label = String(optionHint.label || "").toUpperCase();
      const textNorm = normalizeTextForMatch(optionHint.text);
      let matched = null;
      if (label) {
        matched = options.find(
          (x) => String(x.label || "").toUpperCase() === label,
        );
      }
      if (!matched && textNorm) {
        matched = options.find(
          (x) => normalizeTextForMatch(x.text) === textNorm,
        );
      }
      if (!matched && textNorm) {
        matched = options.find(
          (x) =>
            normalizeTextForMatch(x.text).includes(textNorm) ||
            textNorm.includes(normalizeTextForMatch(x.text)),
        );
      }
      return (matched && matched.node) || optionHint.node || null;
    }

    function fillInputAnswer(answerText) {
      const answer = String(answerText || "").trim();
      if (!answer) return 0;
      let count = 0;
      const inputs = Array.from(
        document.querySelectorAll(
          '.questionContent input[type="text"], .questionContent textarea',
        ),
      );
      for (const el of inputs) {
        if (!el || el.disabled || el.readOnly) continue;
        el.focus();
        el.value = answer;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        count += 1;
      }
      return count;
    }

    const EXAM_OPTION_CLICK_INTERVAL_MS = 220;
    const EXAM_AUTO_ANSWER_COOLDOWN_MS = 1200;
    const EXAM_QA_MISS_CACHE_TTL_MS = 1500;
    const EXAM_QA_USER_INFO_CACHE_TTL_MS = 10 * 60 * 1000;
    const EXAM_QA_USERNAME_BIND_TTL_MS = 10 * 60 * 1000;
    const EXAM_QA_AI_WAIT_MS = 12000;
    const EXAM_QA_AI_MAX_RETRIES = 3;
    const EXAM_QA_AI_RETRY_DELAY_MS = 1200;

    function normalizeExamQaUsername(value) {
      return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalizeExamQaTraceId(value) {
      const raw = String(value || "").trim();
      if (!raw) return "";
      return raw.split("_")[0].trim();
    }

    function pickExamQaTraceIdFromResponse(data, traceIdFromPayload = "") {
      const topLevelTraceId = normalizeExamQaTraceId(traceIdFromPayload);
      if (topLevelTraceId) return topLevelTraceId;
      const d = data && typeof data === "object" ? data : {};
      return normalizeExamQaTraceId(d.traceId);
    }

    function pickExamQaUsernameFromData(data, traceIdFromPayload = "") {
      const d = data && typeof data === "object" ? data : {};
      const studentCode = normalizeExamQaUsername(d.studentCode);
      const studentName = normalizeExamQaUsername(d.studentName);
      const traceId = normalizeExamQaTraceId(d.traceId || traceIdFromPayload);
      const username = studentName;
      if (!username) return null;
      return {
        username,
        studentCode,
        studentName,
        traceId,
      };
    }

    function isCompleteExamQaUserInfo(info) {
      return !!(info && info.username && info.studentName && info.traceId);
    }

    function readSharedExamQaUserInfoCache() {
      try {
        const raw = readSharedScriptCache(EXAM_QA_USER_INFO_SHARED_KEY);
        if (!raw) return null;
        const payload = safeJsonParse(raw);
        if (!payload || !isFreshByTs(payload.savedAt, EXAM_CACHE_TTL_USER))
          return null;
        return pickExamQaUsernameFromData(
          payload.data || payload,
          payload.traceId,
        );
      } catch {}
      return null;
    }

    function readContextExamQaUserInfoCache() {
      try {
        const ctx = getExamContext();
        if (!ctx || !ctx.courseId) return null;
        const payload = readExamCache(examCacheKey("user-info", ctx));
        if (!payload || !isFreshByTs(payload.savedAt, EXAM_CACHE_TTL_USER))
          return null;
        return pickExamQaUsernameFromData(
          payload.data || payload,
          payload.traceId,
        );
      } catch {}
      return null;
    }

    function loadCachedExamQaUserInfo() {
      return (
        readContextExamQaUserInfoCache() || readSharedExamQaUserInfoCache()
      );
    }

    function cacheExamQaUserInfo(data, source = "", traceId = "") {
      const info = pickExamQaUsernameFromData(data, traceId);
      if (!info || !info.username) return null;
      const ctx = getExamContext();
      const payload = {
        ...info,
        source: String(source || ""),
        traceId: String(info.traceId || ""),
        examTestId: String((ctx && ctx.examTestId) || ""),
        paperId: String((ctx && ctx.paperId) || ""),
      };
      try {
        writeSharedScriptCache(
          EXAM_QA_USER_INFO_SHARED_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            data: payload,
          }),
        );
      } catch {}
      try {
        if (ctx && ctx.courseId) {
          writeExamCache(examCacheKey("user-info", ctx), payload);
        }
      } catch {}
      examQaUserInfoCache = {
        ...info,
        ts: Date.now(),
      };
      return info;
    }

    function readCapturedExamUserInfo() {
      try {
        const ctx = getExamContext();
        const currentExamTestId = String((ctx && ctx.examTestId) || "").trim();
        const currentPaperId = String((ctx && ctx.paperId) || "").trim();
        let latestMatched = null;
        for (let i = CAPTURED_TRAFFIC.length - 1; i >= 0; i -= 1) {
          const row = CAPTURED_TRAFFIC[i];
          const url = String((row && row.url) || "");
          if (!url.includes("/gateway/t/v1/exam/user/getExamTestUserInfo"))
            continue;
          const json = row && row.responseJson;
          if (!json || !isSuccessResponse(json)) continue;
          const responseExamTestId = String(
            (json && json.data && json.data.examTestId) || "",
          ).trim();
          const responsePaperId = String(
            (json &&
              json.data &&
              (json.data.examPaperId || json.data.paperId)) ||
              "",
          ).trim();
          const picked = pickExamQaUsernameFromData(json.data, json.traceId);
          if (!isCompleteExamQaUserInfo(picked)) continue;
          if (
            (currentExamTestId &&
              responseExamTestId &&
              responseExamTestId === currentExamTestId) ||
            (currentPaperId &&
              responsePaperId &&
              responsePaperId === currentPaperId)
          ) {
            return picked;
          }
          if (!latestMatched) latestMatched = picked;
        }
        if (latestMatched) return latestMatched;
      } catch {}
      try {
        const ctx = getExamContext();
        const currentExamTestId = String((ctx && ctx.examTestId) || "").trim();
        const currentPaperId = String((ctx && ctx.paperId) || "").trim();
        let latestMatched = null;
        for (let i = CAPTURED_RESPONSES.length - 1; i >= 0; i -= 1) {
          const row = CAPTURED_RESPONSES[i];
          const url = String((row && row.url) || "");
          if (!url.includes("/gateway/t/v1/exam/user/getExamTestUserInfo"))
            continue;
          const json = row && row.json;
          if (!json || !isSuccessResponse(json)) continue;
          const responseExamTestId = String(
            (json && json.data && json.data.examTestId) || "",
          ).trim();
          const responsePaperId = String(
            (json &&
              json.data &&
              (json.data.examPaperId || json.data.paperId)) ||
              "",
          ).trim();
          const picked = pickExamQaUsernameFromData(json.data, json.traceId);
          if (!isCompleteExamQaUserInfo(picked)) continue;
          if (
            (currentExamTestId &&
              responseExamTestId &&
              responseExamTestId === currentExamTestId) ||
            (currentPaperId &&
              responsePaperId &&
              responsePaperId === currentPaperId)
          ) {
            return picked;
          }
          if (!latestMatched) latestMatched = picked;
        }
        if (latestMatched) return latestMatched;
      } catch {}
      return null;
    }

    function readCapturedExamSheetTraceId() {
      try {
        const ctx = getExamContext();
        const currentExamTestId = String((ctx && ctx.examTestId) || "").trim();
        const currentPaperId = String((ctx && ctx.paperId) || "").trim();
        let latestMatched = "";
        for (let i = CAPTURED_TRAFFIC.length - 1; i >= 0; i -= 1) {
          const row = CAPTURED_TRAFFIC[i];
          const url = String((row && row.url) || "");
          if (!url.includes("/gateway/t/v1/exam/user/getExamSheetInfo"))
            continue;
          const json = row && row.responseJson;
          if (!json || !isSuccessResponse(json)) continue;
          const responseExamTestId = String(
            (row && row.requestBody && row.requestBody.examTestId) || "",
          ).trim();
          const responsePaperId = String(
            (row && row.requestBody && row.requestBody.examPaperId) || "",
          ).trim();
          const traceId = pickExamQaTraceIdFromResponse(
            json.data,
            json.traceId,
          );
          if (!traceId) continue;
          if (
            (currentExamTestId &&
              responseExamTestId &&
              responseExamTestId === currentExamTestId) ||
            (currentPaperId &&
              responsePaperId &&
              responsePaperId === currentPaperId)
          ) {
            return traceId;
          }
          if (!latestMatched) latestMatched = traceId;
        }
        if (latestMatched) return latestMatched;
      } catch {}
      try {
        let latestMatched = "";
        for (let i = CAPTURED_RESPONSES.length - 1; i >= 0; i -= 1) {
          const row = CAPTURED_RESPONSES[i];
          const url = String((row && row.url) || "");
          if (!url.includes("/gateway/t/v1/exam/user/getExamSheetInfo"))
            continue;
          const json = row && row.json;
          if (!json || !isSuccessResponse(json)) continue;
          const traceId = pickExamQaTraceIdFromResponse(
            json.data,
            json.traceId,
          );
          if (!traceId) continue;
          return traceId;
        }
        if (latestMatched) return latestMatched;
      } catch {}
      return "";
    }

    function findObservedExamUserInfoRequestUrl() {
      try {
        for (let i = CAPTURED_TRAFFIC.length - 1; i >= 0; i -= 1) {
          const row = CAPTURED_TRAFFIC[i];
          const url = String((row && row.url) || "").trim();
          if (
            url &&
            url.includes("/gateway/t/v1/exam/user/getExamTestUserInfo")
          ) {
            return url;
          }
        }
      } catch {}
      try {
        const entries = performance.getEntriesByType("resource") || [];
        for (let i = entries.length - 1; i >= 0; i -= 1) {
          const name = String((entries[i] && entries[i].name) || "").trim();
          if (
            name &&
            name.includes("/gateway/t/v1/exam/user/getExamTestUserInfo")
          ) {
            return name;
          }
        }
      } catch {}
      return "";
    }

    async function fetchExamUserInfoByObservedRequestUrl() {
      try {
        const reqUrl = findObservedExamUserInfoRequestUrl();
        if (!reqUrl) return null;
        const res = await fetch(reqUrl, {
          method: "GET",
          credentials: "include",
        });
        const text = await res.text();
        const json = safeJsonParse(text);
        if (!res.ok || !json || !isSuccessResponse(json)) return null;
        recordCaptured(reqUrl, text);
        recordTraffic({
          url: reqUrl,
          method: "GET",
          requestBody: "",
          status: res.status,
          responseJson: json,
        });
        return cacheExamQaUserInfo(
          json.data,
          "observed-request",
          json && json.traceId,
        );
      } catch {}
      return null;
    }

    async function fetchExamUserInfoByCurrentContext() {
      try {
        const ctx = getExamContext();
        const examTestId = String((ctx && ctx.examTestId) || "").trim();
        const examPaperId = String((ctx && ctx.paperId) || "").trim();
        if (!examTestId || !examPaperId) return null;
        const payload = { examTestId, examPaperId };
        const res = await getExamEncryptedJson(
          API_EXAM_USER_INFO,
          payload,
          [3, 6],
        );
        const json = res && res.json;
        if (!json || !isSuccessResponse(json)) return null;
        return cacheExamQaUserInfo(json.data, "current-context", json.traceId);
      } catch {}
      return null;
    }

    async function fetchExamTraceIdByCurrentContext() {
      try {
        const ctx = getExamContext();
        const examTestId = String((ctx && ctx.examTestId) || "").trim();
        const examPaperId = String((ctx && ctx.paperId) || "").trim();
        const courseId = String((ctx && ctx.courseId) || "").trim();
        if (!examTestId || !examPaperId || !courseId) return "";
        const payload = { examTestId, examPaperId, courseId };
        let res = await getExamEncryptedJson(
          API_EXAM_SHEET_INFO,
          payload,
          [3, 6],
        );
        if (!res.json || !isSuccessResponse(res.json)) {
          res = await postExamJson(API_EXAM_SHEET_INFO, payload, false);
        }
        if (!res.json || !isSuccessResponse(res.json)) return "";
        return pickExamQaTraceIdFromResponse(res.json.data, res.json.traceId);
      } catch {}
      return "";
    }

    async function getExamQaUserInfo() {
      if (
        isCompleteExamQaUserInfo(examQaUserInfoCache) &&
        Date.now() - Number(examQaUserInfoCache.ts || 0) <
          EXAM_QA_USER_INFO_CACHE_TTL_MS
      ) {
        return examQaUserInfoCache;
      }
      let info = loadCachedExamQaUserInfo();
      if (!isCompleteExamQaUserInfo(info)) {
        info = null;
      }
      if (!info) {
        info = readCapturedExamUserInfo();
      }
      if (!info) {
        info = await fetchExamUserInfoByObservedRequestUrl();
      }
      if (!info) {
        info = await fetchExamUserInfoByCurrentContext();
      }
      if (!isCompleteExamQaUserInfo(info)) {
        throw new Error(
          "无法从 getExamTestUserInfo 请求响应中获取考试身份（studentName/traceId）",
        );
      }
      let traceId = readCapturedExamSheetTraceId();
      if (!traceId) {
        traceId = await fetchExamTraceIdByCurrentContext();
      }
      if (traceId) {
        info = {
          ...info,
          traceId,
        };
      }
      return cacheExamQaUserInfo(info, "resolved") || info;
    }

    function postExamQaUsernameBind(token, userInfo, clientIp = "") {
      return new Promise((resolve, reject) => {
        const candidates = getExamQaBaseCandidates();
        const ip = normalizeExamQaIp(clientIp);
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Query-Token": String(token || ""),
          "X-Query-Username": String((userInfo && userInfo.username) || ""),
          "X-Query-Student-Name": String(
            (userInfo && userInfo.studentName) || "",
          ),
          "X-Query-Trace-Id": String((userInfo && userInfo.traceId) || ""),
        };
        const cleanStudentCode = String(
          (userInfo && userInfo.studentCode) || "",
        ).trim();
        if (cleanStudentCode)
          headers["X-Query-Student-Code"] = cleanStudentCode;
        if (ip) {
          headers["X-Query-Client-IP"] = ip;
          headers["X-Client-IP"] = ip;
        }
        const body = {
          token: String(token || ""),
          username: String((userInfo && userInfo.username) || ""),
          studentName: String((userInfo && userInfo.studentName) || ""),
          traceId: String((userInfo && userInfo.traceId) || ""),
        };
        if (cleanStudentCode) body.studentCode = cleanStudentCode;
        if (ip) {
          body.clientIp = ip;
          body.currentIp = ip;
          body.ip = ip;
        }
        let idx = 0;
        let lastErr = null;
        const tryNext = () => {
          if (idx >= candidates.length) {
            reject(lastErr || new Error("绑定用户名网络错误"));
            return;
          }
          const base = candidates[idx];
          idx += 1;
          const url = new URL(
            "/api/query-token/username",
            `${base}/`,
          ).toString();
          requestExamQa("POST", url, {
            headers,
            body: JSON.stringify(body),
            timeoutMs: 12000,
            errorLabel: "绑定用户名",
          })
            .then((res) => {
              const status = Number((res && res.status) || 0);
              const json = res && res.json;
              if (status >= 200 && status < 300) {
                resolve(json || {});
                return;
              }
              const msg =
                (json && (json.message || json.msg || json.error)) ||
                `绑定用户名失败(${status || "network"})`;
              lastErr = new Error(`[${base}] ${msg}`);
              if (isExamQaRetryableStatus(status) && idx < candidates.length) {
                console.warn(
                  "[题库查询] 用户名绑定响应异常，准备切换地址重试:",
                  { base, next: candidates[idx] || null, status, message: msg },
                );
                tryNext();
                return;
              }
              reject(lastErr);
            })
            .catch((err) => {
              lastErr = new Error(
                `[${base}] ${String((err && err.message) || err || "绑定用户名网络错误")}`,
              );
              console.warn("[题库查询] 用户名绑定网络失败，准备切换地址重试:", {
                base,
                next: candidates[idx] || null,
                message: String((err && err.message) || err || ""),
              });
              tryNext();
            });
        };
        tryNext();
      });
    }

    async function ensureExamQaUsernameBound(token, clientIp = "") {
      const cleanToken = String(token || "").trim();
      if (!cleanToken) throw new Error("未设置题库 Token");
      const userInfo = await getExamQaUserInfo();
      const bindKey = `${cleanToken}|${userInfo.username}`;
      if (
        bindKey === examQaUsernameBindKey &&
        Date.now() - examQaUsernameBindAt < EXAM_QA_USERNAME_BIND_TTL_MS
      ) {
        return userInfo;
      }
      if (
        examQaUsernameBindPromise &&
        examQaUsernameBindPromiseKey === bindKey
      ) {
        return examQaUsernameBindPromise;
      }
      examQaUsernameBindPromiseKey = bindKey;
      examQaUsernameBindPromise = (async () => {
        try {
          await postExamQaUsernameBind(cleanToken, userInfo, clientIp);
        } catch (err) {
          const msg = String((err && err.message) || err || "");
          if (!isExamQaIpValidationMessage(msg)) throw err;
          console.warn("[题库查询] 已忽略题库 IP 绑定校验:", msg);
        }
        examQaUsernameBindKey = bindKey;
        examQaUsernameBindAt = Date.now();
        return userInfo;
      })().finally(() => {
        examQaUsernameBindPromise = null;
        examQaUsernameBindPromiseKey = "";
      });
      return examQaUsernameBindPromise;
    }

    function buildExamPreviewUrlFromPointPage() {
      try {
        const url = new URL(location.href);
        const path = String(url.pathname || "");
        if (!/\/point\//.test(path)) return "";
        url.pathname = path.replace("/point/", "/examPreview/");
        return url.toString();
      } catch {
        return "";
      }
    }

    function setPendingSubmittedState(pointId, submittedAt = Date.now()) {
      const pid = String(pointId || "").trim();
      if (!pid) {
        pendingSubmittedPointId = "";
        pendingSubmittedAt = 0;
        saveExamPendingSubmittedState(null);
        return;
      }
      pendingSubmittedPointId = pid;
      pendingSubmittedAt = Number(submittedAt || Date.now()) || Date.now();
      saveExamPendingSubmittedState({
        pointId: pendingSubmittedPointId,
        submittedAt: pendingSubmittedAt,
      });
    }

    function getExamWrongSyncStateKey(ctx) {
      if (!ctx) return "";
      const courseId = String(ctx.courseId || "").trim();
      const nodeUid = String(ctx.nodeUid || "").trim();
      const classId = String(ctx.classId || "").trim();
      if (!courseId || !nodeUid || !classId) return "";
      return `zs-exam-wrong-sync:${courseId}:${nodeUid}:${classId}`;
    }

    function readExamWrongSyncState(syncKey) {
      const key = String(syncKey || "").trim();
      if (!key) return "";
      try {
        return String(
          sessionStorage.getItem(key) || localStorage.getItem(key) || "",
        ).trim();
      } catch {
        return "";
      }
    }

    function writeExamWrongSyncState(syncKey, value) {
      const key = String(syncKey || "").trim();
      if (!key) return;
      const next = String(value || "").trim();
      try {
        if (!next) {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
          return;
        }
        sessionStorage.setItem(key, next);
        localStorage.setItem(key, next);
      } catch {}
    }

    function readPointResultStats() {
      const blocks = Array.from(
        document.querySelectorAll(".line1-count-total"),
      );
      if (!blocks.length) return null;
      const parseNum = (text) => {
        const m = String(text || "").match(/\d+/);
        return m ? Number(m[0]) : 0;
      };
      let total = 0;
      let correct = 0;
      for (const block of blocks) {
        const title = String(
          block.querySelector(".line1-count-total-title")?.textContent || "",
        ).trim();
        const numText = String(
          block.querySelector(".line1-count-total-num")?.textContent || "",
        ).trim();
        const value = parseNum(numText);
        if (/总题数/.test(title)) total = value;
        if (/已答对/.test(title)) correct = value;
      }
      if (!total) return null;
      const safeCorrect = Math.max(0, Math.min(total, Number(correct || 0)));
      const incorrect = Math.max(0, total - safeCorrect);
      const accuracy = total > 0 ? Math.round((safeCorrect / total) * 100) : 0;
      return { total, correct: safeCorrect, incorrect, accuracy };
    }

    function formatPointResultStatsText(stats) {
      if (
        !stats ||
        !Number.isFinite(Number(stats.total)) ||
        Number(stats.total) <= 0
      )
        return "";
      const total = Math.max(0, Number(stats.total || 0));
      const correct = Math.max(0, Math.min(total, Number(stats.correct || 0)));
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      return `答对率 ${accuracy}%（已答对 ${correct}/${total}）`;
    }

    function isExamResultAllCorrect(stats) {
      if (
        !stats ||
        !Number.isFinite(Number(stats.total)) ||
        Number(stats.total) <= 0
      )
        return false;
      const total = Math.max(0, Number(stats.total || 0));
      const correct = Math.max(0, Math.min(total, Number(stats.correct || 0)));
      return total > 0 && correct >= total;
    }

    function readExamPreviewResultStats() {
      const card = document.querySelector(".answer-card");
      if (!card) return null;
      const green = card.querySelectorAll(".item.green").length;
      const red = card.querySelectorAll(".item.red").length;
      const total = green + red;
      if (total <= 0) return null;
      const correct = Math.max(0, Math.min(total, Number(green || 0)));
      const incorrect = Math.max(0, Number(red || 0));
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      return { total, correct, incorrect, accuracy };
    }

    function readCurrentExamResultStats() {
      const ctx = getExamContext();
      const routeType = String((ctx && ctx.routeType) || "");
      if (routeType === "point") return readPointResultStats();
      if (routeType === "examPreview") return readExamPreviewResultStats();
      return null;
    }

    async function waitForExamResultStats(timeoutMs = 12000, intervalMs = 400) {
      const start = Date.now();
      let latest = readCurrentExamResultStats();
      while (
        !latest &&
        Date.now() - start < Math.max(800, Number(timeoutMs || 0))
      ) {
        await sleep(Math.max(120, Number(intervalMs || 0)));
        latest = readCurrentExamResultStats();
      }
      return latest;
    }

    function tryReturnToPointFromStudentReview() {
      const ctx = getExamContext();
      if (String((ctx && ctx.routeType) || "") !== "studentReview")
        return false;
      const selectors = [
        ".close-btn",
        ".backup",
        ".backup-icon",
        ".go-back",
        ".back-btn",
      ];
      for (const selector of selectors) {
        const node = document.querySelector(selector);
        if (!node) continue;
        try {
          if (typeof node.click === "function") {
            node.click();
            return true;
          }
        } catch {}
      }
      return false;
    }

    function normalizeFeedbackAnswerByType(answerText, type, options = []) {
      const raw = String(answerText || "")
        .replace(/\s+/g, " ")
        .trim();
      if (!raw) return "";
      const normalizedType = normalizeExamQuestionType(type);
      if (normalizedType === "单选题" || normalizedType === "判断题") {
        const labels = Array.from(parseAnswerLabels(raw));
        if (labels.length) return labels[0];
      }
      if (normalizedType === "多选题") {
        const labels = Array.from(parseAnswerLabels(raw)).sort();
        if (labels.length) return labels.join("");
      }
      const optionList = Array.isArray(options) ? options : [];
      const matched = [];
      for (const opt of optionList) {
        const label = String((opt && opt.label) || "")
          .toUpperCase()
          .trim();
        const content = String((opt && opt.content) || "").trim();
        if (!label || !content) continue;
        if (raw.includes(content)) matched.push(label);
      }
      if (matched.length) {
        if (normalizedType === "单选题" || normalizedType === "判断题")
          return matched[0];
        return Array.from(new Set(matched)).sort().join("");
      }
      return raw.slice(0, 240);
    }

    function extractWrongQuestionsFromPreviewDom() {
      const norm = (text) =>
        stripHtml(String(text || ""))
          .replace(/\s+/g, " ")
          .trim();
      const parseOptionNode = (node) => {
        if (!node) return null;
        const labelWrap =
          node.querySelector(".el-checkbox__label, .el-radio__label") || node;
        const labelTextNode = Array.from(labelWrap.children || []).find((el) =>
          /^[A-H][.．、\s\u00A0]/i.test(norm(el.textContent || "")),
        );
        const labelText = norm(
          labelTextNode ? labelTextNode.textContent : labelWrap.textContent,
        );
        const labelMatch = labelText.match(/^([A-H])[.．、\)\s\u00A0]*/i);
        const label = String((labelMatch && labelMatch[1]) || "").toUpperCase();
        let content = "";
        const contentNode =
          labelWrap.querySelector(".preStyle, .inner-box") || labelWrap;
        content = norm(contentNode.textContent || "");
        if (label) {
          content = content
            .replace(new RegExp(`^${label}[.．、\\)\\s\\u00A0]*`, "i"), "")
            .trim();
        }
        if (!content && label) {
          content = labelText
            .replace(new RegExp(`^${label}[.．、\\)\\s\\u00A0]*`, "i"), "")
            .trim();
        }
        if (!label || !content) return null;
        return { label, content };
      };
      const toOptions = (card) => {
        const optionWrap = card.querySelector(
          ".el-checkbox-group, .el-radio-group",
        );
        if (!optionWrap) return [];
        const nodes = Array.from(
          optionWrap.querySelectorAll("label.el-checkbox, label.el-radio"),
        );
        const seen = new Set();
        const rows = [];
        for (const node of nodes) {
          const parsed = parseOptionNode(node);
          if (!parsed) continue;
          const key = `${parsed.label}:${parsed.content}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push(parsed);
        }
        return rows;
      };
      const pickStem = (card) => {
        const titleNode = card.querySelector(".quest-title");
        if (!titleNode) return "";
        const clone = titleNode.cloneNode(true);
        const indexNode = clone.querySelector(".option-index");
        if (indexNode) indexNode.remove();
        return extractNodeDisplayText(clone);
      };
      const pickRefAnswer = (card) => {
        const nodes = Array.from(
          card.querySelectorAll(".analysis > p, .analysis p"),
        );
        for (const node of nodes) {
          const text = norm((node && node.textContent) || "");
          const m = text.match(/(?:参考答案|正确答案)[:：]?\s*(.+)$/i);
          if (m && m[1]) return String(m[1]).trim();
        }
        return "";
      };
      const cards = Array.from(
        document.querySelectorAll(".exam-preview .left-box .question-item"),
      );
      const rows = [];
      for (const card of cards) {
        if (!card.querySelector(".question-result.error")) continue;
        const stem = pickStem(card);
        const options = toOptions(card);
        const type = normalizeExamQuestionType(
          norm(card.querySelector(".quest-type")?.textContent || "未知题型"),
        );
        const refRaw = pickRefAnswer(card);
        const answer = normalizeFeedbackAnswerByType(refRaw, type, options);
        if (!stem || !answer) continue;
        if (
          (type === "单选题" || type === "多选题" || type === "判断题") &&
          !options.length
        ) {
          console.warn(
            "[题库查询] 错题解析缺少选项，跳过回传:",
            stem.slice(0, 80),
          );
          continue;
        }
        rows.push({ stem, type, options, answer });
      }
      const dedup = new Map();
      for (const row of rows) {
        const key = `${normalizeExamStemForSearch(row.stem).slice(0, 240)}|${row.type}`;
        if (!key || dedup.has(key)) continue;
        dedup.set(key, row);
      }
      return Array.from(dedup.values());
    }

    function isWrongAnswerUploadPage() {
      try {
        if (!/examPreview|studentReviewTestOrExam/i.test(location.href))
          return false;
        return !!document.querySelector(
          ".exam-preview .left-box .question-item",
        );
      } catch {
        return false;
      }
    }

    function postExamScriptFeedback(token, userInfo, payload, clientIp = "") {
      const candidates = getExamQaBaseCandidates();
      const ip = normalizeExamQaIp(clientIp);
      const username = String((userInfo && userInfo.username) || "").trim();
      const studentName = String(
        (userInfo && userInfo.studentName) || "",
      ).trim();
      const studentCode = String(
        (userInfo && userInfo.studentCode) || "",
      ).trim();
      const traceId = String((userInfo && userInfo.traceId) || "").trim();
      const bodyText = JSON.stringify({
        stem: String((payload && payload.stem) || "").trim(),
        type: String((payload && payload.type) || "").trim(),
        options: Array.isArray(payload && payload.options)
          ? payload.options
          : [],
        answer: String((payload && payload.answer) || "").trim(),
        username: username || undefined,
        sourceName: "wrong-upload-test",
        message: "手动测试解析页错题回传",
        studentName: studentName || undefined,
        studentCode: studentCode || undefined,
        traceId: traceId || undefined,
        clientIp: ip || undefined,
        currentIp: ip || undefined,
        ip: ip || undefined,
      });
      return new Promise((resolve, reject) => {
        let idx = 0;
        let lastErr = null;
        const tryNext = () => {
          if (idx >= candidates.length) {
            reject(lastErr || new Error("错题回传网络错误"));
            return;
          }
          const base = candidates[idx];
          idx += 1;
          const urlObj = new URL("/api/questions/script-feedback", `${base}/`);
          urlObj.searchParams.set("token", String(token || ""));
          urlObj.searchParams.set("username", String(username || ""));
          if (studentName) urlObj.searchParams.set("studentName", studentName);
          if (studentCode) urlObj.searchParams.set("studentCode", studentCode);
          if (traceId) urlObj.searchParams.set("traceId", traceId);
          if (ip) urlObj.searchParams.set("ip", ip);
          const url = urlObj.toString();
          const headers = {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Query-Username": String(username || ""),
            "X-Query-Student-Name": String(studentName || ""),
            "X-Query-Trace-Id": String(traceId || ""),
          };
          if (studentCode) headers["X-Query-Student-Code"] = studentCode;
          if (ip) {
            headers["X-Query-Client-IP"] = ip;
            headers["X-Client-IP"] = ip;
          }
          requestExamQa("POST", url, {
            headers,
            body: bodyText,
            timeoutMs: 20000,
            errorLabel: "错题回传",
          })
            .then((res) => {
              const status = Number((res && res.status) || 0);
              const json = res && res.json;
              if (status >= 200 && status < 300) {
                resolve(json || {});
                return;
              }
              const msg =
                (json && (json.message || json.msg || json.error)) ||
                `错题回传失败(${status || "network"})`;
              lastErr = new Error(`[${base}] ${msg}`);
              if (isExamQaRetryableStatus(status) && idx < candidates.length) {
                tryNext();
                return;
              }
              reject(lastErr);
            })
            .catch((err) => {
              lastErr = new Error(
                `[${base}] ${String((err && err.message) || err || "错题回传网络错误")}`,
              );
              tryNext();
            });
        };
        tryNext();
      });
    }

    async function maybeHandleWrongAnswerSyncFlow() {
      if (examWrongSyncBusy) return;
      if (!(autoRunning && isExamAutomationMode(autoMode))) return;
      if (autoMode !== AUTO_MODE_EXAM_RETAKE) return;
      if (!getStoredExamQueryToken()) return;
      const ctx = getExamContext();
      if (!ctx || !ctx.routeType) return;
      const syncKey = getExamWrongSyncStateKey(ctx);
      if (ctx.routeType === "point") {
        const stats = readPointResultStats();
        if (!stats || !stats.total) return;
        if (stats.correct >= stats.total) {
          setExamAutomationRuntimeStatus(
            `答对率检查通过：${stats.correct}/${stats.total}（${stats.accuracy}%）`,
            { holdMs: 3200, force: true },
          );
          return;
        }
        setExamAutomationRuntimeStatus(
          `检测到答错（答对率 ${stats.accuracy}%：${stats.correct}/${stats.total}），准备进入作答记录与解析`,
          { holdMs: 3600, force: true },
        );
        writeExamWrongSyncState(syncKey, "pending");
        const now = Date.now();
        if (now - lastPreviewNavAt < 4000) return;
        lastPreviewNavAt = now;
        const link = document.querySelector(
          ".line1-count.ai-path .line1-count-link",
        );
        if (link && typeof link.click === "function") {
          link.click();
          return;
        }
        const previewUrl = buildExamPreviewUrlFromPointPage();
        if (previewUrl) {
          location.assign(previewUrl);
        }
        return;
      }
      if (!isWrongAnswerUploadPage()) return;
      if (readExamWrongSyncState(syncKey) === "done") return;

      examWrongSyncBusy = true;
      try {
        setExamAutomationRuntimeStatus("正在解析错题参考答案并回传题库...", {
          holdMs: 2600,
          force: true,
        });
        const token = getStoredExamQueryToken();
        const clientIp = await getExamQaUploadIp();
        let userInfo = null;
        try {
          userInfo = await ensureExamQaUsernameBound(token, clientIp);
        } catch (err) {
          const msg = String((err && err.message) || err || "未知错误");
          console.warn("[题库查询] 错题回传前用户名绑定失败:", msg);
          setExamAutomationRuntimeStatus(
            `暂时无法获取题库用户名，稍后重试回传: ${msg}`,
            { holdMs: 3200, force: true },
          );
          panelSetExamStatus(`错题回传等待用户名绑定: ${msg}`);
          return;
        }
        const wrongRows = extractWrongQuestionsFromPreviewDom();
        if (!wrongRows.length) {
          setExamAutomationRuntimeStatus(
            "解析页已打开，但尚未识别到可回传的参考答案，继续等待页面内容稳定...",
            { holdMs: 2600, force: true },
          );
          return;
        }
        setExamAutomationRuntimeStatus(
          `检测到 ${wrongRows.length} 道错题，开始回传参考答案...`,
          { holdMs: 2600, force: true },
        );
        let success = 0;
        let changedCount = 0;
        for (const row of wrongRows) {
          try {
            const result = await postExamScriptFeedback(
              token,
              userInfo,
              row,
              clientIp,
            );
            success += 1;
            const changed = !!(result && result.changed);
            const item = result && result.item;
            if (changed) changedCount += 1;
            setExamAutomationRuntimeStatus(
              `错题参考答案回传进度：${success}/${wrongRows.length}`,
              { holdMs: 2200, force: true },
            );
          } catch (err) {
            console.warn(
              "[题库查询] 错题回传失败:",
              String((err && err.message) || err),
            );
          }
        }
        if (success > 0) {
          setExamAutomationRuntimeStatus(
            `错题参考答案回传进度：${success}/${wrongRows.length}`,
            { holdMs: 2400, force: true },
          );
          panelSetExamStatus(
            `错题参考答案已回传：${success}/${wrongRows.length}，实际更新 ${changedCount} 题`,
          );
        }
        if (success === wrongRows.length) {
          writeExamWrongSyncState(syncKey, "done");
          setExamAutomationRuntimeStatus(
            "错题参考答案已全部回传，返回自动答题流程",
            { holdMs: 3600, force: true },
          );
        }
      } finally {
        examWrongSyncBusy = false;
      }
    }

    async function applyAnswerToCurrentQuestion(snapshot, answerText) {
      const normalizedType = normalizeExamQuestionType(
        snapshot && snapshot.type,
      );
      const answer = String(answerText || "").trim();
      if (!answer)
        return {
          ok: false,
          reason: "答案为空",
          selectedLabels: [],
          appliedAnswer: "",
        };

      if (normalizedType === "填空题" || normalizedType === "简答题") {
        const filled = fillInputAnswer(answer);
        if (filled > 0)
          return {
            ok: true,
            reason: `已填充 ${filled} 个输入框`,
            selectedLabels: [],
            appliedAnswer: answer,
          };
        return {
          ok: false,
          reason: "未找到可填写输入框",
          selectedLabels: [],
          appliedAnswer: "",
        };
      }

      const options = Array.isArray(snapshot && snapshot.options)
        ? snapshot.options
        : [];
      if (!options.length)
        return {
          ok: false,
          reason: "未识别到选项",
          selectedLabels: [],
          appliedAnswer: "",
        };

      const labelSet = parseAnswerLabels(answer);
      const answerParts = splitAnswerParts(answer);
      const scored = options.map((item) => ({
        item,
        score: buildOptionMatchScore(item, labelSet, answerParts, answer),
      }));
      scored.sort((a, b) => b.score - a.score);

      const selected = [];
      const pickAndClick = async (item) => {
        if (!item) return;
        const liveNode = resolveLiveOptionNode(item);
        if (!liveNode) return;
        const ok = isOptionSelected(liveNode) || clickOptionNode(liveNode);
        if (ok && isOptionSelected(liveNode)) {
          selected.push(item.label || "?");
        }
      };

      if (normalizedType === "单选题" || normalizedType === "判断题") {
        const best = scored[0];
        if (!best || best.score <= 0)
          return {
            ok: false,
            reason: "未匹配到可点击选项",
            selectedLabels: [],
            appliedAnswer: "",
          };
        await pickAndClick(best.item);
        return {
          ok: true,
          reason: `已选择选项: ${selected.join(",")}`,
          selectedLabels: selected.slice(),
          appliedAnswer: selected.join(","),
        };
      }

      if (labelSet.size > 0) {
        for (const item of options) {
          const label = String(item.label || "").toUpperCase();
          if (!labelSet.has(label)) continue;
          const beforeCount = selected.length;
          await pickAndClick(item);
          if (selected.length > beforeCount) {
            await sleep(EXAM_OPTION_CLICK_INTERVAL_MS);
          }
        }
      } else {
        const textParts = answerParts.filter(
          (part) => !/^[A-H]+$/i.test(normalizeTextForMatch(part)),
        );
        const maxPick =
          textParts.length > 0 ? textParts.length : Number.POSITIVE_INFINITY;
        for (const row of scored) {
          if (row.score < 45) continue;
          if (selected.length >= maxPick) break;
          const beforeCount = selected.length;
          await pickAndClick(row.item);
          if (selected.length > beforeCount) {
            await sleep(EXAM_OPTION_CLICK_INTERVAL_MS);
          }
        }
        if (!selected.length && scored[0] && scored[0].score > 0) {
          await pickAndClick(scored[0].item);
        }
      }
      if (!selected.length)
        return {
          ok: false,
          reason: "未匹配到可点击选项",
          selectedLabels: [],
          appliedAnswer: "",
        };
      return {
        ok: true,
        reason: `已选择选项: ${selected.join(",")}`,
        selectedLabels: selected.slice(),
        appliedAnswer: selected.join(","),
      };
    }

    async function fetchQuestionAnswerByStemAndType(stem, type, options = {}) {
      const emitStatus =
        typeof options.onStatus === "function"
          ? (msg) => {
              try {
                options.onStatus(msg);
              } catch {}
            }
          : null;
      if (emitStatus) emitStatus("正在连接到题库...");
      const token = getStoredExamQueryToken();
      if (!token) throw new Error("未设置题库 Token");
      if (emitStatus) emitStatus("正在校验题库身份...");
      const clientIp = await getExamQaUploadIp();
      const examUserInfo = await ensureExamQaUsernameBound(token, clientIp);
      const rawStemWithSpaces = normalizeExamStemKeepSpaces(stem);
      const rawStem = String(rawStemWithSpaces || "")
        .replace(/\s+/g, " ")
        .trim();
      const queryStem =
        normalizeExamStemForApiQuery(rawStemWithSpaces) ||
        String(rawStem || "").trim();
      const collapsedInlineBlankStem = collapseInlineBlankGaps(
        rawStemWithSpaces || queryStem || rawStem,
      );
      const blankSignature = normalizeStemWithBlankSignature(
        rawStemWithSpaces || queryStem || rawStem,
      );
      const fullWidthStem = toFullWidthPunct(queryStem);
      const compactStem = String(normalizeExamStemForSearch(queryStem) || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, "")
        .trim();
      const blankPrefixStem = extractStemPrefixBeforeBlank(
        rawStemWithSpaces || queryStem,
      );
      const queryStemNoPunct = String(queryStem || "")
        .replace(/[，,。；;：:！？!?（）()\[\]【】《》]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const compactNoPunct = String(compactStem || "")
        .replace(/[，,。；;：:！？!?（）()\[\]【】《》]/g, "")
        .trim();

      const candidates = [];
      const pushCandidate = (v) => {
        const s = String(v || "").trim();
        if (!s || s.length < 6) return;
        if (!candidates.includes(s)) candidates.push(s);
      };
      // 优先使用保留空格语义的查询词，提升接口召回
      pushCandidate(rawStem.slice(0, 200));
      pushCandidate(fullWidthStem.slice(0, 200));
      pushCandidate(queryStem.slice(0, 200));
      pushCandidate(collapsedInlineBlankStem.slice(0, 200));
      pushCandidate(queryStemNoPunct.slice(0, 200));
      pushCandidate(queryStem.split(/[，,。；;：:]/)[0]);
      pushCandidate(queryStemNoPunct.split(/[，,。；;：:]/)[0]);
      // 题干存在空白占位时，额外用空白前前缀查询（例："中国梦归根结底是     的梦" -> "中国梦归根结底是"）
      pushCandidate(blankPrefixStem);
      // 再使用紧凑词兜底
      pushCandidate(compactStem.slice(0, 120));
      pushCandidate(compactStem.split(/[，,。；;：:]/)[0]);
      pushCandidate(compactNoPunct.slice(0, 120));
      if (compactStem.length > 28) pushCandidate(compactStem.slice(0, 28));
      if (compactStem.length > 18) pushCandidate(compactStem.slice(0, 18));

      const requestTextByQuery = (queryText) =>
        new Promise((resolve, reject) => {
          const cleanStudentCode = String(
            (examUserInfo && examUserInfo.studentCode) || "",
          ).trim();
          const headers = {
            Accept: "application/json",
            "X-Query-Token": String(token || ""),
            "X-Query-Username": String(
              (examUserInfo && examUserInfo.username) || "",
            ),
            "X-Query-Student-Name": String(
              (examUserInfo && examUserInfo.studentName) || "",
            ),
            "X-Query-Trace-Id": String(
              (examUserInfo && examUserInfo.traceId) || "",
            ),
            ...(cleanStudentCode
              ? { "X-Query-Student-Code": cleanStudentCode }
              : {}),
            ...(clientIp
              ? {
                  "X-Query-Client-IP": String(clientIp),
                  "X-Client-IP": String(clientIp),
                }
              : {}),
          };
          const candidates = getExamQaBaseCandidates();
          let idx = 0;
          let lastErr = null;
          const tryNext = () => {
            if (idx >= candidates.length) {
              reject(lastErr || new Error("题库查询网络错误"));
              return;
            }
            const base = candidates[idx];
            idx += 1;
            const url = new URL("/api/questions", `${base}/`);
            url.searchParams.set(
              "q",
              String(queryText || "")
                .trim()
                .slice(0, 200),
            );
            url.searchParams.set("token", token);
            url.searchParams.set(
              "username",
              String((examUserInfo && examUserInfo.username) || ""),
            );
            url.searchParams.set(
              "studentName",
              String((examUserInfo && examUserInfo.studentName) || ""),
            );
            url.searchParams.set(
              "traceId",
              String((examUserInfo && examUserInfo.traceId) || ""),
            );
            if (cleanStudentCode)
              url.searchParams.set("studentCode", cleanStudentCode);
            if (clientIp) url.searchParams.set("ip", String(clientIp));
            if (type) url.searchParams.set("type", type);
            requestExamQa("GET", url.toString(), {
              headers,
              timeoutMs: 12000,
              errorLabel: "题库查询",
            })
              .then((res) => {
                const status = Number((res && res.status) || 0);
                if (status >= 200 && status < 300) {
                  resolve(String((res && res.text) || ""));
                  return;
                }
                const errJson = res && res.json;
                const msg =
                  (errJson &&
                    (errJson.message || errJson.msg || errJson.error)) ||
                  `题库查询失败(${status || "network"})`;
                lastErr = new Error(`[${base}] ${msg}`);
                if (
                  isExamQaRetryableStatus(status) &&
                  idx < candidates.length
                ) {
                  console.warn("[题库查询] 查询响应异常，准备切换地址重试:", {
                    base,
                    next: candidates[idx] || null,
                    status,
                    message: msg,
                  });
                  tryNext();
                  return;
                }
                reject(lastErr);
              })
              .catch((err) => {
                lastErr = new Error(
                  `[${base}] ${String((err && err.message) || err || "题库查询网络错误")}`,
                );
                console.warn("[题库查询] 查询网络失败，准备切换地址重试:", {
                  base,
                  next: candidates[idx] || null,
                  message: String((err && err.message) || err || ""),
                });
                tryNext();
              });
          };
          tryNext();
        });

      const parseList = (json) =>
        Array.isArray(json)
          ? json
          : Array.isArray(json && json.items)
            ? json.items
            : Array.isArray(json && json.data)
              ? json.data
              : Array.isArray(json && json.list)
                ? json.list
                : Array.isArray(json && json.data && json.data.items)
                  ? json.data.items
                  : Array.isArray(json && json.data && json.data.list)
                    ? json.data.list
                    : [];

      const merged = new Map();
      let lastError = null;
      const normalizedStem = normalizeTextForMatch(stem);
      const normalizedStemBlank = normalizeStemWithBlankSignature(stem);
      for (
        let queryIndex = 0;
        queryIndex < candidates.length;
        queryIndex += 1
      ) {
        const q = candidates[queryIndex];
        try {
          if (emitStatus)
            emitStatus(
              `正在检索题库 (${queryIndex + 1}/${candidates.length})...`,
            );
          const text = await requestTextByQuery(q);
          const json = safeJsonParse(text);
          const list = parseList(json);
          for (const item of list) {
            if (!item || typeof item !== "object") continue;
            const itemStemRaw = getQuestionField(item);
            const itemStemNorm = normalizeTextForMatch(itemStemRaw);
            const itemStemBlank = normalizeStemWithBlankSignature(itemStemRaw);
            const mapKey =
              itemStemBlank || itemStemNorm || `row-${merged.size}`;
            const prev = merged.get(mapKey);
            if (!prev) {
              merged.set(mapKey, item);
              continue;
            }
            const prevHasAnswer = !!getQuestionAnswerField(prev);
            const currHasAnswer = !!getQuestionAnswerField(item);
            if (!prevHasAnswer && currHasAnswer) {
              merged.set(mapKey, item);
            }
          }
          const hasExact = Array.from(merged.values()).some((item) => {
            const t = normalizeTextForMatch(getQuestionField(item));
            const tb = normalizeStemWithBlankSignature(getQuestionField(item));
            const plainExact = !!(t && normalizedStem && t === normalizedStem);
            const blankExact = !!(
              tb &&
              normalizedStemBlank &&
              tb === normalizedStemBlank
            );
            return !!(
              (plainExact || blankExact) &&
              getQuestionAnswerField(item)
            );
          });
          if (hasExact) {
            if (emitStatus) emitStatus("题库已命中高置信答案");
            break;
          }
        } catch (e) {
          lastError = e;
          const msg = String((e && e.message) || e || "");
          if (isTokenUnavailableMessage(msg)) throw e;
          console.warn("[题库查询] 查询失败，将尝试下一个关键词:", msg);
        }
      }
      const list = Array.from(merged.values());
      if (!list.length && lastError) throw lastError;
      if (!list.length) return null;
      let best = null;
      let bestScore = -1;
      let bestSimilarity = 0;
      for (const item of list) {
        const qText = normalizeTextForMatch(getQuestionField(item));
        const qBlank = normalizeStemWithBlankSignature(getQuestionField(item));
        const qType = getQuestionTypeField(item);
        const answer = getQuestionAnswerField(item);
        const localSimilarity = calcStemSimilarity(normalizedStem, qText);
        const serverSimilarity = getServerSimilarityRatio(item);
        const similarity = Math.max(localSimilarity, serverSimilarity);
        let score = similarity * 100;
        if (type && qType && qType === type) score += 8;
        if (answer) score += 3;
        if (qBlank && normalizedStemBlank && qBlank === normalizedStemBlank)
          score += 28;
        else if (
          qBlank &&
          normalizedStemBlank &&
          (qBlank.includes(normalizedStemBlank) ||
            normalizedStemBlank.includes(qBlank))
        )
          score += 12;
        if (qText && normalizedStem) {
          if (qText === normalizedStem) score += 24;
          else if (
            qText.includes(normalizedStem) ||
            normalizedStem.includes(qText)
          )
            score += 12;
        }
        if (
          score > bestScore ||
          (score === bestScore && similarity > bestSimilarity)
        ) {
          bestScore = score;
          bestSimilarity = similarity;
          best = item;
        }
      }
      if (!best) return null;
      const answer = getQuestionAnswerField(best);
      if (!answer) return null;
      if (emitStatus)
        emitStatus(
          `题库匹配完成（相似度 ${(Math.max(0, bestSimilarity) * 100).toFixed(1)}%）`,
        );
      return { item: best, answer };
    }

    function buildExamAiResolvePayload(snapshot, type) {
      const stem = normalizeExamStemKeepSpaces(
        (snapshot && snapshot.stem) || "",
      );
      const options = (
        Array.isArray(snapshot && snapshot.options) ? snapshot.options : []
      )
        .map((item, idx) => {
          const labelRaw = String((item && item.label) || "")
            .toUpperCase()
            .trim();
          const label = /^[A-H]$/.test(labelRaw)
            ? labelRaw
            : String.fromCharCode(65 + idx);
          const rawText = String(
            (item && (item.text || item.content)) || "",
          ).trim();
          const content =
            stripHtml(rawText)
              .replace(/^\s*[A-H][\.\、\s\)]*/i, "")
              .trim() || stripHtml(rawText);
          return {
            label,
            content,
          };
        })
        .filter((item) => item.label && item.content);
      return {
        stem,
        type:
          normalizeExamQuestionType(type) ||
          normalizeExamQuestionType(snapshot && snapshot.type) ||
          "未知题型",
        options,
      };
    }

    function postExamAiResolve(token, userInfo, payload, waitMs, options = {}) {
      const candidates = getExamQaBaseCandidates();
      const timeoutMs = Math.max(30000, Number(waitMs || 0) + 12000);
      const ip = normalizeExamQaIp(options && options.clientIp);
      const username = String((userInfo && userInfo.username) || "").trim();
      const studentName = String(
        (userInfo && userInfo.studentName) || "",
      ).trim();
      const studentCode = String(
        (userInfo && userInfo.studentCode) || "",
      ).trim();
      const traceId = String((userInfo && userInfo.traceId) || "").trim();
      const emitStatus =
        typeof options.onStatus === "function"
          ? (msg) => {
              try {
                options.onStatus(msg);
              } catch {}
            }
          : null;
      const bodyText = JSON.stringify({
        stem: (payload && payload.stem) || "",
        type: (payload && payload.type) || "",
        options: (payload && payload.options) || [],
        waitMs: Number(waitMs || 0),
        studentName: studentName || undefined,
        studentCode: studentCode || undefined,
        traceId: traceId || undefined,
        clientIp: ip || undefined,
        currentIp: ip || undefined,
        ip: ip || undefined,
      });
      return new Promise((resolve, reject) => {
        let idx = 0;
        let lastErr = null;
        const tryNext = () => {
          if (idx >= candidates.length) {
            reject(lastErr || new Error("AI作答网络错误"));
            return;
          }
          const base = candidates[idx];
          const currentTry = idx + 1;
          idx += 1;
          if (emitStatus)
            emitStatus(
              `正在执行AI作答请求 (${currentTry}/${candidates.length})...`,
            );
          const urlObj = new URL("/api/questions/ai-resolve", `${base}/`);
          urlObj.searchParams.set("token", String(token || ""));
          urlObj.searchParams.set("username", String(username || ""));
          if (studentName) urlObj.searchParams.set("studentName", studentName);
          if (studentCode) urlObj.searchParams.set("studentCode", studentCode);
          if (traceId) urlObj.searchParams.set("traceId", traceId);
          if (ip) urlObj.searchParams.set("ip", ip);
          const url = urlObj.toString();
          const headers = {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Query-Username": String(username || ""),
            "X-Query-Student-Name": String(studentName || ""),
            "X-Query-Trace-Id": String(traceId || ""),
          };
          if (studentCode) headers["X-Query-Student-Code"] = studentCode;
          if (ip) {
            headers["X-Query-Client-IP"] = ip;
            headers["X-Client-IP"] = ip;
          }
          requestExamQa("POST", url, {
            headers,
            body: bodyText,
            timeoutMs,
            errorLabel: "AI作答请求",
          })
            .then((res) => {
              const status = Number((res && res.status) || 0);
              const json = res && res.json;
              if (status >= 200 && status < 300) {
                resolve(json || {});
                return;
              }
              const msg =
                (json && (json.message || json.msg || json.error)) ||
                `AI作答请求失败(${status || "network"})`;
              lastErr = new Error(`[${base}] ${msg}`);
              if (isExamQaRetryableStatus(status) && idx < candidates.length) {
                console.warn("[题库查询] AI作答响应异常，准备切换地址重试:", {
                  base,
                  next: candidates[idx] || null,
                  status,
                  message: msg,
                });
                if (emitStatus)
                  emitStatus(
                    `AI作答节点响应异常，切换重试 (${Math.min(idx + 1, candidates.length)}/${candidates.length})...`,
                  );
                tryNext();
                return;
              }
              reject(lastErr);
            })
            .catch((err) => {
              lastErr = new Error(
                `[${base}] ${String((err && err.message) || err || "AI作答网络错误")}`,
              );
              console.warn("[题库查询] AI作答网络失败，准备切换地址重试:", {
                base,
                next: candidates[idx] || null,
                message: String((err && err.message) || err || ""),
              });
              if (emitStatus)
                emitStatus(
                  `AI作答请求网络失败，切换节点重试 (${Math.min(idx + 1, candidates.length)}/${candidates.length})...`,
                );
              tryNext();
            });
        };
        tryNext();
      });
    }

    async function fetchQuestionAnswerByAiFallback(
      snapshot,
      type,
      options = {},
    ) {
      const token = getStoredExamQueryToken();
      if (!token) throw new Error("未设置题库 Token");
      const emitStatus =
        typeof options.onStatus === "function"
          ? (msg) => {
              try {
                options.onStatus(msg);
              } catch {}
            }
          : null;
      if (emitStatus) emitStatus("题库未命中，正在准备AI作答...");
      const clientIp = await getExamQaUploadIp();
      const examUserInfo = await ensureExamQaUsernameBound(token, clientIp);
      const payload = buildExamAiResolvePayload(snapshot, type);
      if (
        !payload.stem ||
        !Array.isArray(payload.options) ||
        payload.options.length === 0
      ) {
        return null;
      }
      const maxAttempts = Math.max(
        1,
        Number(options.maxAttempts || EXAM_QA_AI_MAX_RETRIES),
      );
      const waitMs = Math.max(0, Number(options.waitMs || EXAM_QA_AI_WAIT_MS));
      let lastPending = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (emitStatus)
          emitStatus(`正在等待AI作答结果 (${attempt}/${maxAttempts})...`);
        const result = await postExamAiResolve(
          token,
          examUserInfo,
          payload,
          waitMs,
          { onStatus: emitStatus, clientIp },
        );
        const status = String((result && result.status) || "").toLowerCase();
        const answer = String((result && result.answer) || "").trim();
        if (status === "ready" && answer) {
          if (emitStatus) emitStatus("AI作答已返回可用答案");
          return {
            item: (result && result.item) || null,
            answer,
          };
        }
        if (status === "error") {
          throw new Error(String((result && result.message) || "AI作答失败"));
        }
        lastPending = result;
        if (attempt < maxAttempts) {
          if (emitStatus)
            emitStatus(`AI作答处理中，准备重试 (${attempt}/${maxAttempts})...`);
          await sleep(EXAM_QA_AI_RETRY_DELAY_MS);
        }
      }
      return lastPending && String(lastPending.answer || "").trim()
        ? {
            item: lastPending.item || null,
            answer: String(lastPending.answer || "").trim(),
          }
        : null;
    }

    async function queryAndApplyCurrentExamAnswer(options = {}) {
      if (examAnswerBusy) return false;
      const silent = !!options.silent;
      const shouldSyncRuntimeStatus =
        !silent || (autoRunning && isExamAutomationMode(autoMode));
      const pushRuntimeStatus = (text) => {
        if (!shouldSyncRuntimeStatus) return;
        setExamAutomationRuntimeStatus(text);
      };
      examAnswerBusy = true;
      try {
        pushRuntimeStatus("正在读取当前题目...");
        const snapshot = buildExamQuestionSnapshot();
        const stem = String(snapshot.stem || "").trim();
        const type = normalizeExamQuestionType(snapshot.type);
        if (!stem) {
          console.warn("[题库查询] 未识别到当前题干");
          if (!silent) panelSetExamStatus("题库查询失败：未识别到当前题干");
          return false;
        }
        if (!getStoredExamQueryToken()) {
          console.warn("[题库查询] 未设置 Token");
          notifyTokenUnavailable("请先设置查询 Token");
          if (!silent) panelSetExamStatus("题库查询失败：请先设置查询 Token");
          return false;
        }
        const cacheStem = normalizeExamStemForSearch(stem) || stem;
        const cacheKey = `${type}|${cacheStem}`;
        const cached = examAnswerCache.get(cacheKey);
        let qa = null;
        const cacheTtl =
          cached && cached.hit === false
            ? EXAM_QA_MISS_CACHE_TTL_MS
            : EXAM_QA_CACHE_TTL_MS;
        if (cached && Date.now() - Number(cached.ts || 0) < cacheTtl) {
          pushRuntimeStatus("命中本地缓存答案，正在应用...");
          qa = cached.qa;
        } else {
          qa = await fetchQuestionAnswerByStemAndType(stem, type, {
            onStatus: pushRuntimeStatus,
          });
          examAnswerCache.set(cacheKey, {
            ts: Date.now(),
            qa,
            hit: !!(qa && qa.answer),
          });
        }
        if (!qa || !qa.answer) {
          console.warn("[题库查询] 未命中答案，准备 AI 作答");
          pushRuntimeStatus("题库未命中，正在提交到AI作答...");
          if (!silent)
            panelSetExamStatus("题库未命中：正在提交到题库并等待AI作答...");
          const aiQa = await fetchQuestionAnswerByAiFallback(snapshot, type, {
            maxAttempts: EXAM_QA_AI_MAX_RETRIES,
            waitMs: EXAM_QA_AI_WAIT_MS,
            onStatus: pushRuntimeStatus,
          });
          if (!aiQa || !aiQa.answer) {
            pushRuntimeStatus("AI作答暂未返回可用答案");
            if (!silent)
              panelSetExamStatus("题库未命中：AI作答仍未返回可用答案");
            return false;
          }
          qa = aiQa;
          examAnswerCache.set(cacheKey, { ts: Date.now(), qa, hit: true });
        }
        pushRuntimeStatus("已获取答案，正在执行自动作答...");
        const applied = await applyAnswerToCurrentQuestion(snapshot, qa.answer);
        if (applied && applied.ok) {
          rememberExamAnswered(snapshot, applied, qa.answer);
        }
        pushRuntimeStatus(
          applied.ok
            ? "自动作答成功，准备进入下一题..."
            : "已命中答案，但应用到页面失败",
        );
        if (!silent) {
          panelSetExamStatus(
            applied.ok
              ? `题库命中：${applied.reason}`
              : `题库命中但应用失败：${applied.reason}`,
          );
        }
        return !!applied.ok;
      } catch (e) {
        console.error("[题库查询] 异常:", e);
        const errMsg = String((e && e.message) || e || "");
        if (!silent) panelSetExamStatus(`题库查询失败：${errMsg}`);
        if (isTokenUnavailableMessage(errMsg)) {
          notifyTokenUnavailable(errMsg);
          if (autoRunning && isExamAutomationMode(autoMode)) {
            stopExamAutomationByTokenError(errMsg);
          }
        }
        return false;
      } finally {
        examAnswerBusy = false;
      }
    }

    function getCurrentExamPaperKey() {
      const ctx = getExamContext();
      const a = String((ctx && ctx.examTestId) || "").trim();
      const b = String((ctx && ctx.paperId) || "").trim();
      const c = String((ctx && ctx.nodeUid) || "").trim();
      return [a, b, c].filter(Boolean).join("|") || "default-paper";
    }

    function getOptionContentByLabelFromDom(label) {
      const target = String(label || "")
        .toUpperCase()
        .trim();
      if (!target) return "";
      const options = getCurrentExamOptionItems();
      const hit = options.find(
        (opt) => String((opt && opt.label) || "").toUpperCase() === target,
      );
      if (!hit) return "";
      const rawText = String((hit && hit.text) || "");
      return (
        rawText.replace(/^\s*[A-H][\.\、\s\)]*/i, "").trim() || rawText.trim()
      );
    }

    function rememberExamAnswered(snapshot, applied, sourceAnswer) {
      const paperKey = getCurrentExamPaperKey();
      if (paperKey !== examAnsweredMapPaperKey) {
        examAnsweredMapPaperKey = paperKey;
        examAnsweredMap.clear();
      }
      const questionNo = Number((snapshot && snapshot.questionNo) || 0);
      const stem = String((snapshot && snapshot.stem) || "").trim();
      const type = normalizeExamQuestionType(snapshot && snapshot.type) || "";
      const selectedText =
        String((applied && applied.appliedAnswer) || "").trim() ||
        String(sourceAnswer || "").trim();
      const selectedLabelsRaw = Array.isArray(applied && applied.selectedLabels)
        ? applied.selectedLabels
            .map((x) => String(x || "").toUpperCase())
            .filter(Boolean)
        : [];
      const selectedLabels = selectedLabelsRaw.length
        ? selectedLabelsRaw
        : Array.from(parseAnswerLabels(selectedText));
      const optionsFromSnapshot = Array.isArray(snapshot && snapshot.options)
        ? snapshot.options
        : [];
      const optionMap = {};
      for (const opt of optionsFromSnapshot) {
        const label = String((opt && opt.label) || "").toUpperCase();
        if (!label || optionMap[label]) continue;
        const rawText = String((opt && opt.text) || opt.content || "");
        const content =
          rawText.replace(/^\s*[A-H][\.\、\s\)]*/i, "").trim() ||
          rawText.trim();
        optionMap[label] = content || rawText || "";
      }
      const selectedOptionDetails = selectedLabels.map((label) => {
        const content = String(
          optionMap[label] || getOptionContentByLabelFromDom(label) || "",
        ).trim();
        return { label, content };
      });
      const key =
        questionNo > 0
          ? `q-${questionNo}`
          : `s-${normalizeExamStemForSearch(stem).slice(0, 120)}`;
      examAnsweredMap.set(key, {
        questionNo,
        stem,
        type,
        selectedText,
        selectedLabels,
        selectedOptionDetails,
        optionMap,
        sourceAnswer: String(sourceAnswer || "").trim(),
        ts: Date.now(),
      });
      if (examAnsweredMap.size > 120) {
        const entries = Array.from(examAnsweredMap.entries()).sort(
          (a, b) => (a[1].ts || 0) - (b[1].ts || 0),
        );
        while (entries.length > 100) {
          const old = entries.shift();
          if (!old) break;
          examAnsweredMap.delete(old[0]);
        }
      }
    }

    function isExamQuestionVisible() {
      const selectors = [
        ".el-checkbox-group",
        ".el-radio-group",
        'input[type="checkbox"]',
        'input[type="radio"]',
        ".questionTitle",
        ".centent-pre",
        ".questionContent .el-checkbox-group",
        ".questionContent .el-radio-group",
        '.questionContent input[type="checkbox"]',
        '.questionContent input[type="radio"]',
        '.questionContent input[type="text"]',
        ".questionContent textarea",
      ];
      return selectors.some((s) => document.querySelector(s));
    }

    async function tryAutoAnswerCurrentExamQuestion() {
      if (!getStoredExamQueryToken()) return false;
      if (!isExamQuestionVisible()) return false;
      const snapshot = buildExamQuestionSnapshot();
      const stem = normalizeExamStemForSearch(snapshot && snapshot.stem);
      if (!stem) return false;
      const type = normalizeExamQuestionType(snapshot && snapshot.type);
      const key = `${type}|${stem}`;
      const now = Date.now();
      if (
        key === lastExamAutoAnswerKey &&
        now - lastExamAutoAnswerAt < EXAM_AUTO_ANSWER_COOLDOWN_MS
      ) {
        return false;
      }
      lastExamAutoAnswerKey = key;
      lastExamAutoAnswerAt = now;
      return !!(await queryAndApplyCurrentExamAnswer({ silent: true }));
    }

    function findNextQuestionButton() {
      const direct = document.querySelector(
        ".pre-next .next-topic.ZHIHUISHU_QZMD, .pre-next .next-topic",
      );
      if (direct) return direct;
      const candidates = Array.from(
        document.querySelectorAll(
          'button, .el-button, [role="button"], a, span, div',
        ),
      );
      for (const el of candidates) {
        if (!el || el.disabled) continue;
        const txt = stripHtml(el.textContent).replace(/\s+/g, "");
        if (!txt) continue;
        if (!/(下一题|下一道|下题|next)/i.test(txt)) continue;
        if (
          el.classList &&
          (el.classList.contains("is-disabled") ||
            el.classList.contains("disabled"))
        )
          continue;
        return el;
      }
      return null;
    }

    function isNextQuestionClickable(el) {
      if (!el) return false;
      const cls = String(el.className || "");
      if (/\bnoNext\b/i.test(cls)) return false;
      if (/\bnext-topic\b/i.test(cls)) return /\bnext-t\b/i.test(cls);
      if (
        el.classList &&
        (el.classList.contains("is-disabled") ||
          el.classList.contains("disabled"))
      )
        return false;
      return true;
    }

    function clickNextQuestionButton(el) {
      if (!el) return false;
      const scrollEl =
        document.scrollingElement || document.documentElement || document.body;
      const prevLeft = Number(
        (scrollEl && scrollEl.scrollLeft) || window.pageXOffset || 0,
      );
      const prevTop = Number(
        (scrollEl && scrollEl.scrollTop) || window.pageYOffset || 0,
      );
      const fire = (type) => {
        try {
          el.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
        } catch {}
      };
      fire("mouseover");
      fire("mousedown");
      fire("mouseup");
      fire("click");
      try {
        el.click();
      } catch {}
      try {
        window.scrollTo({ left: prevLeft, top: prevTop, behavior: "auto" });
      } catch {
        try {
          window.scrollTo(prevLeft, prevTop);
        } catch {}
      }
      return true;
    }

    async function goNextExamQuestionIfPossible() {
      const timeoutMs = 4200;
      const intervalMs = 300;
      const start = Date.now();
      let btn = findNextQuestionButton();
      while (Date.now() - start < timeoutMs) {
        if (btn && isNextQuestionClickable(btn)) break;
        await sleep(intervalMs);
        btn = findNextQuestionButton();
      }
      if (!btn || !isNextQuestionClickable(btn)) return false;
      clickNextQuestionButton(btn);
      await sleep(450);
      return true;
    }

    function isElementVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle
        ? window.getComputedStyle(el)
        : null;
      if (
        style &&
        (style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0")
      )
        return false;
      return !!(el.getClientRects && el.getClientRects().length);
    }

    function findPaperSubmitButton() {
      const selectors = [
        ".right-H .reviewDone.ZHIHUISHU_QZMD",
        ".right-H .reviewDone",
        ".right-H .submit-btn",
        ".pre-next .reviewDone.ZHIHUISHU_QZMD",
        ".pre-next .reviewDone",
        ".pre-next .submit-btn",
        ".reviewDone.ZHIHUISHU_QZMD",
        ".reviewDone",
        ".submit-btn",
      ];
      const seen = new Set();
      const candidates = [];
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          if (!el || seen.has(el)) continue;
          seen.add(el);
          candidates.push(el);
        }
      }
      for (const el of candidates) {
        const action =
          (el.closest &&
            el.closest(
              'button, [role="button"], a, .reviewDone, .submit-btn',
            )) ||
          el;
        if (!isElementVisible(action)) continue;
        const txt = [
          stripHtml(action.textContent),
          stripHtml(action.getAttribute && action.getAttribute("title")),
          stripHtml(action.getAttribute && action.getAttribute("aria-label")),
          stripHtml(action.getAttribute && action.getAttribute("value")),
        ]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, "");
        if (!/^(提交作业|提交试卷|我要交卷|交卷|提交并结束|提交)$/.test(txt))
          continue;
        if (!isExamActionClickable(action)) continue;
        return action;
      }
      return null;
    }

    function isExamActionClickable(el) {
      if (!el || !isElementVisible(el)) return false;
      let node = el;
      let depth = 0;
      while (node && depth < 5) {
        const cls = String(node.className || "");
        if (/\b(disabled|is-disabled|forbid|noNext)\b/i.test(cls)) return false;
        const ariaDisabled = String(
          (node.getAttribute && node.getAttribute("aria-disabled")) || "",
        ).toLowerCase();
        if (ariaDisabled === "true") return false;
        if ("disabled" in node && node.disabled) return false;
        const style = window.getComputedStyle
          ? window.getComputedStyle(node)
          : null;
        if (style && style.pointerEvents === "none") return false;
        node = node.parentElement;
        depth += 1;
      }
      return true;
    }

    function clickExamActionButton(el) {
      if (!el) return false;
      const root =
        (el.closest &&
          el.closest(
            'button, [role="button"], a, .el-button, .reviewDone, .submit-btn',
          )) ||
        el;
      if (!isExamActionClickable(root)) return false;
      try {
        root.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      } catch {}
      const fire = (name) => {
        try {
          root.dispatchEvent(
            new MouseEvent(name, {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
        } catch {}
      };
      fire("mousedown");
      fire("mouseup");
      fire("click");
      try {
        root.click();
      } catch {}
      return true;
    }

    async function waitForPaperSubmitButton(
      timeoutMs = 7000,
      intervalMs = 250,
    ) {
      const start = Date.now();
      let btn = findPaperSubmitButton();
      while (Date.now() - start < timeoutMs) {
        if (btn && isExamActionClickable(btn)) return btn;
        await sleep(intervalMs);
        btn = findPaperSubmitButton();
      }
      return btn && isExamActionClickable(btn) ? btn : null;
    }

    function findSubmitConfirmButton() {
      const wrappers = Array.from(
        document.querySelectorAll(".el-dialog__wrapper"),
      ).filter((w) => isElementVisible(w));
      const candidates = wrappers.length
        ? wrappers.flatMap((w) =>
            Array.from(w.querySelectorAll("button, span, .button, .comfirm")),
          )
        : Array.from(
            document.querySelectorAll("button, span, .button, .comfirm"),
          );
      for (const el of candidates) {
        if (!isElementVisible(el)) continue;
        const txt = stripHtml(el.textContent).replace(/\s+/g, "");
        if (!txt) continue;
        if (/(取消|返回|关闭)/.test(txt)) continue;
        if (/(提交|确定|交卷|我知道了)/.test(txt)) return el;
      }
      return null;
    }

    async function submitCurrentPaperIfPossible() {
      if (examSubmitBusy) return false;
      examSubmitBusy = true;
      try {
        const ctx = getExamContext();
        const currentPointId = String(
          autoExamTargetPointId || (ctx && ctx.nodeUid) || "",
        ).trim();
        const syncKey = getExamWrongSyncStateKey(ctx);
        let stagedPendingSubmit = false;
        try {
          await getExamQaUserInfo();
        } catch {}
        if (currentPointId && autoRunning && isExamAutomationMode(autoMode)) {
          setPendingSubmittedState(currentPointId, Date.now());
          writeExamWrongSyncState(syncKey, "");
          stagedPendingSubmit = true;
          setExamAutomationRuntimeStatus(
            "已记录交卷状态，准备提交并等待答对率...",
          );
        }
        if (autoRunning && isExamAutomationMode(autoMode)) {
          setExamAutomationRuntimeStatus("正在定位交卷按钮...");
        }
        const submitBtn = await waitForPaperSubmitButton(7000, 250);
        if (!submitBtn) {
          if (stagedPendingSubmit) setPendingSubmittedState("");
          return false;
        }
        if (autoRunning && isExamAutomationMode(autoMode)) {
          setExamAutomationRuntimeStatus("已定位交卷按钮，正在提交...");
        }
        clickExamActionButton(submitBtn);
        await sleep(500);

        let clickedAnyConfirm = false;
        for (let i = 0; i < 10; i++) {
          const confirmBtn = findSubmitConfirmButton();
          if (!confirmBtn) {
            await sleep(350);
            continue;
          }
          clickedAnyConfirm = true;
          if (autoRunning && isExamAutomationMode(autoMode)) {
            setExamAutomationRuntimeStatus("检测到确认弹窗，正在确认提交...");
          }
          clickExamActionButton(confirmBtn);
          await sleep(550);
        }
        if (
          clickedAnyConfirm &&
          autoRunning &&
          isExamAutomationMode(autoMode)
        ) {
          setExamAutomationRuntimeStatus("交卷确认已点击，等待结果同步...");
        }
        return true;
      } finally {
        examSubmitBusy = false;
      }
    }

    function decodeExamNodeNameMaybe(raw) {
      const s = String(raw || "").trim();
      if (!s) return "";
      try {
        if (/^[A-Za-z0-9+/=]+$/.test(s)) {
          const decoded = decodeURIComponent(atob(s));
          try {
            const j = JSON.parse(decoded);
            return typeof j === "string" ? j : decoded;
          } catch {
            return decoded;
          }
        }
      } catch {}
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    }

    function parseExamContext() {
      const seg = location.pathname.split("/").filter(Boolean);
      const q = new URL(location.href).searchParams;

      let courseId = "";
      let classId = "";
      let nodeUid = "";
      let routeType = "unknown";
      let nodeName = "";
      let examTestId = "";
      let paperId = "";

      const learnIdx = seg.indexOf("learnPage");
      if (learnIdx >= 0) {
        routeType = "learnPage";
        courseId = seg[learnIdx + 1] || "";
        const second = seg[learnIdx + 2] || "";
        const third = seg[learnIdx + 3] || "";
        const qClassId = q.get("classId") || "";
        if (qClassId) {
          classId = qClassId;
          nodeUid = second || q.get("pointId") || "";
        } else if (third) {
          classId = third;
          nodeUid = second;
        } else {
          classId = second;
          nodeUid = q.get("pointId") || "";
        }
      }

      const singleIdx = seg.indexOf("singleCourse");
      if (
        !courseId &&
        singleIdx >= 0 &&
        seg[singleIdx + 1] === "knowledgeStudy"
      ) {
        routeType = "singleCourse";
        courseId = seg[singleIdx + 2] || "";
        classId = q.get("classId") || "";
        nodeUid = seg[singleIdx + 3] || q.get("pointId") || "";
      }

      const masteryIdx = seg.indexOf("masteryHistory");
      if (!courseId && masteryIdx >= 0) {
        routeType = "masteryHistory";
        courseId = seg[masteryIdx + 1] || "";
        classId = seg[masteryIdx + 2] || q.get("classId") || "";
        nodeUid = seg[masteryIdx + 3] || q.get("pointId") || "";
        nodeName = decodeExamNodeNameMaybe(q.get("nodeName") || "");
      }

      const reviewIdx = seg.indexOf("studentReviewTestOrExam");
      if (reviewIdx >= 0) {
        routeType = "studentReview";
        examTestId = seg[reviewIdx + 1] || q.get("examTestId") || "";
        courseId = seg[reviewIdx + 4] || q.get("courseId") || courseId;
        nodeName = decodeExamNodeNameMaybe(
          seg[reviewIdx + 5] || q.get("nodeName") || "",
        );
        classId = q.get("classId") || classId;
        nodeUid = q.get("pointId") || nodeUid;
        paperId = q.get("paperId") || q.get("examPaperId") || "";
      }

      const pointIdx = seg.indexOf("point");
      if (pointIdx >= 0) {
        routeType = "point";
        courseId = seg[pointIdx + 1] || q.get("courseId") || courseId;
        classId = q.get("classId") || seg[pointIdx + 5] || classId;
        nodeUid = q.get("pointId") || seg[pointIdx + 2] || nodeUid;
        nodeName = decodeExamNodeNameMaybe(q.get("nodeName") || nodeName);
        examTestId = q.get("examTestId") || examTestId;
        paperId = q.get("paperId") || q.get("examPaperId") || paperId;
      }

      const previewIdx = seg.indexOf("examPreview");
      if (previewIdx >= 0) {
        routeType = "examPreview";
        courseId = seg[previewIdx + 1] || q.get("courseId") || courseId;
        classId = q.get("classId") || seg[previewIdx + 5] || classId;
        nodeUid = q.get("pointId") || seg[previewIdx + 2] || nodeUid;
        nodeName = decodeExamNodeNameMaybe(q.get("nodeName") || nodeName);
        examTestId = q.get("examTestId") || examTestId;
        paperId = q.get("paperId") || q.get("examPaperId") || paperId;
      }

      if (!classId) classId = q.get("classId") || "";
      if (!nodeUid) nodeUid = q.get("pointId") || "";
      if (!nodeName)
        nodeName = decodeExamNodeNameMaybe(q.get("nodeName") || "");

      return {
        courseId: String(courseId || ""),
        classId: String(classId || ""),
        scMapId: String(courseId || ""),
        nodeUid: String(nodeUid || ""),
        routeType: String(routeType || "unknown"),
        nodeName: String(nodeName || ""),
        examTestId: String(examTestId || ""),
        paperId: String(paperId || ""),
      };
    }

    function getExamContext() {
      return parseExamContext();
    }

    function examCacheContextId(ctx) {
      return `${ctx.courseId}:${ctx.classId}`;
    }

    function examCacheKey(type, ctx) {
      return `${EXAM_CACHE_PREFIX}:${type}:${examCacheContextId(ctx)}`;
    }

    function isFreshByTs(ts, ttlMs) {
      const n = Number(ts || 0);
      return Number.isFinite(n) && Date.now() - n <= ttlMs;
    }

    function readExamCache(key) {
      let raw = "";
      try {
        if (typeof GM_getValue === "function") {
          raw = String(GM_getValue(key, "") || "");
        }
      } catch {}
      if (!raw) {
        try {
          raw = String(localStorage.getItem(key) || "");
        } catch {}
      }
      if (!raw) return null;
      const payload = safeJsonParse(raw);
      if (!payload || payload.version !== EXAM_CACHE_VERSION) return null;
      try {
        localStorage.setItem(key, raw);
      } catch {}
      return payload;
    }

    function writeExamCache(key, data) {
      const raw = JSON.stringify({
        version: EXAM_CACHE_VERSION,
        savedAt: Date.now(),
        data,
      });
      try {
        if (typeof GM_setValue === "function") {
          GM_setValue(key, raw);
        }
      } catch {}
      try {
        localStorage.setItem(key, raw);
      } catch {}
    }

    function loadExamPointsCache(ctx) {
      const c = readExamCache(examCacheKey("points", ctx));
      if (!c || !isFreshByTs(c.savedAt, EXAM_CACHE_TTL_POINTS)) return null;
      const d = c.data || {};
      if (!Array.isArray(d.points) || d.points.length === 0) return null;
      return d;
    }

    function saveExamPointsCache(ctx, source, points) {
      writeExamCache(examCacheKey("points", ctx), {
        source,
        points: Array.isArray(points) ? points : [],
      });
    }

    function loadExamRowsCache(ctx) {
      const c = readExamCache(examCacheKey("rows", ctx));
      if (!c || !isFreshByTs(c.savedAt, EXAM_CACHE_TTL_ROWS)) return null;
      const d = c.data || {};
      if (!Array.isArray(d.rows) || d.rows.length === 0) return null;
      return d;
    }

    function saveExamRowsCache(ctx, source, rows, options = {}) {
      writeExamCache(examCacheKey("rows", ctx), {
        source,
        extractedAt: new Date().toISOString(),
        rows: Array.isArray(rows) ? rows : [],
        fullList: options.fullList === true,
      });
    }

    function loadExamQpCache(ctx) {
      const c = readExamCache(examCacheKey("qp", ctx));
      const map =
        c && c.data && c.data.map && typeof c.data.map === "object"
          ? c.data.map
          : {};
      const nowTs = Date.now();
      const pruned = {};
      let count = 0;
      for (const [pointId, v] of Object.entries(map)) {
        if (!v || !isFreshByTs(v.updatedAt || nowTs, EXAM_CACHE_TTL_QP))
          continue;
        pruned[pointId] = v;
        count += 1;
        if (count >= EXAM_CACHE_MAX_QP_ENTRIES) break;
      }
      return pruned;
    }

    function saveExamQpCache(ctx, mapObj) {
      const entries = Object.entries(mapObj || {})
        .sort((a, b) => {
          const ta = Number((a[1] && a[1].updatedAt) || 0);
          const tb = Number((b[1] && b[1].updatedAt) || 0);
          return tb - ta;
        })
        .slice(0, EXAM_CACHE_MAX_QP_ENTRIES);
      const compact = {};
      for (const [k, v] of entries) compact[k] = v;
      writeExamCache(examCacheKey("qp", ctx), { map: compact });
    }

    function loadExamQuestionCache(ctx) {
      const c = readExamCache(examCacheKey("questions", ctx));
      const map =
        c && c.data && c.data.map && typeof c.data.map === "object"
          ? c.data.map
          : {};
      const nowTs = Date.now();
      const pruned = {};
      let count = 0;
      for (const [pointId, v] of Object.entries(map)) {
        if (!v || !isFreshByTs(v.updatedAt || nowTs, EXAM_CACHE_TTL_QUESTION))
          continue;
        pruned[pointId] = v;
        count += 1;
        if (count >= EXAM_CACHE_MAX_QUESTION_ENTRIES) break;
      }
      return pruned;
    }

    function saveExamQuestionCache(ctx, mapObj) {
      const entries = Object.entries(mapObj || {})
        .sort((a, b) => {
          const ta = Number((a[1] && a[1].updatedAt) || 0);
          const tb = Number((b[1] && b[1].updatedAt) || 0);
          return tb - ta;
        })
        .slice(0, EXAM_CACHE_MAX_QUESTION_ENTRIES);
      const compact = {};
      for (const [k, v] of entries) compact[k] = v;
      writeExamCache(examCacheKey("questions", ctx), { map: compact });
    }

    function clearExamCachesForContext(ctx) {
      const keys = [
        examCacheKey("points", ctx),
        examCacheKey("rows", ctx),
        examCacheKey("qp", ctx),
        examCacheKey("questions", ctx),
      ];
      for (const k of keys) {
        try {
          localStorage.removeItem(k);
        } catch {}
        try {
          if (typeof GM_setValue === "function") GM_setValue(k, "");
        } catch {}
      }
      const prefix = `${EXAM_CACHE_PREFIX}:opened:${examCacheContextId(ctx)}:`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          try {
            localStorage.removeItem(k);
          } catch {}
        }
      }
    }

    function buildExamTargetUrl(args) {
      const rawName = String(args.pointName || `知识点_${args.pointId}`);
      const encodedName = btoa(encodeURIComponent(JSON.stringify(rawName)));
      return `https://studentexamcomh5.zhihuishu.com/studentReviewTestOrExam/${args.examTestId}/1/1/${args.courseId}/${encodedName}/1/true/true/true/1?mapUid=&foAiRun=1&point=1&classId=${args.classId}&pointId=${args.pointId}&paperId=${args.paperId}&examPaperId=${args.paperId}&reviewQ=2`;
    }

    function getExamValue(obj, keys) {
      for (const k of keys) {
        if (obj && obj[k] != null && obj[k] !== "") return obj[k];
      }
      return "";
    }

    function collectExamPointsFromTree(root) {
      const out = [];
      const seen = new Set();
      const childKeys = [
        "data",
        "themeList",
        "subThemeList",
        "unitList",
        "knowledgeList",
        "pointList",
        "children",
        "childList",
        "list",
        "moduleList",
        "modules",
      ];

      function walk(node, pathNames) {
        if (!node) return;
        if (Array.isArray(node)) {
          for (const it of node) walk(it, pathNames);
          return;
        }
        if (typeof node !== "object") return;

        const pointId = String(
          getExamValue(node, [
            "knowledgeId",
            "pointId",
            "pointUid",
            "nodeUid",
          ]) || "",
        );
        const pointName = String(
          getExamValue(node, [
            "knowledgeName",
            "pointName",
            "nodeName",
            "name",
            "title",
          ]) || "",
        ).trim();
        if (pointId && pointName) {
          const key = `${pointId}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({
              pointId,
              pointName: pointName || `知识点_${pointId}`,
              path: pathNames.filter(Boolean).join(" > "),
            });
          }
        }

        const currentName = String(
          getExamValue(node, [
            "themeName",
            "unitName",
            "knowledgeName",
            "pointName",
            "nodeName",
            "name",
            "title",
          ]) || "",
        ).trim();
        const nextPath = currentName ? [...pathNames, currentName] : pathNames;
        for (const k of childKeys) {
          if (Array.isArray(node[k]) && node[k].length > 0)
            walk(node[k], nextPath);
          else if (
            node[k] &&
            typeof node[k] === "object" &&
            !Array.isArray(node[k])
          )
            walk(node[k], nextPath);
        }
      }

      walk(root, []);
      return out;
    }

    function buildExamPointPayloadVariants(ctx) {
      const dateFormate = getDateFormate();
      const variants = [];
      const add = (payload) => {
        const key = JSON.stringify(payload);
        if (!variants.some((it) => JSON.stringify(it) === key))
          variants.push(payload);
      };
      add({
        courseId: ctx.courseId,
        classId: ctx.classId,
        scMapId: ctx.scMapId,
        dateFormate,
      });
      add({ courseId: ctx.courseId, classId: ctx.classId, dateFormate });
      add({
        courseId: ctx.courseId,
        classId: ctx.classId,
        nodeUid: ctx.nodeUid,
        knowledgeId: ctx.nodeUid,
        dateFormate,
      });
      add({ courseId: ctx.courseId, scMapId: ctx.scMapId, dateFormate });
      add({ courseId: ctx.courseId, dateFormate });
      add({ scMapId: ctx.scMapId, classId: ctx.classId, dateFormate });
      add({
        mapUid: ctx.courseId,
        courseId: ctx.courseId,
        classId: ctx.classId,
        dateFormate,
      });
      add({ mapUid: ctx.courseId, courseId: ctx.courseId, dateFormate });
      return variants;
    }

    function pickExamPointsFromCapturedTraffic() {
      const all = [];
      for (const t of CAPTURED_TRAFFIC) {
        if (!t || !t.url) continue;
        if (
          !(
            t.url.includes("/knowledge-study/get-course-knowledge-dic") ||
            t.url.includes("/knowledge-study/list-knowledge-theme") ||
            t.url.includes("/maptree/get-theme-node-list") ||
            t.url.includes("/common/course/query-module-info") ||
            t.url.includes("/common/course/knowledge/theme-list")
          )
        )
          continue;
        if (!t.responseJson || !isSuccessResponse(t.responseJson)) continue;
        all.push(...collectExamPointsFromTree(t.responseJson.data));
      }
      const uniq = new Map();
      for (const p of all) {
        if (!p || !p.pointId) continue;
        if (!uniq.has(p.pointId)) uniq.set(p.pointId, p);
      }
      return Array.from(uniq.values());
    }

    function pickExamPointsFromHelperCache(ctx) {
      const keys = [
        `zs-knowledge-capture-cache:${ctx.courseId}`,
        `zs-knowledge-capture-cache:${ctx.courseId}:${ctx.classId}`,
      ];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`zs-knowledge-capture-cache:${ctx.courseId}:`))
          keys.push(k);
      }
      const uniq = new Map();
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          const obj = safeJsonParse(raw);
          const result = obj && obj.result ? obj.result : obj;
          const modules =
            (result &&
              (result.modules ||
                (result.structure && result.structure.modules))) ||
            [];
          for (const m of modules || []) {
            for (const u of (m && m.units) || []) {
              for (const p of (u && u.points) || []) {
                const pointId = String(
                  (p && (p.pointId || p.knowledgeId || p.id || p.nodeUid)) ||
                    "",
                );
                const pointName = String(
                  (p &&
                    (p.pointName || p.knowledgeName || p.name || p.title)) ||
                    "",
                ).trim();
                if (!pointId || uniq.has(pointId)) continue;
                uniq.set(pointId, {
                  pointId,
                  pointName: pointName || `知识点_${pointId}`,
                  path: `${m && (m.moduleName || m.themeName || "")} > ${u && (u.unitName || u.subThemeName || "")}`.replace(
                    /^ > | > $/g,
                    "",
                  ),
                });
              }
            }
          }
        } catch {}
      }
      const sharedPayload = loadSharedKnowledgeCachePayload({
        courseId: ctx.courseId,
        classId: ctx.classId,
        nodeUid: ctx.nodeUid,
      });
      if (sharedPayload && sharedPayload.result) {
        const result = sharedPayload.result;
        const modules =
          (result &&
            (result.modules ||
              (result.structure && result.structure.modules))) ||
          [];
        for (const m of modules || []) {
          for (const u of (m && m.units) || []) {
            for (const p of (u && u.points) || []) {
              const pointId = String(
                (p && (p.pointId || p.knowledgeId || p.id || p.nodeUid)) || "",
              );
              const pointName = String(
                (p && (p.pointName || p.knowledgeName || p.name || p.title)) ||
                  "",
              ).trim();
              if (!pointId || uniq.has(pointId)) continue;
              uniq.set(pointId, {
                pointId,
                pointName: pointName || `知识点_${pointId}`,
                path: `${m && (m.moduleName || m.themeName || "")} > ${u && (u.unitName || u.subThemeName || "")}`.replace(
                  /^ > | > $/g,
                  "",
                ),
              });
            }
          }
        }
      }
      return Array.from(uniq.values());
    }

    async function requestExamPointsViaEndpoint(endpoint, payloadVariants) {
      const errors = [];
      for (const payload of payloadVariants) {
        try {
          let res = null;
          try {
            res = await postExamEncryptedJson(endpoint, payload, 6);
          } catch (e) {
            errors.push(
              `${endpoint} 加密请求失败: ${String((e && e.message) || e)}`,
            );
          }
          if (!res || !res.json || !isSuccessResponse(res.json)) {
            res = await postExamJson(endpoint, payload, false);
          }
          if (!res || !res.json || !isSuccessResponse(res.json)) {
            res = await postExamJson(endpoint, payload, true);
          }
          if (!res.json) {
            errors.push(`${endpoint} 返回非JSON status=${res.status}`);
            continue;
          }
          if (!isSuccessResponse(res.json)) {
            errors.push(
              `${endpoint} code=${res.json.code} msg=${res.json.message || ""}`.trim(),
            );
            continue;
          }
          const points = collectExamPointsFromTree(res.json.data);
          if (points.length > 0) {
            return { ok: true, payload, points, raw: res.json, errors };
          }
          errors.push(
            `${endpoint} 成功但未解析到point，payload=${JSON.stringify(payload)}`,
          );
        } catch (e) {
          errors.push(`${endpoint} 请求失败: ${String((e && e.message) || e)}`);
        }
      }
      return { ok: false, points: [], raw: null, errors };
    }

    async function loadAllExamPoints(ctx) {
      const cached = loadExamPointsCache(ctx);
      if (cached) {
        return {
          source: `points-cache:${cached.source || "unknown"}`,
          points: cached.points,
          raw: null,
          errors: [],
        };
      }

      const payloadVariants = buildExamPointPayloadVariants(ctx);
      const dicTry = await requestExamPointsViaEndpoint(
        API_DIC,
        payloadVariants,
      );
      if (dicTry.ok) {
        saveExamPointsCache(ctx, "get-course-knowledge-dic", dicTry.points);
        return {
          source: "get-course-knowledge-dic",
          points: dicTry.points,
          raw: dicTry.raw,
          errors: dicTry.errors,
        };
      }

      const themeTry = await requestExamPointsViaEndpoint(
        API_THEME,
        payloadVariants,
      );
      if (themeTry.ok) {
        saveExamPointsCache(ctx, "list-knowledge-theme", themeTry.points);
        return {
          source: "list-knowledge-theme",
          points: themeTry.points,
          raw: themeTry.raw,
          errors: [...(dicTry.errors || []), ...(themeTry.errors || [])],
        };
      }

      const themeNodeTry = await requestExamPointsViaEndpoint(
        API_THEME_NODE,
        payloadVariants,
      );
      if (themeNodeTry.ok) {
        saveExamPointsCache(
          ctx,
          "maptree/get-theme-node-list",
          themeNodeTry.points,
        );
        return {
          source: "maptree/get-theme-node-list",
          points: themeNodeTry.points,
          raw: themeNodeTry.raw,
          errors: [
            ...(dicTry.errors || []),
            ...(themeTry.errors || []),
            ...(themeNodeTry.errors || []),
          ],
        };
      }

      const moduleInfoTry = await requestExamPointsViaEndpoint(
        API_MODULE_INFO,
        payloadVariants,
      );
      if (moduleInfoTry.ok) {
        saveExamPointsCache(
          ctx,
          "common/course/query-module-info",
          moduleInfoTry.points,
        );
        return {
          source: "common/course/query-module-info",
          points: moduleInfoTry.points,
          raw: moduleInfoTry.raw,
          errors: [
            ...(dicTry.errors || []),
            ...(themeTry.errors || []),
            ...(themeNodeTry.errors || []),
            ...(moduleInfoTry.errors || []),
          ],
        };
      }

      const themeListCommonTry = await requestExamPointsViaEndpoint(
        API_THEME_LIST_COMMON,
        payloadVariants,
      );
      if (themeListCommonTry.ok) {
        saveExamPointsCache(
          ctx,
          "common/course/knowledge/theme-list",
          themeListCommonTry.points,
        );
        return {
          source: "common/course/knowledge/theme-list",
          points: themeListCommonTry.points,
          raw: themeListCommonTry.raw,
          errors: [
            ...(dicTry.errors || []),
            ...(themeTry.errors || []),
            ...(themeNodeTry.errors || []),
            ...(moduleInfoTry.errors || []),
            ...(themeListCommonTry.errors || []),
          ],
        };
      }

      const fromHelperCache = pickExamPointsFromHelperCache(ctx);
      if (fromHelperCache.length > 0) {
        saveExamPointsCache(ctx, "zs-helper-cache", fromHelperCache);
        return {
          source: "zs-helper-cache",
          points: fromHelperCache,
          raw: null,
          errors: [
            ...(dicTry.errors || []),
            ...(themeTry.errors || []),
            ...(themeNodeTry.errors || []),
            ...(moduleInfoTry.errors || []),
            ...(themeListCommonTry.errors || []),
          ],
        };
      }

      const fromTraffic = pickExamPointsFromCapturedTraffic();
      if (fromTraffic.length > 0) {
        saveExamPointsCache(ctx, "captured-traffic", fromTraffic);
        return {
          source: "captured-traffic",
          points: fromTraffic,
          raw: null,
          errors: [
            ...(dicTry.errors || []),
            ...(themeTry.errors || []),
            ...(themeNodeTry.errors || []),
            ...(moduleInfoTry.errors || []),
            ...(themeListCommonTry.errors || []),
          ],
        };
      }

      const detail = [
        ...(dicTry.errors || []),
        ...(themeTry.errors || []),
        ...(themeNodeTry.errors || []),
        ...(moduleInfoTry.errors || []),
        ...(themeListCommonTry.errors || []),
      ]
        .slice(-8)
        .join(" | ");
      throw new Error(
        `未从知识点接口解析到可用 pointId。${detail ? ` 诊断: ${detail}` : ""}`,
      );
    }

    function groupRowsByPath(rows) {
      const moduleMap = new Map();
      for (const r of rows || []) {
        const parts = String(r.path || "未分类 > default")
          .split(">")
          .map((x) => x.trim())
          .filter(Boolean);
        const moduleName = parts[0] || "未分类";
        const unitName = parts[1] || "default";
        if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, new Map());
        const unitMap = moduleMap.get(moduleName);
        if (!unitMap.has(unitName)) unitMap.set(unitName, []);
        unitMap.get(unitName).push(r);
      }
      return moduleMap;
    }

    function renderExamResults(rows) {
      examResultWrap.innerHTML = "";
      if (!rows || rows.length === 0) {
        examResultWrap.textContent = "暂无结果";
        return;
      }
      const grouped = groupRowsByPath(rows);
      const maxRender = 500;
      let rendered = 0;
      for (const [moduleName, unitMap] of grouped.entries()) {
        if (rendered >= maxRender) break;
        const mod = document.createElement("details");
        mod.style.cssText =
          "margin-bottom:6px;border:1px solid #cbd5e1;border-radius:7px;padding:4px 6px;background:#ffffff;";
        const moduleRows = Array.from(unitMap.values()).flat();
        const moduleOkCount = moduleRows.filter(
          (x) => x.status === "ok",
        ).length;
        const moduleTotal = moduleRows.length;
        const modSummary = document.createElement("summary");
        modSummary.style.cssText =
          "cursor:pointer;color:#1e3a8a;font-weight:700;font-size:14px;line-height:1.45;display:flex;align-items:center;justify-content:space-between;gap:8px;";
        const modLeft = document.createElement("span");
        modLeft.style.cssText =
          "display:inline-flex;align-items:center;min-width:0;max-width:72%;";
        const modTag = document.createElement("span");
        modTag.textContent = "模块";
        modTag.style.cssText =
          "display:inline-flex;align-items:center;flex:0 0 auto;white-space:nowrap;padding:0 6px;height:20px;border-radius:999px;border:1px solid #93c5fd;background:#dbeafe;color:#1d4ed8;font-size:12px;line-height:1;font-weight:700;vertical-align:middle;margin-right:6px;";
        const modText = document.createElement("span");
        modText.textContent = moduleName;
        modText.style.cssText =
          "min-width:0;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        const modRatio = document.createElement("span");
        modRatio.textContent = `${moduleOkCount}/${moduleTotal}`;
        modRatio.style.cssText =
          "flex:0 0 auto;color:#1d4ed8;font-size:12px;font-weight:700;line-height:1.2;";
        modLeft.appendChild(modTag);
        modLeft.appendChild(modText);
        modSummary.appendChild(modLeft);
        modSummary.appendChild(modRatio);
        mod.appendChild(modSummary);
        for (const [unitName, list] of unitMap.entries()) {
          if (rendered >= maxRender) break;
          const unit = document.createElement("details");
          unit.style.cssText = "margin:4px 0 6px 8px;";
          const okCount = list.filter((x) => x.status === "ok").length;
          const unitSummary = document.createElement("summary");
          unitSummary.style.cssText =
            "cursor:pointer;color:#334155;font-weight:600;font-size:13px;line-height:1.45;display:flex;align-items:center;justify-content:space-between;gap:8px;";
          const unitLeft = document.createElement("span");
          unitLeft.style.cssText =
            "display:inline-flex;align-items:center;min-width:0;max-width:72%;";
          const unitTag = document.createElement("span");
          unitTag.textContent = "单元";
          unitTag.style.cssText =
            "display:inline-flex;align-items:center;flex:0 0 auto;white-space:nowrap;padding:0 6px;height:18px;border-radius:999px;border:1px solid #cbd5e1;background:#f1f5f9;color:#475569;font-size:11px;line-height:1;font-weight:700;vertical-align:middle;margin-right:6px;";
          const unitText = document.createElement("span");
          unitText.textContent = `${unitName}`;
          unitText.style.cssText =
            "min-width:0;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
          const unitRatio = document.createElement("span");
          unitRatio.textContent = `${okCount}/${list.length}`;
          unitRatio.style.cssText =
            "flex:0 0 auto;color:#334155;font-size:12px;font-weight:700;line-height:1.2;";
          unitLeft.appendChild(unitTag);
          unitLeft.appendChild(unitText);
          unitSummary.appendChild(unitLeft);
          unitSummary.appendChild(unitRatio);
          unit.appendChild(unitSummary);
          for (const row of list) {
            if (rendered >= maxRender) break;
            rendered += 1;
            const item = document.createElement("div");
            item.style.cssText =
              "margin:4px 0 0 10px;padding:4px 6px;border-left:2px solid #dbe6f3;";
            const nameLine = document.createElement("div");
            const statusMark =
              row.status === "ok"
                ? "OK"
                : row.status === "no-question"
                  ? "NQ"
                  : "ER";
            nameLine.style.cssText =
              "line-height:1.35;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;";
            const left = document.createElement("div");
            left.style.cssText =
              "display:flex;align-items:center;gap:2px;min-width:0;max-width:76%;flex:1 1 auto;";
            const statusSpan = document.createElement("span");
            statusSpan.textContent = `[${statusMark}] `;
            statusSpan.style.cssText = "flex:0 0 auto;";
            left.appendChild(statusSpan);
            const rawPointName = row.pointName || "未命名知识点";
            const displayPointName =
              rawPointName.length > 40
                ? `${rawPointName.slice(0, 40)}...`
                : rawPointName;
            const isNoQuestion = row.status === "no-question";
            if (row.targetUrl) {
              const nameLink = document.createElement("a");
              nameLink.href = row.targetUrl;
              nameLink.textContent = displayPointName;
              nameLink.title = rawPointName;
              nameLink.style.cssText = `color:#2563eb;text-decoration:${isNoQuestion ? "underline line-through" : "underline"};min-width:0;max-width:220px;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
              nameLink.addEventListener("click", async (ev) => {
                ev.preventDefault();
                const originalText = nameLink.textContent;
                nameLink.textContent = "跳转中...";
                nameLink.style.pointerEvents = "none";
                try {
                  const freshRow = await resolveFreshExamTargetRow(row);
                  window.location.href = String(freshRow.targetUrl);
                } catch (e) {
                  panelSetExamStatus(
                    `跳转失败：${String((e && e.message) || e)}`,
                  );
                  nameLink.textContent = originalText;
                  nameLink.style.pointerEvents = "";
                }
              });
              left.appendChild(nameLink);
            } else {
              const nameText = document.createElement("span");
              nameText.textContent = displayPointName;
              nameText.title = rawPointName;
              nameText.style.cssText = `min-width:0;max-width:220px;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:${isNoQuestion ? "line-through" : "none"};`;
              left.appendChild(nameText);
            }
            nameLine.appendChild(left);
            const masteryBadge = document.createElement("div");
            const hm =
              row.highMasteryScore === "" || row.highMasteryScore == null
                ? "-"
                : row.highMasteryScore;
            masteryBadge.style.cssText =
              "flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;padding:0 6px;height:18px;border-radius:999px;border:1px solid #cbd5e1;background:#f1f5f9;color:#475569;font-size:11px;font-weight:700;line-height:1;";
            const flagIcon = createIcon("flag", { size: 12, strokeWidth: 2.1 });
            flagIcon.style.color = "#64748b";
            masteryBadge.appendChild(flagIcon);
            const hmText = document.createElement("span");
            hmText.textContent = String(hm);
            masteryBadge.appendChild(hmText);
            nameLine.appendChild(masteryBadge);
            item.appendChild(nameLine);
            if (!row.targetUrl && (row.error || "").trim()) {
              const linkLine = document.createElement("div");
              linkLine.style.cssText =
                "font-size:12px;color:#475569;line-height:1.35;margin-top:2px;";
              linkLine.textContent = row.error;
              item.appendChild(linkLine);
            }
            unit.appendChild(item);
          }
          mod.appendChild(unit);
        }
        examResultWrap.appendChild(mod);
      }
    }

    function makeExamLinksCsv(rows) {
      const headers = [
        "index",
        "pointId",
        "pointName",
        "path",
        "masteryScore",
        "highMasteryScore",
        "masteryChange",
        "questionNum",
        "examTestId",
        "paperId",
        "targetUrl",
        "status",
        "error",
      ];
      const lines = [headers.join(",")];
      for (const r of rows || []) {
        lines.push(
          [
            r.index,
            r.pointId,
            r.pointName,
            r.path,
            r.masteryScore,
            r.highMasteryScore,
            r.masteryChange,
            r.questionNum,
            r.examTestId,
            r.paperId,
            r.targetUrl,
            r.status,
            r.error || "",
          ]
            .map(sanitizeCell)
            .join(","),
        );
      }
      return lines.join("\n");
    }

    function flattenQuestionSheet(sheetData) {
      const out = [];
      const partList =
        sheetData && Array.isArray(sheetData.partSheetVos)
          ? sheetData.partSheetVos
          : [];
      for (const part of partList) {
        const partId = String((part && part.id) || "");
        const partName = String((part && part.name) || "");
        const list =
          part && Array.isArray(part.questionSheetVos)
            ? part.questionSheetVos
            : [];
        for (const it of list) {
          if (!it || typeof it !== "object") continue;
          out.push({
            partId,
            partName,
            questionId: String(it.questionId || ""),
            questionType: Number(it.questionType || 0),
            parentId: it.parentId == null ? "" : String(it.parentId),
            parentQuestionType:
              it.parentQuestionType == null
                ? ""
                : String(it.parentQuestionType),
            parentVersion:
              it.parentVersion == null ? "" : String(it.parentVersion),
            version: it.version == null ? "" : String(it.version),
            sort: String(it.sort == null ? "" : it.sort),
          });
        }
      }
      return out;
    }

    function normalizeQuestionInfo(row, sheetItem, raw) {
      const content = stripHtml((raw && (raw.content || raw.title)) || "");
      const optionsRaw =
        raw && Array.isArray(raw.optionVos) ? raw.optionVos : [];
      const options = optionsRaw
        .map((opt, idx) => {
          const sortNum = Number((opt && opt.sort) || idx + 1);
          const label =
            Number.isFinite(sortNum) && sortNum > 0 && sortNum <= 26
              ? String.fromCharCode(64 + sortNum)
              : String(idx + 1);
          return { label, content: stripHtml(opt && opt.content) };
        })
        .filter((x) => x.content);
      return {
        pointId: row.pointId,
        pointName: row.pointName,
        examTestId: row.examTestId,
        paperId: row.paperId,
        questionId: String((raw && raw.id) || sheetItem.questionId || ""),
        questionType: Number(
          (raw && raw.questionType) || sheetItem.questionType || 0,
        ),
        questionTypeName: String((raw && raw.questionTypeName) || ""),
        sort: sheetItem.sort,
        partId: sheetItem.partId,
        partName: sheetItem.partName,
        stem: content,
        options,
      };
    }

    function tryParseCaslogcUuid() {
      try {
        const m = document.cookie.match(/(?:^|;\s*)CASLOGC=([^;]+)/);
        if (!m) return "";
        const raw = decodeURIComponent(m[1]);
        const obj = safeJsonParse(raw);
        return String((obj && obj.uuid) || "");
      } catch {
        return "";
      }
    }

    function examCommonMeta() {
      const ts = Date.now();
      const uuid = tryParseCaslogcUuid();
      return {
        dateFormate: ts,
        date: ts,
        ...(uuid ? { uuid } : {}),
      };
    }

    async function postExamJson(url, payload, withMeta = true) {
      const body = withMeta ? { ...payload, ...examCommonMeta() } : payload;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json;charset=UTF-8" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        json: safeJsonParse(text),
        text,
      };
    }

    async function postExamEncryptedJson(url, payload, keyType = 6) {
      const encryptedBody = await buildEncryptedBody(payload, keyType);
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify(encryptedBody),
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        json: safeJsonParse(text),
        text,
        encrypted: true,
      };
    }

    async function getExamEncryptedJson(url, payload, keyTypes = [3, 6]) {
      let last = null;
      for (const keyType of keyTypes) {
        try {
          const encryptedBody = await buildEncryptedBody(payload, keyType);
          const qs = new URLSearchParams();
          Object.entries(encryptedBody).forEach(([k, v]) =>
            qs.append(k, String(v)),
          );
          const reqUrl = `${url}?${qs.toString()}`;
          const res = await fetch(reqUrl, {
            method: "GET",
            credentials: "include",
          });
          const text = await res.text();
          last = {
            ok: res.ok,
            status: res.status,
            json: safeJsonParse(text),
            text,
          };
          if (last.json && isSuccessResponse(last.json)) return last;
        } catch {}
      }
      return last || { ok: false, status: 0, json: null, text: "" };
    }

    async function runExamWithConcurrency(items, concurrency, handler) {
      const list = Array.isArray(items) ? items : [];
      let cursor = 0;
      const workers = Array.from(
        { length: Math.max(1, Math.min(concurrency, list.length || 1)) },
        async () => {
          while (true) {
            const i = cursor;
            cursor += 1;
            if (i >= list.length) return;
            await handler(list[i], i);
          }
        },
      );
      await Promise.all(workers);
    }

    function openExamCacheKey(row, ctx) {
      return `${EXAM_CACHE_PREFIX}:opened:${examCacheContextId(ctx)}:${row.examTestId}:${row.paperId}`;
    }

    function hasRecentOpenExam(row, ctx) {
      try {
        const raw = localStorage.getItem(openExamCacheKey(row, ctx));
        if (!raw) return false;
        const obj = safeJsonParse(raw);
        return !!(obj && isFreshByTs(obj.ts, 2 * 60 * 60 * 1000));
      } catch {
        return false;
      }
    }

    function markOpenExam(row, ctx) {
      try {
        localStorage.setItem(
          openExamCacheKey(row, ctx),
          JSON.stringify({ ts: Date.now() }),
        );
      } catch {}
    }

    async function ensureExamOpened(row) {
      const ctx = examState.lastContext || getExamContext();
      if (!row || !row.examTestId || !row.paperId || !ctx.courseId) return true;
      const lockKey = `${row.examTestId}:${row.paperId}`;
      if (examState.openingExam.has(lockKey)) return false;
      if (hasRecentOpenExam(row, ctx)) return true;
      examState.openingExam.add(lockKey);
      try {
        const payload = {
          examTestId: row.examTestId,
          examPaperId: row.paperId,
          courseId: ctx.courseId,
        };
        let r = null;
        for (const keyType of [3, 6]) {
          let enc = null;
          try {
            enc = await buildEncryptedBody(payload, keyType);
          } catch {}
          if (!enc) continue;
          r = await postExamJson(API_OPEN_EXAM, enc, false);
          if (r && r.json && isSuccessResponse(r.json)) break;
          const form = new URLSearchParams();
          Object.entries(enc).forEach(([k, v]) => form.append(k, String(v)));
          const res = await fetch(API_OPEN_EXAM, {
            method: "POST",
            credentials: "include",
            headers: {
              accept: "application/json, text/plain, */*",
              "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            },
            body: form.toString(),
          });
          const text = await res.text();
          r = {
            ok: res.ok,
            status: res.status,
            json: safeJsonParse(text),
            text,
          };
          if (r && r.json && isSuccessResponse(r.json)) break;
        }
        if (!r || !r.json || !isSuccessResponse(r.json)) {
          r = await postExamJson(API_OPEN_EXAM, payload, false);
        }
        if (!r || !r.json || !isSuccessResponse(r.json)) {
          throw new Error((r && r.json && r.json.message) || "openExam 失败");
        }
        markOpenExam(row, ctx);
        return true;
      } finally {
        examState.openingExam.delete(lockKey);
      }
    }

    async function fetchQuestionDetailBySheet(ctx, row, sheetItem) {
      const payload = compactObject({
        examTestId: row.examTestId,
        examPaperId: row.paperId,
        courseId: ctx.courseId,
        questionId: sheetItem.questionId,
        questionType: sheetItem.questionType,
        parentId: sheetItem.parentId,
        parentQuestionType: sheetItem.parentQuestionType,
        parentVersion: sheetItem.parentVersion,
        version: sheetItem.version,
      });
      let res = await getExamEncryptedJson(
        API_EXAM_QUESTION_INFO,
        payload,
        [3, 6],
      );
      if (!res.json || !isSuccessResponse(res.json)) {
        res = await postExamJson(API_EXAM_QUESTION_INFO, payload, false);
      }
      if (!res.json || !isSuccessResponse(res.json)) {
        throw new Error(
          (res.json && res.json.message) ||
            `getExamQuestionInfo 失败(${res.status})`,
        );
      }
      return normalizeQuestionInfo(row, sheetItem, res.json.data || {});
    }

    async function fetchQuestionsForRow(ctx, row) {
      const sheetPayload = compactObject({
        examTestId: row.examTestId,
        examPaperId: row.paperId,
        courseId: ctx.courseId,
      });
      let sheetRes = await getExamEncryptedJson(
        API_EXAM_SHEET_INFO,
        sheetPayload,
        [3, 6],
      );
      if (!sheetRes.json || !isSuccessResponse(sheetRes.json)) {
        sheetRes = await postExamJson(API_EXAM_SHEET_INFO, sheetPayload, false);
      }
      if (!sheetRes.json || !isSuccessResponse(sheetRes.json)) {
        await ensureExamOpened(row);
        sheetRes = await getExamEncryptedJson(
          API_EXAM_SHEET_INFO,
          sheetPayload,
          [3, 6],
        );
        if (!sheetRes.json || !isSuccessResponse(sheetRes.json)) {
          sheetRes = await postExamJson(
            API_EXAM_SHEET_INFO,
            sheetPayload,
            false,
          );
        }
      }
      if (!sheetRes.json || !isSuccessResponse(sheetRes.json)) {
        throw new Error(
          (sheetRes.json && sheetRes.json.message) ||
            `getExamSheetInfo 失败(${sheetRes.status})`,
        );
      }
      const sheetList = flattenQuestionSheet(sheetRes.json.data || {});
      const questions = new Array(sheetList.length);
      await runExamWithConcurrency(
        sheetList,
        EXAM_QUESTION_DETAIL_CONCURRENCY,
        async (sheetItem, idx) => {
          try {
            questions[idx] = await fetchQuestionDetailBySheet(
              ctx,
              row,
              sheetItem,
            );
          } catch (e) {
            questions[idx] = {
              pointId: row.pointId,
              pointName: row.pointName,
              examTestId: row.examTestId,
              paperId: row.paperId,
              questionId: sheetItem.questionId || "",
              questionType: Number(sheetItem.questionType || 0),
              questionTypeName: "",
              sort: sheetItem.sort,
              partId: sheetItem.partId,
              partName: sheetItem.partName,
              stem: "",
              options: [],
              error: String((e && e.message) || e),
            };
          }
        },
      );
      const dedup = new Map();
      for (const q of questions.filter(Boolean)) {
        const key = `${q.questionId}:${q.sort}:${q.partId}`;
        if (!dedup.has(key)) dedup.set(key, q);
      }
      return {
        examInfo: null,
        questions: Array.from(dedup.values()),
      };
    }

    function makeExamQuestionsCsv(rows) {
      const headers = [
        "pointId",
        "pointName",
        "examTestId",
        "paperId",
        "questionId",
        "sort",
        "questionType",
        "questionTypeName",
        "partName",
        "stem",
        "options",
        "error",
      ];
      const lines = [headers.join(",")];
      for (const row of rows || []) {
        const list = Array.isArray(row.questions) ? row.questions : [];
        for (const q of list) {
          const optionsText = (q.options || [])
            .map((o) => `${o.label}.${o.content}`)
            .join(" | ");
          lines.push(
            [
              q.pointId,
              q.pointName,
              q.examTestId,
              q.paperId,
              q.questionId,
              q.sort,
              q.questionType,
              q.questionTypeName,
              q.partName,
              q.stem,
              optionsText,
              q.error || "",
            ]
              .map(sanitizeCell)
              .join(","),
          );
        }
      }
      return lines.join("\n");
    }

    async function runExtractExamLinks() {
      if (examState.running) return;
      examState.running = true;
      btnExamExtract.disabled = true;
      examState.rows = [];
      examState.questionRows = [];
      examState.lastContext = null;
      renderExamResults([]);
      panelSetExamStatus("准备中...");
      panelSetExamProgress("0 / 0");
      try {
        const ctx = getExamContext();
        examState.lastContext = ctx;
        if (!ctx.courseId || !ctx.classId) {
          throw new Error(
            `缺少 courseId/classId（courseId=${ctx.courseId || "-"}, classId=${ctx.classId || "-"})`,
          );
        }

        const rowsCached = loadExamRowsCache(ctx);
        const canUseRowsCache =
          rowsCached &&
          Array.isArray(rowsCached.rows) &&
          rowsCached.rows.length > 0 &&
          (ctx.routeType !== "studentReview" || rowsCached.fullList === true);
        if (canUseRowsCache) {
          examState.rows = rowsCached.rows;
          renderExamResults(examState.rows);
          panelSetExamProgress(
            `${examState.rows.length} / ${examState.rows.length}`,
          );
          const okCached = examState.rows.filter(
            (r) => r.status === "ok",
          ).length;
          panelSetExamStatus(
            `已使用缓存：${examState.rows.length}个知识点，${okCached}个试卷`,
          );
          return;
        }

        panelSetExamStatus("拉取知识点列表...");
        const loaded = await loadAllExamPoints(ctx);
        const source = loaded.source;
        const points = loaded.points;
        panelSetExamProgress(`0 / ${points.length}`);
        panelSetExamStatus(`已获取 ${points.length} 个知识点（${source}）`);
        const rows = new Array(points.length);
        const qpCache = loadExamQpCache(ctx);
        let done = 0;
        const examLinkConcurrency = 8;
        await runExamWithConcurrency(
          points,
          examLinkConcurrency,
          async (p, i) => {
            try {
              const cachedQp = qpCache[p.pointId];
              if (
                cachedQp &&
                isFreshByTs(cachedQp.updatedAt, EXAM_CACHE_TTL_QP)
              ) {
                const questionNum = Number(cachedQp.questionNum || 0);
                const examTestId = String(cachedQp.examTestId || "");
                const paperId = String(cachedQp.paperId || "");
                const status = cachedQp.status || "ok";
                const targetUrl =
                  examTestId && paperId
                    ? buildExamTargetUrl({
                        examTestId,
                        courseId: ctx.courseId,
                        pointName: p.pointName,
                        classId: ctx.classId,
                        pointId: p.pointId,
                        paperId,
                      })
                    : "";
                rows[i] = {
                  index: i + 1,
                  pointId: p.pointId,
                  pointName: p.pointName,
                  path: p.path,
                  masteryScore: cachedQp.masteryScore ?? "",
                  highMasteryScore: cachedQp.highMasteryScore ?? "",
                  masteryChange: cachedQp.masteryChange ?? "",
                  questionNum,
                  examTestId,
                  paperId,
                  targetUrl,
                  status,
                  error: cachedQp.error || "",
                };
                return;
              }

              const qpPayloads = [
                {
                  scMapId: ctx.scMapId,
                  courseId: ctx.courseId,
                  classId: ctx.classId,
                  knowledgeId: p.pointId,
                },
                {
                  courseId: ctx.courseId,
                  classId: ctx.classId,
                  knowledgeId: p.pointId,
                },
                { courseId: ctx.courseId, knowledgeId: p.pointId },
              ];
              let qpRes = null;
              for (const payload of qpPayloads) {
                let r = null;
                const payloadWithDate = {
                  ...payload,
                  dateFormate: getDateFormate(),
                };
                try {
                  r = await postExamEncryptedJson(
                    API_QUESTIONS_PAPER,
                    payloadWithDate,
                    6,
                  );
                } catch {}
                if (!r || !r.json || !isSuccessResponse(r.json)) {
                  r = await postExamJson(
                    API_QUESTIONS_PAPER,
                    payloadWithDate,
                    false,
                  );
                }
                if (!r || !r.json || !isSuccessResponse(r.json)) {
                  r = await postExamJson(
                    API_QUESTIONS_PAPER,
                    payloadWithDate,
                    true,
                  );
                }
                if (r && r.json && isSuccessResponse(r.json)) {
                  qpRes = r;
                  break;
                }
                if (!qpRes) qpRes = r;
              }

              const data = (qpRes && qpRes.json && qpRes.json.data) || {};
              const masteryScore =
                data.masteryScore ?? data.currentMasteryScore ?? "";
              const highMasteryScore =
                data.highMasteryScore ?? data.historyHighMasteryScore ?? "";
              const masteryChange =
                data.masteryChange ?? data.masteryDelta ?? "";
              const questionNum = Number(data.questionNum || 0);
              const examTestId = String(data.examTestId || "");
              const paperId = String(data.paperId || "");
              let status = "ok";
              let targetUrl = "";
              if (questionNum <= 0) status = "no-question";
              if (!examTestId || !paperId)
                status = status === "ok" ? "missing-ids" : status;
              if (examTestId && paperId) {
                targetUrl = buildExamTargetUrl({
                  examTestId,
                  courseId: ctx.courseId,
                  pointName: p.pointName,
                  classId: ctx.classId,
                  pointId: p.pointId,
                  paperId,
                });
              }
              rows[i] = {
                index: i + 1,
                pointId: p.pointId,
                pointName: p.pointName,
                path: p.path,
                masteryScore,
                highMasteryScore,
                masteryChange,
                questionNum,
                examTestId,
                paperId,
                targetUrl,
                status,
                error: "",
              };
              qpCache[p.pointId] = {
                masteryScore,
                highMasteryScore,
                masteryChange,
                questionNum,
                examTestId,
                paperId,
                status,
                error: "",
                updatedAt: Date.now(),
              };
            } catch (e) {
              const errMsg = String((e && e.message) || e);
              rows[i] = {
                index: i + 1,
                pointId: p.pointId,
                pointName: p.pointName,
                path: p.path,
                masteryScore: "",
                highMasteryScore: "",
                masteryChange: "",
                questionNum: "",
                examTestId: "",
                paperId: "",
                targetUrl: "",
                status: "error",
                error: errMsg,
              };
              qpCache[p.pointId] = {
                masteryScore: "",
                highMasteryScore: "",
                masteryChange: "",
                questionNum: 0,
                examTestId: "",
                paperId: "",
                status: "error",
                error: errMsg,
                updatedAt: Date.now(),
              };
            } finally {
              done += 1;
              panelSetExamProgress(`${done} / ${points.length}`);
            }
          },
        );
        examState.rows = rows.filter(Boolean);
        saveExamQpCache(ctx, qpCache);
        saveExamRowsCache(ctx, source, examState.rows, { fullList: true });
        renderExamResults(examState.rows);
        const okCount = examState.rows.filter((r) => r.status === "ok").length;
        panelSetExamStatus(
          `提取完成：${examState.rows.length}个知识点，${okCount}个试卷`,
        );
      } catch (e) {
        panelSetExamStatus(`提取失败：${String((e && e.message) || e)}`);
      } finally {
        examState.running = false;
        btnExamExtract.disabled = false;
      }
    }

    function updateOverlayVisibility() {
      const hasPinned = !!(
        overlayPinnedMessage && Date.now() < overlayPinnedUntil
      );
      const shouldShow = (autoRunning && automationMaskEnabled) || hasPinned;
      setOverlayVisible(shouldShow);
      if (autoRunning && automationMaskEnabled) {
        startOverlayLoaderAnimation();
        syncOverlayProgressTimer();
        updateOverlayProgressText();
      } else if (shouldShow) {
        stopOverlayLoaderAnimation(true);
        clearOverlayProgressTimer();
        updateOverlayProgressText();
      } else {
        stopOverlayLoaderAnimation(true);
        clearOverlayProgressTimer();
      }
    }

    function scheduleAutoExtractExamLinks() {
      const ctx = getExamContext();
      const shouldAutoExtract = !!(
        ctx &&
        ctx.courseId &&
        ctx.classId &&
        (ctx.routeType === "studentReview" ||
          ctx.routeType === "point" ||
          ctx.routeType === "examPreview" ||
          ctx.routeType === "learnPage" ||
          ctx.routeType === "singleCourse")
      );
      if (!shouldAutoExtract) return;
      if (examState.autoExtractScheduled || examState.autoExtractTriggered)
        return;
      examState.autoExtractScheduled = true;

      const trigger = () => {
        if (examState.autoExtractTriggered) return;
        examState.autoExtractTriggered = true;
        examState.autoExtractScheduled = false;
        if (
          ctx.routeType === "studentReview" ||
          ctx.routeType === "point" ||
          ctx.routeType === "examPreview"
        ) {
          setView("exam-overview");
        }
        syncAiSlot();
        panelSetExamStatus("页面加载完成，准备自动提取测试链接...");
        window.setTimeout(() => {
          syncAiSlot();
          runExtractExamLinks().catch((e) => {
            panelSetExamStatus(
              `自动提取失败：${String((e && e.message) || e)}`,
            );
          });
        }, 280);
      };

      if (document.readyState === "complete") {
        window.setTimeout(trigger, 180);
        return;
      }
      window.addEventListener(
        "load",
        () => {
          window.setTimeout(trigger, 180);
        },
        { once: true },
      );
    }

    function updateMaskToggleButton() {
      setButtonIconLabel(
        btnMaskToggle,
        automationMaskEnabled ? "eye" : "eyeOff",
        automationMaskEnabled ? "遮罩: 开" : "遮罩: 关",
      );
      btnMaskToggle.style.background = automationMaskEnabled
        ? "#0284c7"
        : "#475569";
      btnMaskToggle.style.borderColor = automationMaskEnabled
        ? "#0ea5e9"
        : "#64748b";
      btnMaskToggle.style.color = "#f8fafc";
    }

    function getDesiredAutoMode() {
      return AUTO_MODE_EXAM_RETAKE;
    }

    var AUTO_MODE_EXAM = "exam";
    var AUTO_MODE_EXAM_RETAKE = "exam-retake";

    function isExamAutomationMode(mode) {
      return mode === AUTO_MODE_EXAM || mode === AUTO_MODE_EXAM_RETAKE;
    }

    function getExamModeName(mode = autoMode) {
      return "自动答题";
    }

    function getExamAutomationModeLabel(mode = autoMode) {
      return "自动答题";
    }

    function persistAutoState(enabled) {
      saveAutomationState({
        enabled: !!enabled,
        targetUid: autoTargetUid,
        mode: autoMode,
        examTargetPointId: autoExamTargetPointId,
      });
    }

    function normalizeAutomationState(state) {
      const inputMode = String((state && state.mode) || "").trim();
      const normalizedMode =
        inputMode === AUTO_MODE_EXAM_RETAKE
          ? AUTO_MODE_EXAM_RETAKE
          : getDesiredAutoMode();
      return {
        enabled: !!(state && state.enabled === true),
        targetUid: String((state && state.targetUid) || ""),
        mode: normalizedMode,
        examTargetPointId: String((state && state.examTargetPointId) || ""),
      };
    }

    function getRuntimeAutomationState() {
      return normalizeAutomationState({
        enabled: autoRunning,
        targetUid: autoTargetUid,
        mode: autoMode,
        examTargetPointId: autoExamTargetPointId,
      });
    }

    function isAutomationStateEqual(a, b) {
      return (
        !!a &&
        !!b &&
        a.enabled === b.enabled &&
        a.targetUid === b.targetUid &&
        a.mode === b.mode &&
        a.examTargetPointId === b.examTargetPointId
      );
    }

    function syncAutomationStateFromStorage(reason = "sync") {
      const persisted = normalizeAutomationState(loadAutomationState());
      const runtime = getRuntimeAutomationState();
      if (isAutomationStateEqual(persisted, runtime)) return false;
      clearAutoLoopTimer();
      autoTargetUid = persisted.targetUid;
      autoExamTargetPointId = persisted.examTargetPointId;
      autoMode = persisted.mode;
      setAutoControlRunning(persisted.enabled);
      if (persisted.enabled) {
        setExamAutomationRuntimeStatus("已同步其他页面的自动化任务");
        scheduleAutoLoop(500);
      } else if (runtime.enabled) {
        setExamAutomationRuntimeStatus("自动化已在其他页面暂停");
      }
      if (reason === "storage") {
        try {
          renderExamOverviewPanel();
        } catch {}
      }
      return true;
    }

    function updateExamModeButtonsVisual() {
      examModeCurrent.textContent = "当前模式: 自动答题";
      examModeCurrent.style.background = "#f3e8ff";
      examModeCurrent.style.borderColor = "#c4b5fd";
      examModeCurrent.style.color = "#6b21a8";
    }

    function setExamAutomationMode(mode, options = {}) {
      const nextMode = AUTO_MODE_EXAM_RETAKE;
      const changed = autoMode !== nextMode;
      autoMode = nextMode;
      updateExamModeButtonsVisual();
      if (changed && !autoRunning) {
        setExamProgressStatusText("", { useModeIdleFallback: true });
      }
      if (options.persist !== false) persistAutoState(autoRunning);
      if (changed && options.render !== false) {
        try {
          renderExamOverviewPanel();
        } catch {}
        refreshExamAutoControlStateText();
        updateOverlayProgressText();
      }
      return changed;
    }

    function bindAutomationStateSync() {
      if (autoStateSyncTimer) window.clearInterval(autoStateSyncTimer);
      autoStateSyncTimer = window.setInterval(() => {
        syncAutomationStateFromStorage("timer");
      }, 1000);
      window.addEventListener("storage", (e) => {
        const k = String((e && e.key) || "");
        if (!k || !k.startsWith(`${AUTOMATION_STATE_PREFIX}:`)) return;
        syncAutomationStateFromStorage("storage");
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) syncAutomationStateFromStorage("visibility");
      });
      window.addEventListener("focus", () => {
        syncAutomationStateFromStorage("focus");
      });
    }

    function setAutoControlRunning(isRunning) {
      autoRunning = !!isRunning;
      if (!autoRunning) externalStuckCount = 0;
      const examActive = autoRunning && isExamAutomationMode(autoMode);
      if (examActive) {
        btnExamAutoRun.innerHTML = "";
        const loader = document.createElement("span");
        loader.className = "zs-btn-loader";
        const text = document.createElement("span");
        text.textContent = "终止";
        btnExamAutoRun.appendChild(loader);
        btnExamAutoRun.appendChild(text);
      } else {
        setButtonIconLabel(btnExamAutoRun, "play", "开始自动化");
      }
      btnExamAutoRun.style.background = examActive ? "#e11d48" : "#0f9f7d";
      btnExamAutoRun.style.borderColor = examActive ? "#f43f5e" : "#1fb493";
      btnExamAutoRun.style.color = "#f8fafc";
      updateExamModeButtonsVisual();
      autoControlState.textContent = examActive
        ? "自动化状态: 运行中"
        : "自动化状态: 未开启";
      refreshExamAutoControlStateText();
      syncAutoProgressTimer();
      syncExamMasteryPollingTimer();
      updateOverlayVisibility();
      updateOverlayProgressText();
      persistAutoState(autoRunning);
    }

    async function openResourceWithPanelFlow(resourceUid, displayName) {
      const uid = String(resourceUid || "").trim();
      if (!uid) throw new Error("资源UID为空");
      if (!lastResult) throw new Error("无可用缓存，请先刷新");
      status.textContent = `状态: 正在打开资源 - ${displayName || uid}`;
      const match = await openResourceInCourse(lastResult, uid);
      const modeText =
        match.openMode === "navigating"
          ? `正在前往知识点，稍后自动打开第${match.resourceIndex + 1}个资源`
          : match.openMode === "external-in-page"
            ? `已点击外链资源并返回课程页 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`
            : `已打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`;
      status.textContent = `状态: ${modeText}`;
      syncCurrentResource(lastResult);
      return match;
    }

    function clearAutoLoopTimer() {
      if (!autoLoopTimer) return;
      window.clearTimeout(autoLoopTimer);
      autoLoopTimer = 0;
    }

    function clearAutoProgressTimer() {
      if (!autoProgressTimer) return;
      window.clearInterval(autoProgressTimer);
      autoProgressTimer = 0;
    }

    function clearExamMasteryPollingTimer() {
      if (!examMasteryPollingTimer) return;
      window.clearInterval(examMasteryPollingTimer);
      examMasteryPollingTimer = 0;
    }

    function syncAutoProgressTimer() {
      clearAutoProgressTimer();
      if (!autoRunning) return;
      autoProgressTimer = window.setInterval(() => {
        refreshCurrentResourceProgressForAuto().catch((e) => {
          console.warn("[知识抓取] 自动化进度刷新失败:", e.message);
        });
      }, 2000);
    }

    function isExamRouteForMasteryPolling() {
      const ctx = getExamContext();
      const routeType = String((ctx && ctx.routeType) || "");
      return (
        routeType === "studentReview" ||
        routeType === "point" ||
        routeType === "examPreview"
      );
    }

    async function pollCurrentExamMasteryOnce() {
      if (
        examMasteryPollingBusy ||
        !autoRunning ||
        !isExamAutomationMode(autoMode)
      )
        return;
      if (!isExamRouteForMasteryPolling()) return;
      const ctx = getExamContext();
      const pointId = String(
        (ctx && ctx.nodeUid) || autoExamTargetPointId || "",
      ).trim();
      if (!pointId) return;
      examMasteryPollingBusy = true;
      try {
        const latest = await refreshExamRowMasteryByPoint(pointId);
        const mastery = parseMasteryScoreValue(latest && latest.masteryScore);
        if (mastery != null) {
          panelSetExamStatus(
            `掌握度轮询: ${String((latest && latest.masteryScore) || mastery)}`,
          );
        }
      } catch (e) {
        console.warn(
          "[知识抓取] 掌握度轮询失败:",
          String((e && e.message) || e),
        );
      } finally {
        examMasteryPollingBusy = false;
      }
    }

    function syncExamMasteryPollingTimer() {
      clearExamMasteryPollingTimer();
      if (!(autoRunning && isExamAutomationMode(autoMode))) return;
      if (!isExamRouteForMasteryPolling()) return;
      examMasteryPollingTimer = window.setInterval(() => {
        pollCurrentExamMasteryOnce().catch(() => {});
      }, 1000);
      pollCurrentExamMasteryOnce().catch(() => {});
    }

    function scheduleAutoLoop(delayMs = 2000) {
      clearAutoLoopTimer();
      if (!autoRunning) return;
      autoLoopTimer = window.setTimeout(
        () => {
          runAutoLoop().catch((e) => {
            console.error("[知识抓取] 自动化循环失败:", e);
            status.textContent = `状态: 自动化异常 - ${e.message}`;
            if (autoRunning) scheduleAutoLoop(8000);
          });
        },
        Math.max(0, Number(delayMs || 0)),
      );
    }

    async function refreshResultForAuto(reason) {
      status.textContent = `状态: 自动化刷新中 (${reason})...`;
      const result = await collectRequiredResources({
        concurrency: 20,
        gapMs: 0,
      });
      saveCachedResult(result);
      applyResultToPanel(
        result,
        `状态: 自动化刷新完成 (${result.okCount}/${result.pointCount})`,
      );
      return result;
    }

    async function refreshCurrentResourceProgressForAuto() {
      if (!autoRunning || autoProgressBusy || !lastResult) return;
      const summary = getCurrentResourceSummary(lastResult);
      if (!summary || !summary.pointId || !summary.resourcesUid) return;
      autoProgressBusy = true;
      try {
        const route = parseRoute();
        const endpoint = `${API_BASE}/resources/list-knowledge-resource`;
        const apiRes = await requestWithVariants(
          endpoint,
          buildKnowledgeResourcePayloadVariants(route, {
            pointId: summary.pointId,
          }),
        );
        if (!apiRes.ok) return;
        const latestResources = normalizeRequiredResourcesFromResponse(
          apiRes.data,
        );
        if (!latestResources.length) return;

        const pointMatch = findPointByIdOrName(
          lastResult,
          summary.pointId,
          summary.pointName,
        );
        if (!pointMatch || !Array.isArray(pointMatch.point.requiredResources))
          return;
        const latestMap = new Map(
          latestResources
            .filter(
              (resource) =>
                String((resource && resource.resourcesUid) || "").trim() !== "",
            )
            .map((resource) => [String(resource.resourcesUid), resource]),
        );
        let changed = false;
        pointMatch.point.requiredResources =
          pointMatch.point.requiredResources.map((resource) => {
            const uid = String((resource && resource.resourcesUid) || "");
            const latest = latestMap.get(uid);
            if (!latest) return resource;
            const prevStatus = Number(resource && resource.studyStatus);
            const prevSchedule = Number(resource && resource.schedule);
            const prevStudyTotal = Number(resource && resource.studyTotalTime);
            const prevTotal = Number(resource && resource.resourcesTime);
            const nextStatus = Number(latest && latest.studyStatus);
            const nextSchedule = Number(latest && latest.schedule);
            const nextStudyTotal = Number(latest && latest.studyTotalTime);
            const nextTotal = Number(latest && latest.resourcesTime);
            if (
              prevStatus !== nextStatus ||
              prevSchedule !== nextSchedule ||
              prevStudyTotal !== nextStudyTotal ||
              prevTotal !== nextTotal
            ) {
              changed = true;
              return { ...resource, ...latest };
            }
            return resource;
          });
        if (changed) {
          saveCachedResult(lastResult);
          syncCurrentResource(lastResult);
        }
        updateOverlayProgressText();
      } finally {
        autoProgressBusy = false;
      }
    }

    function markCurrentSummaryAsLearned(result, summary) {
      if (!result || !summary || !summary.resourcesUid) return false;
      const pointMatch = findPointByIdOrName(
        result,
        summary.pointId,
        summary.pointName,
      );
      if (!pointMatch || !Array.isArray(pointMatch.point.requiredResources))
        return false;
      let changed = false;
      pointMatch.point.requiredResources =
        pointMatch.point.requiredResources.map((resource) => {
          if (
            String((resource && resource.resourcesUid) || "") !==
            String(summary.resourcesUid || "")
          )
            return resource;
          const next = { ...resource };
          if (Number(next.studyStatus) !== 1) {
            next.studyStatus = 1;
            changed = true;
          }
          if (summary.isVideo) {
            const totalSeconds = Number(next.resourcesTime);
            const playedSeconds = Number(next.studyTotalTime);
            const canAlignByDuration =
              Number.isFinite(totalSeconds) && totalSeconds > 0;
            if (
              canAlignByDuration &&
              (!Number.isFinite(playedSeconds) || playedSeconds < totalSeconds)
            ) {
              next.studyTotalTime = totalSeconds;
              changed = true;
            }
            if (
              canAlignByDuration &&
              (!Number.isFinite(Number(next.schedule)) ||
                Number(next.schedule) < totalSeconds)
            ) {
              next.schedule = totalSeconds;
              changed = true;
            }
          }
          return changed ? next : resource;
        });
      return changed;
    }

    function parseMasteryScoreValue(raw) {
      if (raw === "" || raw == null) return null;
      const text = String(raw).trim().replace(/%/g, "");
      if (!text) return null;
      const hit = text.match(/-?\d+(?:\.\d+)?/);
      const value = Number(hit ? hit[0] : text);
      return Number.isFinite(value) ? value : null;
    }

    const EXAM_TARGET_MASTERY_SCORE = 100;

    function isExamMasteryReachedByMode(raw, mode = autoMode) {
      const mastery = parseMasteryScoreValue(raw);
      if (mode === AUTO_MODE_EXAM_RETAKE) {
        return mastery != null && mastery >= EXAM_TARGET_MASTERY_SCORE;
      }
      return mastery != null && mastery !== 0;
    }

    function isExamMasteryPendingByMode(raw, mode = autoMode) {
      return !isExamMasteryReachedByMode(raw, mode);
    }

    function pickFirstNonEmptyValue(values, fallback = "") {
      for (const v of values || []) {
        if (v === "" || v == null) continue;
        const s = String(v).trim();
        if (!s) continue;
        return v;
      }
      return fallback;
    }

    function getExamPendingMasteryRows(rows, mode = autoMode) {
      const ctx = examState.lastContext || getExamContext();
      return (rows || [])
        .filter((row) => {
          if (!row) return false;
          const pointId = String(row.pointId || "").trim();
          if (!pointId) return false;
          const status = String(row.status || "").trim();
          if (status === "error" || status === "no-question") return false;
          // 掌握度为空（接口未返回或暂未同步）也应视为未达标，避免被提前跳过。
          return isExamMasteryPendingByMode(row.masteryScore, mode);
        })
        .sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
    }

    async function requestQuestionsPaperDataForPoint(ctx, pointId) {
      const pid = String(pointId || "").trim();
      if (!ctx || !pid) return {};
      const qpPayloads = [
        {
          scMapId: ctx.scMapId,
          courseId: ctx.courseId,
          classId: ctx.classId,
          knowledgeId: pid,
        },
        { courseId: ctx.courseId, classId: ctx.classId, knowledgeId: pid },
        { courseId: ctx.courseId, knowledgeId: pid },
      ];
      let qpRes = null;
      for (const payload of qpPayloads) {
        let r = null;
        const payloadWithDate = { ...payload, dateFormate: getDateFormate() };
        try {
          r = await postExamEncryptedJson(
            API_QUESTIONS_PAPER,
            payloadWithDate,
            6,
          );
        } catch {}
        if (!r || !r.json || !isSuccessResponse(r.json)) {
          r = await postExamJson(API_QUESTIONS_PAPER, payloadWithDate, false);
        }
        if (!r || !r.json || !isSuccessResponse(r.json)) {
          r = await postExamJson(API_QUESTIONS_PAPER, payloadWithDate, true);
        }
        if (r && r.json && isSuccessResponse(r.json)) {
          qpRes = r;
          break;
        }
        if (!qpRes) qpRes = r;
      }
      return (qpRes && qpRes.json && qpRes.json.data) || {};
    }

    function updateExamRowCaches(ctx, nextRow) {
      if (!ctx || !nextRow || !nextRow.pointId) return;
      const idx = Array.isArray(examState.rows)
        ? examState.rows.findIndex(
            (row) =>
              String((row && row.pointId) || "") ===
              String(nextRow.pointId || ""),
          )
        : -1;
      if (idx >= 0) examState.rows[idx] = nextRow;
      try {
        const qpCache = loadExamQpCache(ctx);
        qpCache[nextRow.pointId] = {
          masteryScore: nextRow.masteryScore ?? "",
          highMasteryScore: nextRow.highMasteryScore ?? "",
          masteryChange: nextRow.masteryChange ?? "",
          questionNum: Number(nextRow.questionNum || 0),
          examTestId: String(nextRow.examTestId || ""),
          paperId: String(nextRow.paperId || ""),
          status: String(nextRow.status || "ok"),
          error: String(nextRow.error || ""),
          updatedAt: Date.now(),
        };
        saveExamQpCache(ctx, qpCache);
      } catch {}
      try {
        saveExamRowsCache(ctx, "refresh-nav-target", examState.rows, {
          fullList: true,
        });
      } catch {}
    }

    async function resolveFreshExamTargetRow(row, options = {}) {
      const currentRow = row && typeof row === "object" ? row : null;
      if (!currentRow) throw new Error("未找到试卷记录");
      const ctx = options.ctx || examState.lastContext || getExamContext();
      const pointId = String(currentRow.pointId || "").trim();
      if (!ctx || !ctx.courseId || !pointId) {
        if (String(currentRow.targetUrl || "").trim()) return currentRow;
        throw new Error("当前知识点缺少可用试卷信息");
      }

      const data = await requestQuestionsPaperDataForPoint(ctx, pointId);
      const masteryScore = pickFirstNonEmptyValue(
        [
          data.masteryScore,
          data.currentMasteryScore,
          data.mastery,
          data.masteryRate,
          data.knowledgeMastery,
          data.score,
          currentRow.masteryScore,
        ],
        "",
      );
      const highMasteryScore = pickFirstNonEmptyValue(
        [
          data.highMasteryScore,
          data.historyHighMasteryScore,
          data.highScore,
          currentRow.highMasteryScore,
        ],
        "",
      );
      const masteryChange = pickFirstNonEmptyValue(
        [
          data.masteryChange,
          data.masteryDelta,
          data.delta,
          currentRow.masteryChange,
        ],
        "",
      );
      const questionNum = Number(
        pickFirstNonEmptyValue([data.questionNum, currentRow.questionNum], 0) ||
          0,
      );
      const examTestId = String(
        pickFirstNonEmptyValue([data.examTestId, currentRow.examTestId], "") ||
          "",
      ).trim();
      const paperId = String(
        pickFirstNonEmptyValue([data.paperId, currentRow.paperId], "") || "",
      ).trim();
      let status = String(currentRow.status || "ok");
      if (questionNum <= 0) status = "no-question";
      if (!examTestId || !paperId)
        status = status === "ok" ? "missing-ids" : status;
      const targetUrl =
        examTestId && paperId
          ? buildExamTargetUrl({
              examTestId,
              courseId: ctx.courseId,
              pointName: currentRow.pointName,
              classId: ctx.classId,
              pointId,
              paperId,
            })
          : "";
      const nextRow = {
        ...currentRow,
        masteryScore,
        highMasteryScore,
        masteryChange,
        questionNum,
        examTestId,
        paperId,
        targetUrl,
        status,
        error: status === "error" ? String(currentRow.error || "") : "",
      };
      updateExamRowCaches(ctx, nextRow);
      if (!nextRow.targetUrl) {
        throw new Error(
          nextRow.status === "no-question"
            ? "当前知识点暂无试卷"
            : "未获取到可用试卷链接",
        );
      }
      await ensureExamOpened(nextRow);
      return nextRow;
    }

    async function refreshExamRowMasteryByPoint(pointId) {
      const pid = String(pointId || "").trim();
      if (!pid || !Array.isArray(examState.rows) || !examState.rows.length)
        return null;
      const idx = examState.rows.findIndex(
        (row) => String((row && row.pointId) || "") === pid,
      );
      if (idx < 0) return null;
      const row = examState.rows[idx];
      const ctx = examState.lastContext || getExamContext();
      const data = await requestQuestionsPaperDataForPoint(ctx, pid);
      const masteryScore = pickFirstNonEmptyValue(
        [
          data.masteryScore,
          data.currentMasteryScore,
          data.mastery,
          data.masteryRate,
          data.knowledgeMastery,
          data.score,
          row.masteryScore,
        ],
        "",
      );
      const highMasteryScore = pickFirstNonEmptyValue(
        [
          data.highMasteryScore,
          data.historyHighMasteryScore,
          data.highScore,
          row.highMasteryScore,
        ],
        "",
      );
      const masteryChange = pickFirstNonEmptyValue(
        [data.masteryChange, data.masteryDelta, data.delta, row.masteryChange],
        "",
      );
      const nextRow = { ...row, masteryScore, highMasteryScore, masteryChange };
      examState.rows[idx] = nextRow;
      try {
        saveExamRowsCache(ctx, "auto-refresh-mastery", examState.rows, {
          fullList: true,
        });
      } catch {}
      renderExamResults(examState.rows);
      return nextRow;
    }

    async function ensureExamRowsReadyForAuto() {
      if (Array.isArray(examState.rows) && examState.rows.length > 0)
        return examState.rows;
      await runExtractExamLinks();
      return Array.isArray(examState.rows) ? examState.rows : [];
    }

    function pickNextExamAutoRow(rows, options = {}) {
      const excludePointId = String(
        (options && options.excludePointId) || "",
      ).trim();
      const list = getExamPendingMasteryRows(rows, autoMode).filter(
        (row) =>
          !excludePointId ||
          String((row && row.pointId) || "").trim() !== excludePointId,
      );
      if (!list.length) return null;
      if (autoExamTargetPointId) {
        const hit = list.find(
          (row) =>
            String(row.pointId || "") === String(autoExamTargetPointId || ""),
        );
        if (hit) return hit;
      }
      if (pendingSubmittedPointId) {
        const filtered = list.filter(
          (row) =>
            String((row && row.pointId) || "") !==
            String(pendingSubmittedPointId || ""),
        );
        if (filtered.length) return filtered[0] || null;
      }
      return list[0] || null;
    }

    async function syncPendingSubmittedMasteryIfNeeded() {
      const pid = String(pendingSubmittedPointId || "").trim();
      if (!pid) return false;
      await ensureExamRowsReadyForAuto();
      const latest = await refreshExamRowMasteryByPoint(pid);
      const elapsed = Date.now() - Number(pendingSubmittedAt || 0);
      const ctx = getExamContext();
      const routeType = String((ctx && ctx.routeType) || "");
      const currentQuestionStem = getCurrentExamQuestionStem();
      const currentOptions = getCurrentExamOptionItems();
      const currentQuestionType = getCurrentExamQuestionType();
      const backOnAnsweringPage =
        routeType === "studentReview" &&
        (!!String(currentQuestionStem || "").trim() ||
          !!String(currentQuestionType || "").trim() ||
          (Array.isArray(currentOptions) && currentOptions.length > 0));
      if (backOnAnsweringPage) {
        setPendingSubmittedState("");
        setExamAutomationRuntimeStatus("已重新进入答题页，继续自动作答...");
        return false;
      }
      const pointStats = readCurrentExamResultStats();
      const pointStatsText = formatPointResultStatsText(pointStats);
      const allCorrect = isExamResultAllCorrect(pointStats);
      const wrongSyncState = readExamWrongSyncState(
        getExamWrongSyncStateKey(ctx),
      );
      if (
        routeType === "studentReview" &&
        elapsed < 120000 &&
        !pointStatsText
      ) {
        const backTriggered = tryReturnToPointFromStudentReview();
        setExamAutomationRuntimeStatus(
          backTriggered
            ? "交卷后仍停留在试卷页，正在返回结果页获取答对率..."
            : "交卷后正在等待结果页答对率同步...",
        );
        scheduleAutoLoop(backTriggered ? 1800 : 2200);
        return true;
      }
      if (
        autoMode === AUTO_MODE_EXAM_RETAKE &&
        pointStatsText &&
        !allCorrect &&
        routeType === "examPreview" &&
        wrongSyncState === "done"
      ) {
        setExamAutomationRuntimeStatus(
          `已提交，${pointStatsText}，错题参考答案已回传，继续后续试卷...`,
        );
        setPendingSubmittedState("");
        return false;
      }
      if (
        autoMode === AUTO_MODE_EXAM_RETAKE &&
        pointStatsText &&
        allCorrect &&
        isExamMasteryPendingByMode(latest && latest.masteryScore, autoMode)
      ) {
        const nextPending = pickNextExamAutoRow(examState.rows, {
          excludePointId: pid,
        });
        setPendingSubmittedState("");
        if (!nextPending) return false;
        const nextPointId = String(nextPending.pointId || "").trim();
        autoExamTargetPointId = nextPointId;
        persistAutoState(true);
        setExamAutomationRuntimeStatus(
          `已提交，${pointStatsText}，当前知识点已答对，转到下一个未满掌握度知识点 - ${nextPending.pointName || nextPending.pointId || "-"}`,
        );
        try {
          const freshNext = await resolveFreshExamTargetRow(nextPending);
          location.assign(String(freshNext.targetUrl));
        } catch (e) {
          setExamAutomationRuntimeStatus(
            `跳转下一个知识点失败 - ${String((e && e.message) || e)}`,
          );
          scheduleAutoLoop(2200);
        }
        return true;
      }
      if (autoMode === AUTO_MODE_EXAM_RETAKE && pointStatsText && !allCorrect) {
        setExamAutomationRuntimeStatus(
          `已提交，${pointStatsText}，检测到仍有错题，先回传解析答案再继续...`,
        );
        await maybeHandleWrongAnswerSyncFlow();
        scheduleAutoLoop(1800);
        return true;
      }
      if (autoMode === AUTO_MODE_EXAM_RETAKE && pointStatsText && allCorrect) {
        setPendingSubmittedState("");
        return false;
      }
      if (autoMode === AUTO_MODE_EXAM_RETAKE && !pointStatsText) {
        if (elapsed < 120000) {
          setExamAutomationRuntimeStatus(
            pointStatsText
              ? `已提交，${pointStatsText}，等待答对率最终同步 (${Math.ceil((120000 - elapsed) / 1000)}s)...`
              : `已提交，等待答对率同步 (${Math.ceil((120000 - elapsed) / 1000)}s)...`,
          );
          scheduleAutoLoop(2200);
          return true;
        }
        setPendingSubmittedState("");
        return false;
      }
      if (isExamMasteryReachedByMode(latest && latest.masteryScore, autoMode)) {
        if (
          autoMode === AUTO_MODE_EXAM_RETAKE &&
          !pointStatsText &&
          elapsed < 120000
        ) {
          setExamAutomationRuntimeStatus(
            `已提交，掌握度已达标，等待答对率统计 (${Math.ceil((120000 - elapsed) / 1000)}s)...`,
          );
          scheduleAutoLoop(1600);
          return true;
        }
        setPendingSubmittedState("");
        return false;
      }
      if (elapsed < 120000) {
        setExamAutomationRuntimeStatus(
          pointStatsText
            ? `已提交，${pointStatsText}，等待掌握度更新 (${Math.ceil((120000 - elapsed) / 1000)}s)...`
            : `已提交，等待掌握度更新 (${Math.ceil((120000 - elapsed) / 1000)}s)...`,
        );
        scheduleAutoLoop(2200);
        return true;
      }
      setPendingSubmittedState("");
      return false;
    }

    async function handleAfterPaperSubmitted() {
      const ctx = getExamContext();
      const currentPointId = String(
        autoExamTargetPointId || (ctx && ctx.nodeUid) || "",
      ).trim();
      await ensureExamRowsReadyForAuto();
      if (!currentPointId) return false;
      setExamAutomationRuntimeStatus("交卷完成，正在检查答对率与掌握度...");
      setPendingSubmittedState(currentPointId, Date.now());

      const initialStats = await waitForExamResultStats(12000, 400);
      const initialStatsText = formatPointResultStatsText(initialStats);
      if (initialStatsText) {
        setExamAutomationRuntimeStatus(`交卷结果已获取：${initialStatsText}`, {
          holdMs: 2400,
          force: true,
        });
      } else {
        const backToPointTriggered = tryReturnToPointFromStudentReview();
        setExamAutomationRuntimeStatus(
          backToPointTriggered
            ? "交卷后暂未拿到答对率，正在返回结果页获取统计..."
            : "交卷后暂未拿到答对率，继续等待同步...",
        );
      }

      let latest = await refreshExamRowMasteryByPoint(currentPointId);
      if (autoMode === AUTO_MODE_EXAM_RETAKE) {
        const finalPointStats = readCurrentExamResultStats();
        const finalPointStatsText = formatPointResultStatsText(finalPointStats);
        const finalAllCorrect = isExamResultAllCorrect(finalPointStats);
        if (!finalPointStatsText) {
          setExamAutomationRuntimeStatus(
            "已提交，正在等待答对率统计回传后继续...",
          );
          scheduleAutoLoop(2200);
          return true;
        }
        if (!finalAllCorrect) {
          setExamAutomationRuntimeStatus(
            `已提交，${finalPointStatsText}，存在错题，正在前往作答记录与解析并回传答案...`,
          );
          await maybeHandleWrongAnswerSyncFlow();
          scheduleAutoLoop(2200);
          return true;
        }
        if (
          isExamMasteryPendingByMode(latest && latest.masteryScore, autoMode)
        ) {
          setPendingSubmittedState("");
          const nextRetake = pickNextExamAutoRow(examState.rows, {
            excludePointId: currentPointId,
          });
          if (!nextRetake) return false;
          const nextRetakePointId = String(nextRetake.pointId || "").trim();
          autoExamTargetPointId = nextRetakePointId;
          persistAutoState(true);
          setExamAutomationRuntimeStatus(
            `已提交，${finalPointStatsText}，当前知识点已答对，前往下一个未满掌握度知识点 - ${nextRetake.pointName || nextRetake.pointId || "-"}`,
          );
          try {
            const freshNextRetake = await resolveFreshExamTargetRow(nextRetake);
            location.assign(String(freshNextRetake.targetUrl));
          } catch (e) {
            setExamAutomationRuntimeStatus(
              `跳转下一个知识点失败 - ${String((e && e.message) || e)}`,
            );
            scheduleAutoLoop(2200);
          }
          return true;
        }
      } else {
        for (let i = 0; i < 12; i++) {
          const pointStats = readCurrentExamResultStats();
          const pointStatsText = formatPointResultStatsText(pointStats);
          if (pointStatsText) {
            setExamAutomationRuntimeStatus(
              `${pointStatsText}，正在同步掌握度...`,
            );
          }
          const masteryReached = isExamMasteryReachedByMode(
            latest && latest.masteryScore,
            autoMode,
          );
          if (masteryReached) break;
          if (i === 3 || i === 7) {
            try {
              await runExtractExamLinks();
            } catch {}
          }
          await sleep(2000);
          latest = await refreshExamRowMasteryByPoint(currentPointId);
        }
      }

      const finalPointStats = readCurrentExamResultStats();
      const finalPointStatsText = formatPointResultStatsText(finalPointStats);
      const finalAllCorrect = isExamResultAllCorrect(finalPointStats);
      if (autoMode === AUTO_MODE_EXAM_RETAKE && !finalPointStatsText) {
        setExamAutomationRuntimeStatus(
          "已提交，正在等待答对率统计回传后继续...",
        );
        scheduleAutoLoop(2200);
        return true;
      }
      if (
        autoMode === AUTO_MODE_EXAM_RETAKE &&
        finalPointStatsText &&
        !finalAllCorrect
      ) {
        setExamAutomationRuntimeStatus(
          `已提交，${finalPointStatsText}，存在错题，正在前往作答记录与解析并回传答案...`,
        );
        await maybeHandleWrongAnswerSyncFlow();
        scheduleAutoLoop(2200);
        return true;
      }
      if (
        autoMode === AUTO_MODE_EXAM_RETAKE &&
        finalPointStatsText &&
        finalAllCorrect &&
        isExamMasteryPendingByMode(latest && latest.masteryScore, autoMode)
      ) {
        setPendingSubmittedState("");
        const nextRetake = pickNextExamAutoRow(examState.rows, {
          excludePointId: currentPointId,
        });
        if (!nextRetake) return false;
        const nextRetakePointId = String(nextRetake.pointId || "").trim();
        autoExamTargetPointId = nextRetakePointId;
        persistAutoState(true);
        setExamAutomationRuntimeStatus(
          `已提交，${finalPointStatsText}，当前知识点已答对，前往下一个未满掌握度知识点 - ${nextRetake.pointName || nextRetake.pointId || "-"}`,
        );
        try {
          const freshNextRetake = await resolveFreshExamTargetRow(nextRetake);
          location.assign(String(freshNextRetake.targetUrl));
        } catch (e) {
          setExamAutomationRuntimeStatus(
            `跳转下一个知识点失败 - ${String((e && e.message) || e)}`,
          );
          scheduleAutoLoop(2200);
        }
        return true;
      }
      if (isExamMasteryPendingByMode(latest && latest.masteryScore, autoMode)) {
        setExamAutomationRuntimeStatus(
          finalPointStatsText
            ? `已提交，${finalPointStatsText}，等待掌握度更新后继续...`
            : "已提交，等待掌握度更新后继续...",
        );
        scheduleAutoLoop(2200);
        return true;
      }
      setPendingSubmittedState("");

      const next = pickNextExamAutoRow(examState.rows);
      if (!next) {
        stopAutoLoop(
          `状态: 已完成当前试卷作答，全部待处理知识点已处理${finalPointStatsText ? `（${finalPointStatsText}）` : ""}`,
        );
        return true;
      }

      const nextPointId = String(next.pointId || "").trim();
      if (nextPointId && nextPointId === currentPointId) {
        setExamAutomationRuntimeStatus(
          "已提交并更新掌握度，等待下一轮试卷定位...",
        );
        scheduleAutoLoop(1800);
        return true;
      }

      autoExamTargetPointId = nextPointId;
      persistAutoState(true);
      setExamAutomationRuntimeStatus(
        `当前掌握度已更新，前往下一个待处理知识点 - ${next.pointName || next.pointId || "-"}`,
      );
      try {
        const freshNext = await resolveFreshExamTargetRow(next);
        location.assign(String(freshNext.targetUrl));
      } catch (e) {
        setExamAutomationRuntimeStatus(
          `跳转下一个试卷失败 - ${String((e && e.message) || e)}`,
        );
        scheduleAutoLoop(2200);
      }
      return true;
    }

    async function ensureExamAutoOnUnfinishedPaper() {
      await ensureExamRowsReadyForAuto();
      const next = pickNextExamAutoRow(examState.rows);
      if (!next) {
        stopAutoLoop("状态: 自动答题完成，暂无待处理知识点");
        return true;
      }

      const ctx = getExamContext();
      const currentPointId = String((ctx && ctx.nodeUid) || "").trim();
      const nextPointId = String(next.pointId || "").trim();
      const onReviewPage =
        String((ctx && ctx.routeType) || "") === "studentReview";
      const onExpectedPaper = !!(
        onReviewPage &&
        currentPointId &&
        nextPointId &&
        currentPointId === nextPointId
      );

      if (onExpectedPaper) return false;

      autoExamTargetPointId = nextPointId;
      persistAutoState(true);
      setExamAutomationRuntimeStatus(
        `正在前往待处理知识点 - ${next.pointName || next.pointId || "-"}`,
      );
      try {
        const freshNext = await resolveFreshExamTargetRow(next);
        location.assign(String(freshNext.targetUrl));
      } catch (e) {
        setExamAutomationRuntimeStatus(
          `跳转待处理知识点失败 - ${String((e && e.message) || e)}`,
        );
        scheduleAutoLoop(1800);
      }
      return true;
    }

    async function runExamAutoLoop() {
      if (!autoRunning) return;
      if (!getStoredExamQueryToken()) {
        notifyTokenUnavailable("请先设置查询 Token");
        stopExamAutomationByTokenError("请先设置题库 Token");
        return;
      }
      if (await syncPendingSubmittedMasteryIfNeeded()) return;
      const jumpedToPending = await ensureExamAutoOnUnfinishedPaper();
      if (jumpedToPending) return;
      if (isCurrentPaperAnswerRecordComplete()) {
        setExamAutomationRuntimeStatus("已完成当前试卷作答，正在提交试卷...");
        const submitted = await submitCurrentPaperIfPossible();
        if (submitted) {
          await handleAfterPaperSubmitted();
        } else {
          setExamAutomationRuntimeStatus(
            "已完成当前试卷作答，等待提交按钮可用...",
          );
          scheduleAutoLoop(1600);
        }
        return;
      }
      const answered = await tryAutoAnswerCurrentExamQuestion();
      if (answered) {
        if (isCurrentPaperAnswerRecordComplete()) {
          setExamAutomationRuntimeStatus("已完成当前试卷作答，正在提交试卷...");
          const submitted = await submitCurrentPaperIfPossible();
          if (submitted) {
            await handleAfterPaperSubmitted();
          } else {
            setExamAutomationRuntimeStatus(
              "已完成当前试卷作答，等待提交按钮可用...",
            );
            scheduleAutoLoop(1600);
          }
          return;
        }
        const moved = await goNextExamQuestionIfPossible();
        setExamAutomationRuntimeStatus(
          moved
            ? "已自动作答并进入下一题"
            : "已自动作答当前题（未找到下一题按钮）",
        );
        scheduleAutoLoop(moved ? 1100 : 1800);
        return;
      }
      setExamAutomationRuntimeStatus(
        `${getExamAutomationModeLabel(autoMode)}处理中（等待题目加载或题库命中）...`,
      );
      scheduleAutoLoop(1800);
    }

    function stopAutoLoop(message) {
      const shouldCelebrate = shouldCelebrateAutomationStop(message);
      clearAutoLoopTimer();
      setAutoControlRunning(false);
      autoTargetUid = "";
      autoExamTargetPointId = "";
      setPendingSubmittedState("");
      if (message) status.textContent = message;
      if (isExamAutomationMode(autoMode)) {
        setExamProgressStatusText(message, { useModeIdleFallback: true });
      }
      if (shouldCelebrate) {
        setAutomationOverlayPinnedMessage("自动化任务完成", 3200);
      }
    }

    async function runAutoLoop() {
      if (!autoRunning || autoLoopBusy) return;
      autoLoopBusy = true;
      try {
        if (isExamAutomationMode(autoMode)) {
          await runExamAutoLoop();
          return;
        }
        if (!lastResult) {
          await refreshResultForAuto("初始化");
          if (!autoRunning) return;
        }

        let pending = findLatestUnfinishedResource(
          lastResult && lastResult.modules,
        );
        if (!pending || !pending.resourceUid) {
          stopAutoLoop("状态: 自动化完成，已无未完成资源");
          return;
        }
        const current = getCurrentResourceSummary(lastResult);
        const hasVideoContext =
          !current || !current.isVideo || !!getCurrentVideoSrc();
        const onTarget =
          current &&
          hasVideoContext &&
          String(current.resourcesUid || "") ===
            String(pending.resourceUid || "");

        if (!onTarget) {
          externalStuckCount = 0;
          const pendingUid = String(pending.resourceUid || "");
          const targetUid = String(autoTargetUid || "");
          const isSameTarget = !!targetUid && targetUid === pendingUid;
          if (!current && isSameTarget) {
            status.textContent = "状态: 未识别到当前资源，正在刷新目标完成状态";
            await refreshResultForAuto("检查目标完成状态");
            if (!autoRunning) return;
            pending = findLatestUnfinishedResource(
              lastResult && lastResult.modules,
            );
            if (!pending) {
              stopAutoLoop("状态: 自动化完成，已全部学习");
              return;
            }
            if (String(pending.resourceUid || "") !== targetUid) {
              autoTargetUid = String(pending.resourceUid || "");
              persistAutoState(true);
              status.textContent =
                "状态: 目标资源已完成，准备前往下一个未完成资源";
              scheduleAutoLoop(200);
              return;
            }
            status.textContent = "状态: 当前目标仍未完成，等待后重试";
            scheduleAutoLoop(2500);
            return;
          }

          autoTargetUid = pendingUid;
          persistAutoState(true);
          status.textContent = `状态: 自动前往未完成资源 - ${pending.resourceName}`;
          const match = await openResourceInCourse(
            lastResult,
            pending.resourceUid,
          );
          const modeText =
            match.openMode === "navigating"
              ? `正在前往知识点，稍后自动打开第${match.resourceIndex + 1}个资源`
              : match.openMode === "external-in-page"
                ? `已点击外链资源并返回课程页 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`
                : `已自动打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`;
          status.textContent = `状态: ${modeText}`;
          if (match.openMode === "navigating") return;
          scheduleAutoLoop(3000);
          return;
        }

        if (isSummaryLearned(current)) {
          externalStuckCount = 0;
          const marked = markCurrentSummaryAsLearned(lastResult, current);
          if (marked) {
            saveCachedResult(lastResult);
            syncCurrentResource(lastResult);
            renderNextPending(lastResult);
          }
          const currentUid = String(
            (current && current.resourcesUid) || "",
          ).trim();
          pending = findLatestUnfinishedResource(
            lastResult && lastResult.modules,
            currentUid ? { excludeResourceUid: currentUid } : undefined,
          );
          if (!pending) {
            stopAutoLoop("状态: 自动化完成，已全部学习");
            return;
          }
          autoTargetUid = String(pending.resourceUid || "");
          persistAutoState(true);
          status.textContent = `状态: 学习进度已完成，自动前往下一个未完成资源 - ${pending.resourceName}`;
          const match = await openResourceInCourse(
            lastResult,
            pending.resourceUid,
          );
          const modeText =
            match.openMode === "navigating"
              ? `正在前往知识点，稍后自动打开第${match.resourceIndex + 1}个资源`
              : match.openMode === "external-in-page"
                ? `已点击外链资源并返回课程页 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`
                : `已自动打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`;
          status.textContent = `状态: ${modeText}`;
          if (match.openMode === "navigating") return;
          scheduleAutoLoop(2500);
          return;
        }

        if (current && current.isExternal && current.resourcesUid) {
          status.textContent = "状态: 外链资源未完成，正在重试点击";
          try {
            await openResourceInCourse(lastResult, current.resourcesUid);
            await sleep(1200);
          } catch (e) {
            console.warn("[知识抓取] 外链资源重试点击失败:", e.message);
          }
        }

        await refreshResultForAuto("检查目标完成状态");
        if (!autoRunning) return;
        pending = findLatestUnfinishedResource(
          lastResult && lastResult.modules,
        );
        if (!pending) {
          stopAutoLoop("状态: 自动化完成，已全部学习");
          return;
        }
        if (String(pending.resourceUid || "") !== String(autoTargetUid || "")) {
          externalStuckCount = 0;
          autoTargetUid = String(pending.resourceUid || "");
          persistAutoState(true);
          status.textContent = "状态: 已更新资源状态，准备前往下一个未完成资源";
          scheduleAutoLoop(1200);
          return;
        }
        if (
          current &&
          current.isExternal &&
          String(current.resourcesUid || "") === String(autoTargetUid || "")
        ) {
          externalStuckCount += 1;
          if (externalStuckCount >= 3) {
            status.textContent =
              "状态: 外链资源状态卡住，正在自动刷新页面后继续";
            persistAutoState(true);
            window.setTimeout(() => {
              try {
                location.reload();
              } catch {}
            }, 300);
            return;
          }
        } else {
          externalStuckCount = 0;
        }
        status.textContent = "状态: 当前目标仍未完成，等待后重试";
        scheduleAutoLoop(6000);
      } finally {
        autoLoopBusy = false;
      }
    }

    async function detectUnfinishedResource(refreshFirst) {
      if (isExamAutomationMode(autoMode)) {
        setExamAutomationRuntimeStatus(
          getStoredExamQueryToken()
            ? `已进入${getExamAutomationModeLabel(autoMode)}模式`
            : `请先设置题库 Token 后再开启${getExamAutomationModeLabel(autoMode)}`,
        );
        return { mode: "exam-auto-answer" };
      }
      if (refreshFirst || !lastResult) {
        await refreshResultForAuto("检测未完成资源");
      }
      const pending = findLatestUnfinishedResource(
        lastResult && lastResult.modules,
      );
      if (!pending) {
        status.textContent = "状态: 未检测到未完成资源";
      } else {
        status.textContent = `状态: 检测到未完成资源 - ${pending.resourceName}`;
      }
      return pending;
    }

    function renderNextPending(result) {
      const item = findLatestUnfinishedResource(result && result.modules);
      nextPending.innerHTML = "";

      const headerRow = document.createElement("div");
      headerRow.style.cssText =
        "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;";

      const title = document.createElement("div");
      title.textContent = "最近未完成资源";
      title.style.cssText =
        "color:#dc2626;font-weight:700;line-height:1.3;font-size:14px;";

      const progress = document.createElement("div");
      const progressRatio = getRequiredProgressRatio(result);
      progress.textContent = progressRatio
        ? `总进度 ${progressRatio}`
        : "总进度 --/--";
      progress.style.cssText =
        "color:#1d4ed8;font-weight:700;line-height:1.3;font-size:12px;flex:0 0 auto;";

      headerRow.appendChild(title);
      headerRow.appendChild(progress);
      nextPending.appendChild(headerRow);

      if (!item) {
        const empty = document.createElement("div");
        empty.textContent = "暂无";
        empty.style.cssText = "color:#64748b;font-size:12px;line-height:1.45;";
        nextPending.appendChild(empty);
        return;
      }

      const path = document.createElement("div");
      const pathParts = [item.moduleName, item.unitName, item.pointName].filter(
        Boolean,
      );
      path.textContent = pathParts.join(" / ") || "未定位到所属知识点";
      path.style.cssText =
        "color:#64748b;font-size:12px;line-height:1.45;margin-bottom:4px;";

      const resourceRow = document.createElement("div");
      resourceRow.style.cssText =
        "display:flex;align-items:flex-start;gap:8px;min-width:0;margin-bottom:4px;";

      const name = document.createElement(item.resourceUid ? "button" : "div");
      name.textContent = item.resourceName;
      name.style.cssText = item.resourceUid
        ? "display:block;flex:1 1 auto;min-width:0;color:#0f172a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.45;font-size:14px;border:none;background:transparent;padding:0;text-align:left;cursor:pointer;"
        : "display:block;flex:1 1 auto;min-width:0;color:#0f172a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.45;font-size:14px;";
      if (item.resourceUid) {
        name.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!lastResult) {
            status.textContent = "状态: 无可用缓存，请先刷新";
            return;
          }
          name.disabled = true;
          const originalText = name.textContent;
          name.textContent = "打开中...";
          try {
            await openResourceWithPanelFlow(
              item.resourceUid,
              item.resourceName,
            );
          } catch (err) {
            console.error("[知识抓取] 打开最近未完成资源失败:", err);
            status.textContent = `状态: 打开失败 - ${err && err.message ? err.message : "未知错误"}`;
          } finally {
            name.textContent = originalText;
            name.disabled = false;
          }
        });
      }

      const tagsWrap = document.createElement("div");
      tagsWrap.style.cssText =
        "display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;";
      appendTag(tagsWrap, item.typeText, "type");

      nextPending.appendChild(path);
      resourceRow.appendChild(name);
      resourceRow.appendChild(tagsWrap);
      nextPending.appendChild(resourceRow);
    }

    function renderCurrentResource(result) {
      const summary = getCurrentResourceSummary(result);
      if (!summary) {
        currentResource.textContent = "当前资源: 未识别";
        return;
      }

      currentResource.innerHTML = "";

      const title = document.createElement("div");
      title.textContent = "当前资源";
      title.style.cssText =
        "color:#16a34a;font-weight:700;margin-bottom:4px;line-height:1.3;font-size:14px;";

      const path = document.createElement("div");
      path.textContent =
        [summary.moduleName, summary.unitName, summary.pointName]
          .filter(Boolean)
          .join(" / ") || "未定位到知识点";
      path.style.cssText =
        "color:#64748b;font-size:12px;line-height:1.45;margin-bottom:4px;";

      const progress = document.createElement("div");
      const progressMain = getCurrentLearningProgressText(summary);
      const progressDetail = getCurrentLearningDurationText(summary);
      progress.textContent = progressDetail
        ? `${progressMain} · ${progressDetail}`
        : progressMain;
      progress.style.cssText =
        "color:#0f172a;font-size:13px;line-height:1.45;margin-bottom:5px;";

      const resourceRow = document.createElement("div");
      resourceRow.style.cssText =
        "display:flex;align-items:flex-start;gap:8px;min-width:0;margin-bottom:4px;";

      const name = document.createElement("div");
      const indexText =
        summary.resourceIndex >= 0 && summary.resourceCount > 0
          ? `第 ${summary.resourceIndex + 1} / ${summary.resourceCount} 个`
          : `共 ${summary.resourceCount || 0} 个`;
      name.textContent = `${indexText} · ${summary.resourceName}`;
      name.style.cssText =
        "display:block;flex:1 1 auto;min-width:0;color:#0f172a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.45;font-size:14px;";

      const tagsWrap = document.createElement("div");
      tagsWrap.style.cssText =
        "display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;";
      const typeText = getResourceTypeText({
        resourcesType: summary.resourcesType,
        resourcesDataType: summary.resourcesDataType,
      });
      appendTag(tagsWrap, typeText, "type");
      appendTag(
        tagsWrap,
        summary.isExternal ? "外链" : "站内",
        summary.isExternal ? "todo" : "done",
      );

      currentResource.appendChild(title);
      currentResource.appendChild(path);
      if (progress.textContent) currentResource.appendChild(progress);
      resourceRow.appendChild(name);
      resourceRow.appendChild(tagsWrap);
      currentResource.appendChild(resourceRow);
    }

    function syncCurrentResource(result) {
      if (!result) {
        currentResource.textContent = "当前资源: 未识别";
        updateOverlayProgressText();
        return;
      }
      renderCurrentResource(result);
      updateOverlayProgressText();
    }

    function applyResultToPanel(result, statusText) {
      if (!result) return;
      lastResult = result;
      if (
        typeof result.moduleCount === "number" &&
        typeof result.unitCount === "number"
      ) {
        learningTotal = Number(result.pointCount || 0);
        learningDone = Number(result.okCount || learningTotal);
      } else {
        const pointCount = Number(result.pointCount || 0);
        const okCount = Number(result.okCount || 0);
        learningTotal = pointCount;
        learningDone = okCount;
      }
      if (statusText) status.textContent = statusText;
      updateLearningStatusCardVisual();
      renderNextPending(result);
      syncCurrentResource(result);
      updateOverlayProgressText();
      renderTree(treeWrap, result, {
        onOpenResource: async (resource, point) => {
          await openResourceWithPanelFlow(
            resource.resourcesUid,
            resource.resourcesName ||
              resource.resourcesFileName ||
              resource.resourcesUid,
          );
        },
      });
      resumePendingResource(result, (text) => {
        status.textContent = text;
      })
        .then((resumed) => {
          if (resumed) syncCurrentResource(result);
        })
        .catch((e) => {
          console.error("[知识抓取] 续开资源失败:", e);
          status.textContent = `状态: 续开资源失败 - ${e.message}`;
          clearPendingResource();
        });
    }

    const cachedResult = loadCachedResult();
    if (cachedResult) {
      const cacheTime = cachedResult.cachedAt
        ? new Date(cachedResult.cachedAt).toLocaleString()
        : "未知时间";
      applyResultToPanel(cachedResult, `状态: 已从缓存恢复 (${cacheTime})`);
    }
    updateMaskToggleButton();
    const persistedAuto = loadAutomationState();
    const persistedPendingSubmitted = loadExamPendingSubmittedState();
    autoTargetUid =
      persistedAuto && persistedAuto.targetUid ? persistedAuto.targetUid : "";
    autoExamTargetPointId =
      persistedAuto && persistedAuto.examTargetPointId
        ? persistedAuto.examTargetPointId
        : "";
    autoMode = normalizeAutomationState(persistedAuto).mode;
    pendingSubmittedPointId =
      persistedPendingSubmitted && persistedPendingSubmitted.pointId
        ? persistedPendingSubmitted.pointId
        : "";
    pendingSubmittedAt =
      persistedPendingSubmitted && persistedPendingSubmitted.submittedAt
        ? Number(persistedPendingSubmitted.submittedAt || 0)
        : 0;
    setAutoControlRunning(!!(persistedAuto && persistedAuto.enabled));
    if (autoRunning) {
      setExamAutomationRuntimeStatus(
        pendingSubmittedPointId
          ? `已恢复自动化任务 (${getExamAutomationModeLabel(autoMode)})，继续等待交卷后的答对率与掌握度同步...`
          : `已恢复自动化任务 (${getExamAutomationModeLabel(autoMode)})`,
      );
      scheduleAutoLoop(1200);
    }
    bindAutomationStateSync();

    async function startExamAutomationByMode(mode) {
      clearAutoLoopTimer();
      setExamAutomationMode(mode, { persist: false, render: true });
      setExamProgressStatusText(
        `${getExamAutomationModeLabel(autoMode)}准备中...`,
      );
      autoTargetUid = "";
      autoExamTargetPointId = "";
      setPendingSubmittedState("");
      const movedToFirst = await ensureStartFromFirstExamQuestion();
      if (!movedToFirst) {
        setExamAutomationRuntimeStatus("未能定位到第1题，已从当前题继续自动化");
      }
      setAutoControlRunning(true);
      await detectUnfinishedResource(!examState.rows.length);
      scheduleAutoLoop(200);
    }

    btnExamAutoRun.addEventListener("click", async () => {
      if (autoRunning) {
        stopAutoLoop("状态: 已停止自动化");
        return;
      }
      try {
        await startExamAutomationByMode(autoMode);
      } catch (e) {
        console.error("[知识抓取] 开启习题自动化失败:", e);
        stopAutoLoop(`状态: 自动化启动失败 - ${e.message}`);
      }
    });
    btnExamRefreshMastery.addEventListener("click", async () => {
      const ctx = examState.lastContext || getExamContext();
      const pointId = String((ctx && ctx.nodeUid) || "").trim();
      if (!pointId) {
        panelSetExamStatus("刷新失败：未识别当前知识点");
        return;
      }
      btnExamRefreshMastery.disabled = true;
      panelSetExamStatus("正在刷新当前知识点掌握度...");
      try {
        await ensureExamRowsReadyForAuto();
        const latest = await refreshExamRowMasteryByPoint(pointId);
        if (!latest) {
          panelSetExamStatus("刷新失败：当前知识点不在测试链接列表中");
          return;
        }
        const mastery =
          String(
            latest.masteryScore == null ? "" : latest.masteryScore,
          ).trim() || "-";
        panelSetExamStatus(`掌握度已刷新：${mastery}`);
        renderExamOverviewPanel();
      } catch (e) {
        panelSetExamStatus(`刷新失败：${String((e && e.message) || e)}`);
      } finally {
        btnExamRefreshMastery.disabled = false;
      }
    });
    btnMaskToggle.addEventListener("click", () => {
      automationMaskEnabled = !automationMaskEnabled;
      saveAutomationMaskEnabled(automationMaskEnabled);
      updateMaskToggleButton();
      updateOverlayVisibility();
    });
    function setSponsorPopoverVisible(visible) {
      if (visible) {
        sponsorPopover.style.display = "block";
        sponsorPopover.style.animation = "none";
        const rect = btnSponsor.getBoundingClientRect();
        const gap = 10;
        const width = Math.max(
          220,
          Math.round(sponsorPopover.offsetWidth || 220),
        );
        const height = Math.max(
          240,
          Math.round(sponsorPopover.offsetHeight || 240),
        );
        let left = Math.round(rect.right - width);
        let top = Math.round(rect.bottom + gap);
        const maxLeft = Math.max(8, window.innerWidth - width - 8);
        const maxTop = Math.max(8, window.innerHeight - height - 8);
        left = Math.min(Math.max(8, left), maxLeft);
        if (top > maxTop) {
          top = Math.max(8, Math.round(rect.top - height - gap));
        }
        sponsorPopover.style.left = `${left}px`;
        sponsorPopover.style.top = `${top}px`;
        sponsorPopover.offsetWidth;
        sponsorPopover.style.animation =
          "zs-popover-fade-up .18s ease-out both";
      } else {
        sponsorPopover.style.display = "none";
        sponsorPopover.style.animation = "none";
      }
      btnSponsor.setAttribute("aria-expanded", visible ? "true" : "false");
    }

    function setSponsorImagePreviewVisible(visible) {
      if (visible) {
        sponsorPreviewOverlay.style.display = "flex";
        sponsorPreviewOverlay.style.animation = "none";
        sponsorPreviewImage.style.animation = "none";
        sponsorPreviewOverlay.offsetWidth;
        sponsorPreviewOverlay.style.animation =
          "zs-preview-fade-in .16s ease-out both";
        sponsorPreviewImage.style.animation =
          "zs-preview-image-in .2s ease-out both";
      } else {
        sponsorPreviewOverlay.style.display = "none";
        sponsorPreviewOverlay.style.animation = "none";
        sponsorPreviewImage.style.animation = "none";
      }
    }

    btnSponsor.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextVisible = sponsorPopover.style.display === "none";
      setSponsorPopoverVisible(nextVisible);
    });
    sponsorPopover.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    btnSponsorOpenImage.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSponsorImagePreviewVisible(true);
    });
    sponsorImg.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSponsorImagePreviewVisible(true);
    });
    sponsorImg.style.cursor = "zoom-in";
    sponsorPreviewOverlay.addEventListener("click", () => {
      setSponsorImagePreviewVisible(false);
    });
    btnSponsorPreviewClose.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSponsorImagePreviewVisible(false);
    });
    sponsorPreviewImage.addEventListener("click", (e) => {
      e.stopPropagation();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        setSponsorImagePreviewVisible(false);
      }
    });
    document.addEventListener(
      "click",
      (e) => {
        if (
          !titleBarActions.contains(e.target) &&
          !sponsorPopover.contains(e.target)
        ) {
          setSponsorPopoverVisible(false);
        }
      },
      true,
    );
    window.addEventListener("resize", () => {
      if (sponsorPopover.style.display !== "none")
        setSponsorPopoverVisible(true);
    });
    window.addEventListener(
      "scroll",
      () => {
        if (sponsorPopover.style.display !== "none")
          setSponsorPopoverVisible(true);
      },
      true,
    );

    btnStar.addEventListener("click", () => {
      window.open(
        "https://github.com/yixing233/Smart-Tree-Assistant",
        "_blank",
        "noopener,noreferrer",
      );
    });
    btnIssues.addEventListener("click", () => {
      window.open(
        "https://github.com/yixing233/Smart-Tree-Assistant/issues",
        "_blank",
        "noopener,noreferrer",
      );
    });

    autoControlToolbar.appendChild(btnMaskToggle);
    autoControlHeader.appendChild(autoControlTitle);
    autoControlHeader.appendChild(autoControlState);
    autoControlCard.appendChild(autoControlHeader);
    autoControlCard.appendChild(autoControlToolbar);

    examOverviewSubView.appendChild(examAutoControlCard);
    examOverviewSubView.appendChild(examQuickAnswerWrap);
    examOverviewSubView.appendChild(examProgressCard);
    examOverviewSubView.appendChild(examNextPendingWrap);
    examOverviewSubView.appendChild(examOverviewWrap);
    examDetailSubView.appendChild(examActionsWrap);
    examDetailSubView.appendChild(examDetailStatusWrap);
    examDetailSubView.appendChild(examResultWrap);
    examView.appendChild(examOverviewSubView);
    examView.appendChild(examDetailSubView);

    titleBar.appendChild(title);
    titleBar.appendChild(titleBarActions);
    panel.appendChild(titleBar);
    panel.appendChild(feedbackHint);
    document.body.appendChild(sponsorPopover);
    document.body.appendChild(sponsorPreviewOverlay);
    panel.appendChild(primaryTabBar);
    panel.appendChild(viewTabBar);
    switchTrack.appendChild(examView);
    switchViewport.appendChild(switchTrack);
    panel.appendChild(switchViewport);
    document.body.appendChild(panel);
    if (isStudentReviewRoute()) {
      if (!placePanelIntoExamRightsSlot(panel)) {
        applyFloatingPanelMode(panel);
        enableFloatingPanelDrag(panel, titleBar);
      }
    } else {
      placePanelIntoAiSlot(panel);
    }
    if (!isStudentReviewRoute()) {
      placePanelIntoAiSlot(panel);
    }

    tabPractice.addEventListener("click", () => {
      setView(lastExamView || "exam-overview");
    });
    tabOverview.addEventListener("click", () => {
      setView("exam-overview");
    });
    tabDetail.addEventListener("click", () => {
      setView("exam-detail");
    });
    btnExamExtract.addEventListener("click", () => {
      runExtractExamLinks().catch((e) => {
        panelSetExamStatus(`提取失败：${String((e && e.message) || e)}`);
      });
    });
    btnExamClearCache.addEventListener("click", () => {
      try {
        const ctx = examState.lastContext || getExamContext();
        clearExamCachesForContext(ctx);
        examState.rows = [];
        examState.questionRows = [];
        renderExamResults([]);
        panelSetExamProgress("0 / 0");
        panelSetExamStatus("已清理当前课程答题缓存");
      } catch {
        panelSetExamStatus("清缓存失败");
      }
    });
    function closeExamTokenModal() {
      examTokenModal.style.display = "none";
    }
    function openExamTokenModal() {
      examTokenModalInput.value = getStoredExamQueryToken();
      examTokenModal.style.display = "flex";
      window.setTimeout(() => {
        try {
          examTokenModalInput.focus();
          examTokenModalInput.select();
        } catch {}
      }, 0);
    }
    function saveExamQueryTokenFromPanel() {
      const token = setStoredExamQueryToken(examTokenModalInput.value);
      examTokenModalInput.value = token;
      updateExamTokenButtonVisual(token);
      panelSetExamStatus(token ? "题库 Token 已更新" : "题库 Token 已清除");
      closeExamTokenModal();
    }
    let manualExamQueryBusy = false;
    btnExamSetToken.addEventListener("click", () => {
      openExamTokenModal();
    });
    btnExamTokenSave.addEventListener("click", () => {
      saveExamQueryTokenFromPanel();
    });
    examTokenModalInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeExamTokenModal();
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      saveExamQueryTokenFromPanel();
    });
    examTokenModal.addEventListener("click", (e) => {
      if (e.target === examTokenModal) closeExamTokenModal();
    });
    btnExamQueryAnswer.addEventListener("click", async () => {
      if (manualExamQueryBusy || examAnswerBusy) {
        panelSetExamStatus("题库查询中：请稍候...");
        return;
      }
      manualExamQueryBusy = true;
      setExamQueryButtonBusy(true);
      panelSetExamStatus("题库查询中：正在匹配当前题...");
      try {
        await queryAndApplyCurrentExamAnswer({ silent: false });
      } catch {
      } finally {
        manualExamQueryBusy = false;
        setExamQueryButtonBusy(false);
      }
    });
    const handleTabKeyNav = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const order = ["exam-overview", "exam-detail"];
      const currentIndex = order.indexOf(currentView);
      if (e.key === "ArrowRight") {
        const next = order[(currentIndex + 1 + order.length) % order.length];
        setView(next);
      } else {
        const prev = order[(currentIndex - 1 + order.length) % order.length];
        setView(prev);
      }
    };
    primaryTabBar.addEventListener("keydown", handleTabKeyNav);
    viewTabBar.addEventListener("keydown", handleTabKeyNav);
    setView("exam-overview");
    scheduleSegmentedTabsVisualRefresh();
    const syncAiSlot = () => {
      if (!isStudentReviewRoute()) {
        placePanelIntoAiSlot(panel);
      } else {
        if (!placePanelIntoExamRightsSlot(panel)) {
          applyFloatingPanelMode(panel);
          normalizeFloatingPanelPosition(panel);
        }
      }
      scheduleSegmentedTabsVisualRefresh();
    };
    syncAiSlot();
    scheduleAutoExtractExamLinks();
    aiSlotSyncTimer = window.setInterval(syncAiSlot, 1200);
    examWrongSyncTimer = window.setInterval(() => {
      maybeHandleWrongAnswerSyncFlow().catch(() => {});
    }, 2200);
    window.addEventListener("resize", syncAiSlot);
    window.addEventListener("resize", () => {
      scheduleSegmentedTabsVisualRefresh();
    });
    window.addEventListener("beforeunload", () => {
      clearAutoLoopTimer();
      clearAutoProgressTimer();
      stopOverlayLoaderAnimation(false);
      clearOverlayProgressTimer();
      clearOverlayHideTimer();
      if (tabIndicatorRefreshRaf) {
        try {
          window.cancelAnimationFrame(tabIndicatorRefreshRaf);
        } catch {}
        tabIndicatorRefreshRaf = null;
      }
      if (tabIndicatorRefreshTimer1) {
        window.clearTimeout(tabIndicatorRefreshTimer1);
        tabIndicatorRefreshTimer1 = null;
      }
      if (tabIndicatorRefreshTimer2) {
        window.clearTimeout(tabIndicatorRefreshTimer2);
        tabIndicatorRefreshTimer2 = null;
      }
      if (aiSlotSyncTimer) window.clearInterval(aiSlotSyncTimer);
      if (examWrongSyncTimer) window.clearInterval(examWrongSyncTimer);
      try {
        statusObserver.disconnect();
      } catch {}
    });

    currentResourceTimer = window.setInterval(() => {
      if (currentView === "exam-overview") {
        renderExamOverviewPanel();
      }
    }, 800);
  }

  function init() {
    installNetworkHooks();
    rememberCurrentExamUrl();
    if (shouldShowBackToExamButton()) {
      renderBackToExamButton();
      return;
    }
    if (!shouldInitMainPanel()) return;
    if (document.getElementById("zs-knowledge-capture-panel")) return;
    createPanel();

    console.log("[知识抓取] Tampermonkey 脚本已加载");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
