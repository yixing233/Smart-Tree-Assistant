// ==UserScript==
// @name         智慧树助手
// @namespace    https://ai-smart-course-student-pro.zhihuishu.com/
// @version      0.3.1
// @description  一个基于智慧树AI课程平台开发的脚本, 能够自动完成所有必学内容, 如有bug, 请前往GitHub提交issues.
// @author       xchengb
// @match        https://ai-smart-course-student-pro.zhihuishu.com/learnPage/*
// @match        https://ai-smart-course-student-pro.zhihuishu.com/singleCourse/knowledgeStudy/*
// @match        https://hike-teaching-center.polymas.com/stu-hike/agent-course-hike/ai-course-center*
// @match        https://onlineweb.zhihuishu.com/*
// @match        https://passport.zhihuishu.com/login*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @connect      kg-ai-run.zhihuishu.com
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const API_BASE = 'https://kg-ai-run.zhihuishu.com/run/gateway/t/stu';
  const API_BASE_COMMON = 'https://kg-ai-run.zhihuishu.com/run/gateway/t/common';
  const CACHE_VERSION = '0.3.1';
  const CACHE_PREFIX = 'zs-knowledge-capture-cache';
  const PENDING_RESOURCE_PREFIX = 'zs-knowledge-capture-pending-resource';
  const ACTIVE_RESOURCE_HINT_PREFIX = 'zs-knowledge-capture-active-resource-hint';
  const AUTOMATION_STATE_PREFIX = 'zs-knowledge-capture-automation';
  const VIDEO_CONTROL_AUTO_MUTE_PREFIX = 'zs-knowledge-video-auto-mute';
  const VIDEO_SEEK_HINT_PREFIX = 'zs-knowledge-video-seek-hint';
  const AUTOMATION_MASK_PREFIX = 'zs-knowledge-automation-mask';
  const CAPTURED_RESPONSES = [];
  const CAPTURED_TRAFFIC = [];
  let HOOK_INSTALLED = false;
  const PAGE_CRYPTO_KEY_CACHE = new Map();

  /* GIF_FRAME_DATA_START */
  const LOADER_GIF_FRAME_DURATIONS = [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 120, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 120];
  const LOADER_GIF_FRAMES = [[[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[2.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[2.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[3.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[4.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[5.0, 0.0, 1.0, 1.0, 0.0], [0.0, -0.5, 1.0, 1.04, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[6.0, 0.0, 1.0, 1.0, 0.0], [-1.0, -3.5, 1.0, 1.04, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[8.0, 0.0, 1.0, 1.0, 0.0], [-0.62, -7.73, 1.062, 1.072, -9.46], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[9.0, 0.0, 1.0, 1.0, 0.0], [-0.75, -13.34, 1.071, 1.081, -20.56], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[11.0, 0.0, 1.0, 1.0, 0.0], [-1.34, -19.9, 1.082, 1.077, -30.96], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[13.0, 0.0, 1.0, 1.0, 0.0], [-3.0, -26.5, 1.088, 1.075, 45.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[15.0, 0.0, 1.0, 1.0, 0.0], [-6.48, -33.36, 1.085, 1.072, 36.87], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[18.0, 0.0, 1.0, 1.0, 0.0], [-11.8, -37.9, 1.066, 1.073, 26.57], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[21.0, 0.0, 1.0, 1.0, 0.0], [-17.41, -39.85, 1.063, 1.067, 14.04], [-0.5, -0.5, 1.04, 1.04, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[19.5, -40.0, 1.038, 1.08, 0.0], [-17.0, 0.0, 1.0, 1.0, 0.0], [-0.5, -3.5, 1.04, 1.04, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[16.53, -40.08, 1.041, 1.074, -8.75], [-13.5, 0.0, 1.038, 1.0, 0.0], [-1.0, -7.27, 1.101, 1.07, -8.75], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[13.35, -39.45, 1.046, 1.075, -18.43], [-9.5, 0.0, 1.038, 1.0, 0.0], [-1.05, -12.76, 1.114, 1.073, -19.98], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[10.46, -38.07, 1.042, 1.063, -30.96], [-5.0, 0.0, 1.0, 1.0, 0.0], [-1.68, -19.29, 1.118, 1.077, -30.96], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[7.56, -35.6, 1.049, 1.07, -41.99], [-0.5, 0.0, 1.038, 1.0, 0.0], [-3.25, -26.21, 1.124, 1.076, -40.6], [-0.5, 0.0, 0.962, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[5.27, -32.38, 1.051, 1.074, 35.54], [4.5, 0.0, 1.038, 1.0, 0.0], [-6.46, -32.72, 1.128, 1.072, 36.87], [-1.0, -1.5, 1.0, 1.04, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[3.5, -28.0, 1.049, 1.055, 26.57], [10.5, 0.0, 1.038, 1.0, 0.0], [-11.6, -37.36, 1.12, 1.076, 24.78], [-1.0, -4.0, 1.038, 1.04, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[2.47, -23.38, 1.063, 1.067, 14.04], [16.5, 0.0, 1.038, 1.0, 0.0], [-17.32, -39.68, 1.108, 1.074, 14.93], [-1.38, -8.42, 1.056, 1.067, -11.31], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.5, -18.0, 1.038, 1.08, 0.0], [19.8, -40.23, 1.039, 1.072, 4.09], [-18.5, 0.0, 1.04, 1.0, 0.0], [-1.48, -14.21, 1.064, 1.07, -21.8], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, -12.0, 1.038, 1.04, 0.0], [16.82, -40.11, 1.04, 1.076, -7.59], [-12.0, 0.0, 1.08, 1.0, 0.0], [-2.3, -20.91, 1.079, 1.074, -32.74], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, -4.5, 1.077, 1.04, 0.0], [13.8, -39.6, 1.034, 1.075, -18.43], [-5.0, 0.0, 1.08, 1.0, 0.0], [-4.25, -27.75, 1.061, 1.075, 45.0], [-0.5, 0.0, 0.962, 1.0, 0.0]], [[0.5, 0.5, 1.038, 1.04, 0.0], [10.77, -38.15, 1.05, 1.067, -29.74], [3.0, 0.0, 1.08, 1.0, 0.0], [-7.88, -33.92, 1.077, 1.076, 33.69], [-1.0, -1.5, 1.0, 1.04, 0.0]], [[0.0, 2.0, 1.154, 0.92, 0.0], [7.99, -35.87, 1.046, 1.069, -41.19], [10.0, 0.0, 1.08, 1.0, 0.0], [-13.28, -38.19, 1.071, 1.071, 23.2], [-1.0, -5.0, 1.038, 1.04, 0.0]], [[0.5, 2.5, 1.269, 0.8, 0.0], [5.56, -32.58, 1.046, 1.072, 36.87], [17.0, 0.0, 1.08, 1.0, 0.0], [-18.83, -39.87, 1.048, 1.067, 11.31], [-1.26, -9.56, 1.054, 1.067, -14.04]], [[0.5, 3.5, 1.346, 0.72, 0.0], [3.7, -28.4, 1.049, 1.055, 26.57], [18.5, -40.5, 1.04, 1.04, 0.0], [-18.5, 0.0, 1.038, 1.0, 0.0], [-1.42, -15.63, 1.066, 1.073, -24.44]], [[0.0, 4.5, 1.385, 0.72, 0.0], [2.68, -23.71, 1.054, 1.077, 14.04], [15.81, -40.06, 1.077, 1.07, -10.3], [-12.0, 0.0, 1.0, 1.0, 0.0], [-2.46, -22.28, 1.069, 1.08, -36.87]], [[0.0, 4.5, 1.385, 0.72, 0.0], [1.84, -18.23, 1.074, 1.072, 4.09], [12.77, -39.3, 1.077, 1.068, -21.04], [-6.0, 0.0, 1.0, 1.0, 0.0], [-4.65, -29.38, 1.084, 1.069, 42.51]], [[0.5, 4.0, 1.346, 0.76, 0.0], [1.5, -12.0, 1.038, 1.0, 0.0], [9.85, -37.73, 1.076, 1.065, -33.69], [-1.0, 0.0, 1.0, 1.0, 0.0], [-8.99, -35.31, 1.076, 1.073, 32.01]], [[0.5, 3.0, 1.269, 0.84, 0.0], [1.0, -5.0, 1.038, 1.04, 0.0], [6.75, -35.25, 1.075, 1.047, 45.0], [4.0, 0.0, 1.0, 1.0, 0.0], [-14.53, -38.78, 1.065, 1.066, 19.98]], [[0.5, 2.0, 1.192, 0.92, 0.0], [0.5, 0.5, 1.038, 1.04, 0.0], [4.72, -31.65, 1.088, 1.07, 34.7], [8.5, 0.0, 1.038, 1.0, 0.0], [-19.85, -39.98, 1.047, 1.074, 8.75]], [[0.0, 1.0, 1.077, 1.0, 0.0], [0.5, 2.0, 1.115, 0.92, 0.0], [3.1, -27.35, 1.097, 1.072, 23.96], [12.5, 0.0, 1.038, 1.0, 0.0], [-23.5, -40.5, 1.038, 1.04, 0.0]], [[0.5, 0.5, 1.038, 1.04, 0.0], [0.5, 2.5, 1.269, 0.8, 0.0], [1.98, -22.39, 1.102, 1.072, 12.53], [14.68, -39.93, 1.035, 1.072, -12.53], [-25.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 3.5, 1.346, 0.72, 0.0], [1.5, -17.0, 1.08, 1.04, 0.0], [11.66, -39.02, 1.039, 1.072, -23.96], [-22.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 4.5, 1.423, 0.72, 0.0], [1.5, -11.0, 1.08, 1.04, 0.0], [8.7, -37.22, 1.042, 1.065, -35.54], [-19.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 4.5, 1.385, 0.72, 0.0], [1.0, -3.0, 1.08, 1.0, 0.0], [6.0, -34.5, 1.033, 1.075, -45.0], [-16.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 4.0, 1.346, 0.76, 0.0], [0.0, 0.5, 1.08, 0.96, 0.0], [3.9, -30.75, 1.048, 1.068, 32.01], [-14.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 3.0, 1.269, 0.84, 0.0], [0.0, 1.5, 1.24, 0.88, 0.0], [2.48, -26.21, 1.05, 1.07, 21.8], [-11.5, 0.0, 0.962, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 2.0, 1.192, 0.92, 0.0], [0.0, 3.0, 1.32, 0.76, 0.0], [1.39, -21.35, 1.056, 1.072, 9.46], [-10.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 1.5, 1.115, 0.96, 0.0], [0.0, 3.5, 1.4, 0.72, 0.0], [1.0, -15.5, 1.0, 1.04, 0.0], [-8.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 0.5, 1.038, 1.04, 0.0], [0.0, 4.5, 1.48, 0.72, 0.0], [1.0, -9.0, 1.038, 1.04, 0.0], [-6.5, 0.0, 0.962, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 4.5, 1.4, 0.72, 0.0], [0.0, -1.5, 1.077, 1.04, 0.0], [-5.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 4.0, 1.4, 0.76, 0.0], [0.0, 0.5, 1.077, 0.96, 0.0], [-4.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 2.5, 1.32, 0.8, 0.0], [-0.5, 2.0, 1.192, 0.84, 0.0], [-3.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 1.5, 1.2, 0.88, 0.0], [0.0, 3.0, 1.308, 0.76, 0.0], [-2.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.5, 1.08, 0.96, 0.0], [-0.5, 4.0, 1.346, 0.68, 0.0], [-2.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.08, 1.0, 0.0], [-0.5, 4.0, 1.423, 0.68, 0.0], [-1.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 4.0, 1.385, 0.68, 0.0], [-1.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 3.5, 1.308, 0.72, 0.0], [-0.5, 0.0, 0.962, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 2.5, 1.231, 0.8, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-0.5, 1.5, 1.115, 0.88, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-0.5, 0.5, 1.038, 0.96, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-1.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-1.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-2.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-2.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-3.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [-4.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, -0.5, 1.0, 1.04, 0.0], [-5.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [1.0, -3.5, 1.0, 1.04, 0.0], [-6.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.7, -7.72, 1.05, 1.065, 9.46], [-8.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.82, -13.38, 1.065, 1.07, 19.98], [-9.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [1.43, -19.68, 1.068, 1.077, 32.47], [-11.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [3.25, -26.75, 1.061, 1.075, -45.0], [-13.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [6.62, -33.27, 1.069, 1.068, -36.03], [-15.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [11.8, -37.73, 1.07, 1.069, -24.44], [-18.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.5, -0.5, 1.04, 1.04, 0.0], [17.53, -39.88, 1.054, 1.067, -14.04], [-21.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [1.0, -3.5, 1.04, 1.0, 0.0], [17.0, 0.0, 1.0, 1.0, 0.0], [-19.19, -40.25, 1.041, 1.066, -3.37]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [1.06, -7.42, 1.097, 1.075, 8.13], [14.0, 0.0, 1.0, 1.0, 0.0], [-16.33, -40.09, 1.038, 1.07, 8.75]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [1.19, -12.68, 1.11, 1.077, 20.56], [10.0, 0.0, 1.0, 1.0, 0.0], [-13.36, -39.5, 1.038, 1.07, 19.98]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [1.8, -19.4, 1.116, 1.077, 29.74], [5.0, 0.0, 1.0, 1.0, 0.0], [-10.38, -38.03, 1.036, 1.063, 30.96]], [[0.0, 0.0, 1.0, 1.0, 0.0], [1.0, 0.0, 1.0, 1.0, 0.0], [3.45, -26.3, 1.121, 1.076, 41.19], [0.5, 0.0, 1.038, 1.0, 0.0], [-7.44, -35.56, 1.044, 1.063, 41.63]], [[0.0, 0.0, 1.0, 1.0, 0.0], [1.0, -1.5, 1.0, 1.04, 0.0], [6.7, -32.9, 1.12, 1.072, -36.87], [-4.5, 0.0, 1.038, 1.0, 0.0], [-5.12, -32.16, 1.046, 1.064, -36.87]], [[0.0, 0.0, 1.0, 1.0, 0.0], [1.0, -4.0, 1.038, 1.04, 0.0], [11.9, -37.7, 1.109, 1.073, -26.57], [-10.0, 0.0, 1.0, 1.0, 0.0], [-3.5, -28.0, 1.049, 1.055, -26.57]], [[0.0, 0.0, 1.0, 1.0, 0.0], [1.5, -8.5, 1.064, 1.075, 11.31], [17.32, -39.71, 1.096, 1.067, -14.04], [-16.5, 0.0, 1.038, 1.0, 0.0], [-2.21, -23.32, 1.054, 1.067, -14.04]], [[0.0, 0.0, 1.0, 1.0, 0.0], [1.6, -14.26, 1.071, 1.077, 21.8], [19.0, 0.0, 1.08, 1.0, 0.0], [-19.65, -40.19, 1.039, 1.07, -3.81], [-1.5, -18.0, 1.038, 1.08, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [2.42, -20.88, 1.067, 1.076, 33.69], [12.0, 0.0, 1.08, 1.0, 0.0], [-16.84, -40.12, 1.039, 1.069, 8.13], [-1.0, -11.5, 1.0, 1.04, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [4.25, -27.75, 1.061, 1.075, -45.0], [5.0, 0.0, 1.08, 1.0, 0.0], [-13.7, -39.4, 1.046, 1.063, 18.43], [-1.0, -4.5, 1.077, 1.04, 0.0]], [[1.0, -1.5, 1.0, 1.04, 0.0], [8.12, -34.08, 1.077, 1.076, -33.69], [-2.0, 0.0, 1.08, 1.0, 0.0], [-10.7, -38.16, 1.041, 1.065, 30.26], [-0.5, 0.0, 1.038, 1.0, 0.0]], [[1.5, -5.0, 1.038, 1.08, 0.0], [13.52, -38.29, 1.071, 1.071, -23.2], [-9.5, 0.0, 1.04, 1.0, 0.0], [-7.87, -35.82, 1.043, 1.067, 40.6], [0.0, 1.5, 1.154, 0.88, 0.0]], [[1.44, -9.76, 1.054, 1.077, 14.04], [18.9, -39.98, 1.056, 1.075, -11.31], [-16.0, 0.0, 1.08, 1.0, 0.0], [-5.47, -32.53, 1.049, 1.067, -37.87], [-0.5, 2.5, 1.269, 0.8, 0.0]], [[1.66, -15.75, 1.076, 1.079, 24.44], [18.5, 0.0, 1.038, 1.0, 0.0], [-18.5, -40.5, 1.04, 1.04, 0.0], [-3.7, -28.4, 1.049, 1.055, -26.57], [-0.5, 3.5, 1.346, 0.72, 0.0]], [[2.65, -22.61, 1.082, 1.088, 35.54], [12.5, 0.0, 1.038, 1.0, 0.0], [-15.68, -40.03, 1.08, 1.07, 10.3], [-2.45, -23.65, 1.059, 1.07, -15.26], [0.0, 4.0, 1.385, 0.68, 0.0]], [[4.94, -29.44, 1.067, 1.083, -41.63], [6.5, 0.0, 1.038, 1.0, 0.0], [-12.74, -39.4, 1.084, 1.07, 21.8], [-1.79, -18.21, 1.068, 1.071, -4.4], [0.0, 4.0, 1.385, 0.68, 0.0]], [[9.04, -35.34, 1.08, 1.073, -32.01], [1.0, 0.0, 1.0, 1.0, 0.0], [-9.6, -37.67, 1.086, 1.069, 32.74], [-1.5, -12.0, 1.038, 1.0, 0.0], [-0.5, 3.5, 1.346, 0.72, 0.0]], [[14.75, -38.84, 1.071, 1.072, -20.56], [-4.0, 0.0, 1.0, 1.0, 0.0], [-6.75, -35.25, 1.075, 1.047, 45.0], [-1.0, -5.0, 1.038, 1.04, 0.0], [-0.5, 2.5, 1.269, 0.8, 0.0]], [[20.07, -40.09, 1.05, 1.072, -9.46], [-8.0, 0.0, 1.0, 1.0, 0.0], [-4.65, -31.73, 1.087, 1.065, -33.69], [-0.5, 0.0, 1.038, 1.0, 0.0], [0.0, 1.5, 1.154, 0.88, 0.0]], [[23.5, -40.0, 1.038, 1.08, 0.0], [-12.0, 0.0, 1.0, 1.0, 0.0], [-2.95, -27.29, 1.099, 1.073, -24.44], [0.0, 1.5, 1.154, 0.88, 0.0], [0.0, 0.5, 1.077, 0.96, 0.0]], [[25.0, 0.0, 1.0, 1.0, 0.0], [-14.63, -39.92, 1.041, 1.076, 12.99], [-1.86, -22.36, 1.106, 1.072, -12.53], [-0.5, 2.5, 1.269, 0.8, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[22.0, 0.0, 1.0, 1.0, 0.0], [-11.61, -38.99, 1.05, 1.072, 23.96], [-1.5, -17.0, 1.08, 1.04, 0.0], [-0.5, 3.5, 1.346, 0.72, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[19.0, 0.0, 1.0, 1.0, 0.0], [-8.62, -37.23, 1.055, 1.069, 35.54], [-1.0, -11.0, 1.08, 1.0, 0.0], [0.0, 4.0, 1.385, 0.68, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[16.0, 0.0, 1.0, 1.0, 0.0], [-6.05, -34.56, 1.063, 1.064, -41.99], [-0.5, -3.0, 1.08, 1.04, 0.0], [0.0, 4.0, 1.385, 0.68, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[14.0, 0.0, 1.0, 1.0, 0.0], [-3.69, -30.54, 1.056, 1.065, -33.69], [0.0, 0.5, 1.08, 0.96, 0.0], [-0.5, 3.5, 1.346, 0.72, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[12.0, 0.0, 1.0, 1.0, 0.0], [-2.31, -26.28, 1.064, 1.07, -21.8], [0.0, 1.5, 1.24, 0.88, 0.0], [-0.5, 3.0, 1.269, 0.76, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[10.0, 0.0, 1.0, 1.0, 0.0], [-1.4, -21.02, 1.071, 1.075, -11.31], [0.0, 3.0, 1.32, 0.76, 0.0], [-0.5, 1.5, 1.192, 0.88, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[8.0, 0.0, 1.0, 1.0, 0.0], [-1.0, -15.5, 1.0, 1.04, 0.0], [0.0, 3.5, 1.4, 0.72, 0.0], [0.0, 1.0, 1.077, 0.92, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[7.0, 0.0, 1.0, 1.0, 0.0], [-1.0, -9.0, 1.038, 1.04, 0.0], [0.0, 4.5, 1.48, 0.72, 0.0], [-0.5, 0.0, 1.038, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[5.0, 0.0, 1.0, 1.0, 0.0], [0.0, -1.5, 1.077, 1.04, 0.0], [0.5, 4.5, 1.44, 0.72, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[4.0, 0.0, 1.0, 1.0, 0.0], [0.5, 1.0, 1.115, 1.0, 0.0], [0.0, 4.0, 1.4, 0.76, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[3.0, 0.0, 1.0, 1.0, 0.0], [0.5, 2.0, 1.192, 0.84, 0.0], [0.0, 2.5, 1.32, 0.8, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[2.5, 0.0, 0.962, 1.0, 0.0], [0.0, 3.0, 1.308, 0.76, 0.0], [0.5, 1.5, 1.2, 0.88, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[2.0, 0.0, 1.0, 1.0, 0.0], [0.5, 4.0, 1.346, 0.68, 0.0], [0.0, 0.5, 1.08, 0.96, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [0.5, 4.5, 1.423, 0.72, 0.0], [0.0, 0.0, 1.08, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [0.5, 4.5, 1.346, 0.72, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[1.0, 0.0, 1.0, 1.0, 0.0], [0.5, 3.5, 1.346, 0.8, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 3.0, 1.231, 0.84, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 1.5, 1.115, 0.96, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 1.0, 1.038, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.5, 0.0, 1.038, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]], [[0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0, 0.0]]];
  /* GIF_FRAME_DATA_END */

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function recordCaptured(url, text) {
    const json = safeJsonParse(text);
    if (!json) return;
    CAPTURED_RESPONSES.push({
      url,
      time: Date.now(),
      json
    });
    if (CAPTURED_RESPONSES.length > 120) CAPTURED_RESPONSES.shift();
  }

  function recordTraffic(entry) {
    CAPTURED_TRAFFIC.push({
      time: Date.now(),
      ...entry
    });
    if (CAPTURED_TRAFFIC.length > 200) CAPTURED_TRAFFIC.shift();
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
          const url = typeof req === 'string' ? req : (req && req.url) || '';
          const init = args[1] || {};
          const method = String((init.method || (req && req.method) || 'GET')).toUpperCase();
          const body = typeof init.body === 'string' ? init.body : '';
          if (/zhihuishu\.com|kg-ai-run/.test(url)) {
            res.clone().text().then((txt) => {
              recordCaptured(url, txt);
              recordTraffic({
                url,
                method,
                requestBody: body,
                status: res.status,
                responseJson: safeJsonParse(txt)
              });
            }).catch(() => {});
          }
        } catch {}
        return res;
      };
    } catch (e) {
      console.warn('[知识抓取] fetch hook 失败:', e.message);
    }

    try {
      const rawOpen = XMLHttpRequest.prototype.open;
      const rawSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__zs_url = url;
        this.__zs_method = String(method || 'GET').toUpperCase();
        return rawOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        this.__zs_body = typeof args[0] === 'string' ? args[0] : '';
        this.addEventListener('load', function () {
          try {
            const url = this.__zs_url || '';
            if (!/zhihuishu\.com|kg-ai-run/.test(url)) return;
            const text = typeof this.responseText === 'string' ? this.responseText : '';
            if (text) {
              recordCaptured(url, text);
              recordTraffic({
                url,
                method: this.__zs_method || 'GET',
                requestBody: this.__zs_body || '',
                status: this.status,
                responseJson: safeJsonParse(text)
              });
            }
          } catch {}
        });
        return rawSend.apply(this, args);
      };
    } catch (e) {
      console.warn('[知识抓取] xhr hook 失败:', e.message);
    }
  }

  function parseRoute() {
    const seg = location.pathname.split('/').filter(Boolean);
    const learnIdx = seg.indexOf('learnPage');
    if (learnIdx >= 0 && seg.length >= learnIdx + 4) {
      return {
        courseId: seg[learnIdx + 1],
        classId: seg[learnIdx + 2],
        nodeUid: seg[learnIdx + 3]
      };
    }

    const singleIdx = seg.indexOf('singleCourse');
    if (singleIdx >= 0 && seg[singleIdx + 1] === 'knowledgeStudy' && seg.length >= singleIdx + 4) {
      const courseId = seg[singleIdx + 2];
      const pointOrClassId = seg[singleIdx + 3];
      return {
        courseId,
        classId: pointOrClassId,
        nodeUid: pointOrClassId
      };
    }

    throw new Error('无法从 URL 解析 courseId/classId/nodeUid');
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
      return raw === '1';
    } catch (e) {
      console.warn('[知识抓取] 读取自动静音状态失败:', e.message);
      return true;
    }
  }

  function saveVideoAutoMuteEnabled(enabled) {
    try {
      const route = parseRoute();
      localStorage.setItem(getVideoControlAutoMuteKey(route), enabled ? '1' : '0');
      return true;
    } catch (e) {
      console.warn('[知识抓取] 保存自动静音状态失败:', e.message);
      return false;
    }
  }

  function saveVideoSeekHint(resourceUid, seekSeconds) {
    try {
      const uid = String(resourceUid || '').trim();
      const sec = Number(seekSeconds);
      if (!uid || !Number.isFinite(sec) || sec <= 1) return false;
      const route = parseRoute();
      const payload = {
        resourceUid: uid,
        seekSeconds: Math.floor(sec),
        createdAt: Date.now()
      };
      sessionStorage.setItem(getVideoSeekHintKey(route), JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[知识抓取] 保存视频进度跳转提示失败:', e.message);
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
        resourceUid: String(payload.resourceUid || ''),
        seekSeconds: Number(payload.seekSeconds || 0),
        createdAt: Number(payload.createdAt || 0)
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
      return raw === '1';
    } catch (e) {
      console.warn('[知识抓取] 读取遮罩开关失败:', e.message);
      return true;
    }
  }

  function saveAutomationMaskEnabled(enabled) {
    try {
      const route = parseRoute();
      localStorage.setItem(getAutomationMaskKey(route), enabled ? '1' : '0');
      return true;
    } catch (e) {
      console.warn('[知识抓取] 保存遮罩开关失败:', e.message);
      return false;
    }
  }

  function saveAutomationState(state) {
    try {
      const route = parseRoute();
      const key = getAutomationStateKey(route);
      if (!state || state.enabled !== true) {
        sessionStorage.removeItem(key);
        return true;
      }
      const payload = {
        enabled: true,
        targetUid: String(state.targetUid || ''),
        updatedAt: Date.now()
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[知识抓取] 自动化状态写入失败:', e.message);
      return false;
    }
  }

  function loadAutomationState() {
    try {
      const route = parseRoute();
      const raw = sessionStorage.getItem(getAutomationStateKey(route));
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || payload.enabled !== true) return null;
      return {
        enabled: true,
        targetUid: String(payload.targetUid || ''),
        updatedAt: Number(payload.updatedAt || 0)
      };
    } catch (e) {
      console.warn('[知识抓取] 自动化状态读取失败:', e.message);
      return null;
    }
  }

  function makeCacheResult(result) {
    if (!result || typeof result !== 'object') return null;
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
      modules: result.modules || (result.structure && result.structure.modules) || [],
      points: result.points || []
    };

    return Object.fromEntries(Object.entries(cacheResult).filter(([, value]) => value !== undefined));
  }

  function saveCachedResult(result) {
    try {
      const route = result && result.params ? result.params : parseRoute();
      const payload = {
        version: CACHE_VERSION,
        savedAt: new Date().toISOString(),
        result: makeCacheResult(result)
      };
      if (!payload.result) return false;
      localStorage.setItem(getCacheKey(route), JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[知识抓取] 缓存写入失败:', e.message);
      return false;
    }
  }

  function loadCachedResult() {
    try {
      const route = parseRoute();
      const raw =
        localStorage.getItem(getCacheKey(route)) ||
        localStorage.getItem(getLegacyCacheKey(route)) ||
        findAnyCourseCache(route);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || !payload.result) return null;
      return {
        ...payload.result,
        cacheVersion: payload.version || '',
        cachedAt: payload.savedAt || payload.result.cachedAt || ''
      };
    } catch (e) {
      console.warn('[知识抓取] 缓存读取失败:', e.message);
      return null;
    }
  }

  function getDateFormate() {
    return Date.parse(new Date());
  }

  function getPageWindow() {
    try {
      if (typeof unsafeWindow !== 'undefined' && unsafeWindow) return unsafeWindow;
    } catch {}
    return window;
  }

  async function waitForPageCrypto(timeoutMs = 12000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const pageWin = getPageWindow();
      const keyFn = pageWin && (pageWin.l0a1b2c || pageWin.labc);
      if (pageWin && typeof pageWin.yxyz === 'function' && typeof keyFn === 'function') {
        return { pageWin, keyFn };
      }
      await sleep(200);
    }
    throw new Error('页面加密函数未加载: yxyz/l0a1b2c/labc');
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
      date: Date.now()
    };
  }

  function pick(obj, keys, fallback = null) {
    if (!obj || typeof obj !== 'object') return fallback;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return fallback;
  }

  async function fetchPost(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }

  async function fetchGet(url, params) {
    const query = new URLSearchParams(params || {}).toString();
    const finalUrl = query ? `${url}?${query}` : url;
    const res = await fetch(finalUrl, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${finalUrl}`);
    return res.json();
  }

  function gmPost(url, body) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest 不可用'));
        return;
      }
      GM_xmlhttpRequest({
        method: 'POST',
        url,
        data: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
        onload: (resp) => {
          try {
            resolve(JSON.parse(resp.responseText));
          } catch (e) {
            reject(new Error(`JSON 解析失败: ${e.message}`));
          }
        },
        onerror: () => reject(new Error(`GM 请求失败: ${url}`))
      });
    });
  }

  function gmGet(url, params) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest 不可用'));
        return;
      }
      const query = new URLSearchParams(params || {}).toString();
      const finalUrl = query ? `${url}?${query}` : url;
      GM_xmlhttpRequest({
        method: 'GET',
        url: finalUrl,
        onload: (resp) => {
          try {
            resolve(JSON.parse(resp.responseText));
          } catch (e) {
            reject(new Error(`JSON 解析失败: ${e.message}`));
          }
        },
        onerror: () => reject(new Error(`GM 请求失败: ${finalUrl}`))
      });
    });
  }

  async function postJson(url, body) {
    try {
      return await fetchPost(url, body);
    } catch (e1) {
      console.warn('[知识抓取] fetch 失败，尝试 GM_xmlhttpRequest:', e1.message);
      return gmPost(url, body);
    }
  }

  async function postEncryptedJson(url, payload) {
    const encryptedBody = await buildEncryptedBody(payload);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify(encryptedBody)
    });
    const text = await res.text();
    const json = safeJsonParse(text);
    recordCaptured(url, text);
    recordTraffic({
      url,
      method: 'POST',
      requestBody: JSON.stringify(encryptedBody),
      status: res.status,
      responseJson: json
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    if (!json) throw new Error(`JSON 解析失败: ${url}`);
    return json;
  }

  async function getJson(url, params) {
    try {
      return await fetchGet(url, params);
    } catch (e1) {
      console.warn('[知识抓取] GET fetch 失败，尝试 GM_xmlhttpRequest:', e1.message);
      return gmGet(url, params);
    }
  }

  function isSuccessResponse(data) {
    if (!data || typeof data !== 'object') return false;
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
          return { ok: true, method: 'POST-ENCRYPTED', payload, data, errors };
        }
        errors.push(`加密POST返回异常: ${url} code=${data && data.code}`);
      } catch (e) {
        errors.push(`加密POST失败: ${e.message}`);
      }
      try {
        const data = await postJson(url, payload);
        if (isSuccessResponse(data)) {
          return { ok: true, method: 'POST', payload, data, errors };
        }
        errors.push(`POST返回异常: ${url} code=${data && data.code}`);
      } catch (e) {
        errors.push(`POST失败: ${e.message}`);
      }
    }
    return { ok: false, data: null, errors };
  }

  function normalizeKnowledgeDic(raw) {
    const root = pick(raw, ['data'], raw) || {};
    const themeList = pick(root, ['themeList', 'list'], []);

    const modules = (Array.isArray(themeList) ? themeList : []).map((theme) => {
      const unitsRaw = pick(theme, ['subThemeList', 'unitList', 'children'], []);
      const themeKnowledge = pick(theme, ['knowledgeList', 'pointList'], []);

      const units = [];
      if (Array.isArray(unitsRaw) && unitsRaw.length > 0) {
        for (const unit of unitsRaw) {
          const pointsRaw = pick(unit, ['knowledgeList', 'pointList', 'children'], []);
          units.push({
            unitId: String(pick(unit, ['subThemeId', 'unitId', 'id', 'nodeUid', 'themeId', 'catalogId'], '')),
            unitName: String(pick(unit, ['subThemeName', 'unitName', 'name', 'title', 'themeName', 'catalogName'], '未命名单元')),
            points: (Array.isArray(pointsRaw) ? pointsRaw : []).map((p) => ({
              pointId: String(pick(p, ['knowledgeId', 'pointId', 'id', 'nodeUid'], '')),
              pointName: String(pick(p, ['knowledgeName', 'pointName', 'name', 'title'], '未命名知识点'))
            }))
          });
        }
      } else if (Array.isArray(themeKnowledge) && themeKnowledge.length > 0) {
        units.push({
          unitId: '',
          unitName: '默认单元',
          points: themeKnowledge.map((p) => ({
            pointId: String(pick(p, ['knowledgeId', 'pointId', 'id', 'nodeUid'], '')),
            pointName: String(pick(p, ['knowledgeName', 'pointName', 'name', 'title'], '未命名知识点'))
          }))
        });
      }

      return {
        moduleId: String(pick(theme, ['themeId', 'moduleId', 'id'], '')),
        moduleName: String(pick(theme, ['themeName', 'moduleName', 'name', 'title'], '未命名模块')),
        units
      };
    });

    return modules;
  }

  function normalizeModuleInfo(raw) {
    const root = pick(raw, ['data'], raw) || {};
    const moduleList = pick(root, ['moduleList', 'modules', 'list'], []);
    if (!Array.isArray(moduleList)) return [];

    return moduleList.map((mod) => {
      const unitList = pick(mod, ['unitList', 'children', 'subList'], []);
      return {
        moduleId: String(pick(mod, ['moduleId', 'id', 'themeId'], '')),
        moduleName: String(pick(mod, ['moduleName', 'name', 'themeName', 'title'], '未命名模块')),
        units: (Array.isArray(unitList) ? unitList : []).map((unit) => {
          const pointList = pick(unit, ['knowledgeList', 'pointList', 'children'], []);
          return {
            unitId: String(pick(unit, ['unitId', 'id', 'subThemeId'], '')),
            unitName: String(pick(unit, ['unitName', 'name', 'subThemeName', 'title'], '未命名单元')),
            points: (Array.isArray(pointList) ? pointList : []).map((p) => ({
              pointId: String(pick(p, ['knowledgeId', 'pointId', 'id', 'nodeUid'], '')),
              pointName: String(pick(p, ['knowledgeName', 'pointName', 'name', 'title'], '未命名知识点'))
            }))
          };
        })
      };
    });
  }

  function normalizeThemeNodeList(raw) {
    const root = pick(raw, ['data'], raw) || {};
    const themeList = pick(root, ['themeList', 'list', 'data'], []);
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
      const key = `${it.method || 'GET'} ${it.url.split('?')[0]}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);
  }

  function findTrafficEntries(subPath) {
    return CAPTURED_TRAFFIC.filter((it) => it && it.url && it.url.includes(subPath));
  }

  function summarizeObjectKeysDeep(root, limit = 120) {
    const keys = new Set();
    const visited = new WeakSet();
    function walk(node, depth) {
      if (keys.size >= limit) return;
      if (!node || typeof node !== 'object' || depth > 8) return;
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
      requestBody: item.requestBody || '',
      code: json && json.code,
      message: json && json.message,
      keySummary: summarizeObjectKeysDeep(json, 150)
    };
  }

  function makePointSetKey(points) {
    const ids = (points || [])
      .map((p) => String(pick(p, ['knowledgeId', 'pointId', 'id', 'nodeUid', 'pointUid'], '')))
      .filter(Boolean)
      .sort();
    if (!ids.length) return '';
    return ids.join('|');
  }

  function buildUnitHintsFromCaptured() {
    const byUnitId = new Map();
    const byPointSet = new Map();
    const byFirstPoint = new Map();
    const visited = new WeakSet();

    function saveHint(unitObj) {
      const unitName = String(pick(unitObj, ['subThemeName', 'unitName', 'name', 'title', 'themeName', 'catalogName'], '') || '').trim();
      if (!unitName) return;
      const unitId = String(pick(unitObj, ['subThemeId', 'unitId', 'id', 'themeId', 'catalogId'], '') || '');
      const points = pick(unitObj, ['knowledgeList', 'pointList', 'children'], []);
      const pointSetKey = makePointSetKey(points);
      const firstPointId = String(pick(Array.isArray(points) ? points[0] : {}, ['knowledgeId', 'pointId', 'id', 'nodeUid', 'pointUid'], '') || '');

      if (unitId) byUnitId.set(unitId, unitName);
      if (pointSetKey) byPointSet.set(pointSetKey, unitName);
      if (firstPointId) byFirstPoint.set(firstPointId, unitName);
    }

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 10) return;
      if (visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
      }

      const maybeUnits = [
        pick(node, ['subThemeList'], []),
        pick(node, ['unitList'], []),
        pick(node, ['children'], [])
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
        const currentName = String(u.unitName || '').trim();
        if (currentName && currentName !== '未命名单元') continue;

        const uid = String(u.unitId || '');
        const pointSetKey = makePointSetKey(u.points || []);
        const firstPointId = String(pick((u.points || [])[0], ['pointId', 'knowledgeId', 'id', 'nodeUid'], '') || '');

        const name =
          (uid && hints.byUnitId.get(uid)) ||
          (pointSetKey && hints.byPointSet.get(pointSetKey)) ||
          (firstPointId && hints.byFirstPoint.get(firstPointId)) ||
          '';

        if (name) {
          u.unitName = name;
        } else if (currentName === '未命名单元') {
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
      if (pick(theme, ['themeName', 'moduleName', 'name', 'title'], '')) namedThemeCount += 1;
      const units = pick(theme, ['subThemeList', 'unitList', 'children'], []);
      if (Array.isArray(units)) {
        for (const u of units) {
          if (pick(u, ['subThemeName', 'unitName', 'name', 'title', 'themeName'], '')) namedUnitCount += 1;
          const pts = pick(u, ['knowledgeList', 'pointList', 'children'], []);
          if (Array.isArray(pts)) pointCount += pts.length;
        }
      }
      const tpts = pick(theme, ['knowledgeList', 'pointList'], []);
      if (Array.isArray(tpts)) pointCount += tpts.length;
    }
    return namedUnitCount * 100000 + namedThemeCount * 1000 + pointCount * 10 + list.length;
  }

  function extractPointIdFromText(text) {
    if (!text) return '';
    const m = String(text).match(/(?:^|[^\d])(1\d{15,18})(?:[^\d]|$)/);
    return m ? m[1] : '';
  }

  function parseRequestBody(body) {
    if (!body) return null;
    if (typeof body === 'object') return body;
    const text = String(body || '').trim();
    if (!text) return null;

    if (text.startsWith('{') || text.startsWith('[')) {
      const json = safeJsonParse(text);
      if (json && typeof json === 'object') return json;
    }

    if (text.includes('=')) {
      const out = {};
      const usp = new URLSearchParams(text);
      for (const [k, v] of usp.entries()) out[k] = v;
      return Object.keys(out).length ? out : null;
    }
    return null;
  }

  function normalizeResourceItem(item) {
    if (!item || typeof item !== 'object') return null;
    const detail = pick(item, ['resourcesDetail'], null);
    const base = (detail && typeof detail === 'object') ? detail : item;
    const merged = { ...base };

    if (item.studyStatus !== undefined) merged.studyStatus = item.studyStatus;
    if (item.schedule !== undefined) merged.schedule = item.schedule;
    if (item.studyTotalTime !== undefined) merged.studyTotalTime = item.studyTotalTime;
    if (item.resourcesSyncType !== undefined && merged.resourcesSyncType === undefined) {
      merged.resourcesSyncType = item.resourcesSyncType;
    }
    return merged;
  }

  function getResourceListFromResponse(json) {
    const data = pick(json, ['data'], null);
    const list = pick(data, ['resourceList'], pick(json, ['resourceList'], []));
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
      progressType: '必学',
      progressDone: done,
      progressTotal: total,
      source: 'api:/resources/list-knowledge-resource'
    };
  }

  function normalizePossiblePointId(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    return /^\d{6,22}$/.test(s) ? s : '';
  }

  function extractPointIdFromKnowledgeResourcesResponse(json) {
    const data = pick(json, ['data'], null);
    const directId =
      normalizePossiblePointId(pick(data, ['knowledgeId', 'nodeUid', 'pointId', 'id'], '')) ||
      normalizePossiblePointId(pick(json, ['knowledgeId', 'nodeUid', 'pointId', 'id'], ''));
    if (directId) return directId;

    const list = getResourceListFromResponse(json);
    if (!list.length) return '';

    const cnt = new Map();
    function hit(id) {
      const k = normalizePossiblePointId(id);
      if (!k) return;
      cnt.set(k, (cnt.get(k) || 0) + 1);
    }

    for (const r of list) {
      hit(pick(r, ['knowledgeId', 'nodeUid', 'belongsUid', 'pointId', 'id'], ''));
      const q = pick(r, ['resourcesQuoteDetail'], null);
      if (q && typeof q === 'object') {
        hit(pick(q, ['knowledgeId', 'nodeUid', 'belongsUid', 'pointId', 'id'], ''));
      }
    }
    if (!cnt.size) return '';

    let bestId = '';
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
      const src = meta.source || 'unknown';
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    }

    function maybeRecordBadgeText(obj) {
      if (!obj || typeof obj !== 'object') return;
      const pointId = String(pick(obj, ['knowledgeId', 'pointId', 'nodeUid', 'id'], '') || '');
      const pointName = String(pick(obj, ['knowledgeName', 'pointName', 'name', 'title'], '') || '');

      let progressText = '';
      for (const v of Object.values(obj)) {
        if (typeof v !== 'string') continue;
        const text = v.replace(/\s+/g, '');
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
        source: 'api:badge-text'
      };
      setMeta(pointId, pointName, meta);
    }

    function maybeRecordByNumericPair(obj) {
      if (!obj || typeof obj !== 'object') return;
      const pointId = String(pick(obj, ['knowledgeId', 'pointId', 'nodeUid', 'id'], '') || '');
      const pointName = String(pick(obj, ['knowledgeName', 'pointName', 'name', 'title'], '') || '');
      if (!pointId && !pointName) return;

      const keys = Object.keys(obj);
      const doneKey = keys.find((k) => /(must|required|need).*(done|finish|learned|study|complete|pass)|(done|finish|learned|study|complete|pass).*(must|required|need)/i.test(k));
      const totalKey = keys.find((k) => /(must|required|need).*(count|num|total)|(count|num|total).*(must|required|need)/i.test(k));
      if (!doneKey || !totalKey) return;

      const done = Number(obj[doneKey]);
      const total = Number(obj[totalKey]);
      if (!Number.isFinite(done) || !Number.isFinite(total)) return;

      const meta = {
        progressText: `必学${done}/${total}`,
        progressType: '必学',
        progressDone: done,
        progressTotal: total,
        source: 'api:numeric-pair'
      };
      setMeta(pointId, pointName, meta);
    }

    function maybeRecordByResourcePair(obj) {
      if (!obj || typeof obj !== 'object') return;
      const pointId = String(pick(obj, ['knowledgeId', 'pointId', 'nodeUid', 'id'], '') || '');
      const pointName = String(pick(obj, ['knowledgeName', 'pointName', 'name', 'title', 'nodeName'], '') || '');
      if (!pointId && !pointName) return;

      const keys = Object.keys(obj);
      const doneKey = keys.find((k) =>
        /(finish|finished|complete|learned|done).*(resource|res)|(resource|res).*(finish|finished|complete|learned|done)/i.test(k)
      );
      const totalKey = keys.find((k) =>
        /(resource|res).*(count|num|total)|(count|num|total).*(resource|res)/i.test(k)
      );
      if (!doneKey || !totalKey) return;

      const done = Number(obj[doneKey]);
      const total = Number(obj[totalKey]);
      if (!Number.isFinite(done) || !Number.isFinite(total)) return;
      const meta = {
        progressText: `必学${done}/${total}`,
        progressType: '必学',
        progressDone: done,
        progressTotal: total,
        source: 'api:resource-pair'
      };
      setMeta(pointId, pointName, meta);
    }

    function maybeRecordFinishedCount(obj) {
      if (!obj || typeof obj !== 'object') return;
      const pointId = String(pick(obj, ['knowledgeId', 'pointId', 'nodeUid', 'id'], '') || '');
      const pointName = String(pick(obj, ['knowledgeName', 'pointName', 'name', 'title', 'nodeName'], '') || '');
      const done = toNumberOrNaN(pick(obj, ['finishedResourceCount', 'finishedCount'], NaN));
      const total = toNumberOrNaN(pick(obj, ['resourceCount', 'totalResourceCount', 'totalCount'], NaN));
      if (!Number.isFinite(done) || !Number.isFinite(total) || total < 0) return;
      if (!pointId && !pointName) return;
      const meta = {
        progressText: `必学${done}/${total}`,
        progressType: '必学',
        progressDone: done,
        progressTotal: total,
        source: 'api:finished-resource-count'
      };
      setMeta(pointId, pointName, meta);
    }

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 12) return;
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
        if (typeof v === 'object' && v !== null) walk(v, depth + 1);
      }
    }

    // 优先从真实接口响应里按知识点逐条构建进度。
    for (const item of CAPTURED_TRAFFIC) {
      if (!item || !item.url || !item.responseJson || !isSuccessResponse(item.responseJson)) continue;
      if (!item.url.includes('/resources/list-knowledge-resource')) continue;

      const req = parseRequestBody(item.requestBody);
      const pointId =
        String(pick(req, ['knowledgeId', 'nodeUid', 'pointId', 'id'], '') || '') ||
        extractPointIdFromKnowledgeResourcesResponse(item.responseJson) ||
        extractPointIdFromText(item.requestBody) ||
        extractPointIdFromText(item.url);
      const resources = getResourceListFromResponse(item.responseJson);
      const meta = buildRequiredProgressFromResources(resources);
      if (meta && pointId) setMeta(pointId, '', meta);
    }

    // 其余接口作为补充（例如 node 目录类返回 finishedResourceCount/resourceCount）。
    const fallbackTargets = CAPTURED_TRAFFIC.filter((it) =>
      it &&
      it.responseJson &&
      isSuccessResponse(it.responseJson) &&
      (
        it.url.includes('/knowledge-study/get-course-knowledge-dic') ||
        it.url.includes('/maptree/list-node-detail-supplements') ||
        it.url.includes('/resources/list-node-resources') ||
        it.url.includes('/path/list-child-node-detail') ||
        it.url.includes('/maptree/get-map-tree-node-detail')
      )
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
          const pid = String(point.pointId || '');
          const pname = String(point.pointName || '');
          const meta = (pid && domMeta.byPointId.get(pid)) || (pname && domMeta.byPointName.get(pname));
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
      if (!node || typeof node !== 'object' || depth > 8) return;
      if (visited.has(node)) return;
      visited.add(node);

      if (Array.isArray(node.themeList) && node.themeList.length > 0) {
        candidates.push(node.themeList);
      }
      if (Array.isArray(node.list) && node.list.length > 0) {
        const sample = node.list[0] || {};
        if (typeof sample === 'object' && (
          sample.themeName || sample.subThemeList || sample.knowledgeList || sample.knowledgeName
        )) {
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
    return applyUnitHints(normalizeKnowledgeDic({ data: { themeList } }), hints);
  }

  function countStats(modules) {
    const moduleCount = modules.length;
    const unitCount = modules.reduce((n, m) => n + (m.units?.length || 0), 0);
    const pointCount = modules.reduce((n, m) => n + (m.units || []).reduce((a, u) => a + (u.points?.length || 0), 0), 0);
    return { moduleCount, unitCount, pointCount };
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
            moduleId: mod.moduleId || '',
            moduleName: mod.moduleName || '',
            unitId: unit.unitId || '',
            unitName: unit.unitName || '',
            pointId: point.pointId || '',
            pointName: point.pointName || '',
            progressText: point.progressText || '',
            progressDone: point.progressDone,
            progressTotal: point.progressTotal
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
        })
      }))
    }));
  }

  function formatSeconds(seconds) {
    const n = Number(seconds || 0);
    if (!Number.isFinite(n) || n <= 0) return '';
    const min = Math.floor(n / 60);
    const sec = Math.floor(n % 60);
    return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
  }

  function formatSecondsClock(seconds) {
    const n = Number(seconds || 0);
    if (!Number.isFinite(n) || n < 0) return '';
    const total = Math.floor(n);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':');
  }

  function getResourceTypeText(resource) {
    const dataType = Number(resource && resource.resourcesDataType);
    const type = Number(resource && resource.resourcesType);
    if (dataType === 11) return '视频';
    if (dataType === 12) return '链接';
    if (dataType === 21) return '图文';
    if (dataType === 22) return '视频';
    if (type === 1) return '资源';
    if (type === 2) return '资料';
    return '资源';
  }

  function isVideoResource(resource) {
    const dataType = Number(resource && resource.resourcesDataType);
    return dataType === 11 || dataType === 22;
  }

  function getResourceStatusText(resource) {
    return Number(resource && resource.studyStatus) === 1 ? '已学' : '未学';
  }

  function getResourceStudyTimeText(resource) {
    if (!isVideoResource(resource)) return '';
    const studied = Number(resource && resource.schedule);
    const total = Number(resource && resource.resourcesTime);
    const studiedText = formatSeconds(studied);
    const totalText = formatSeconds(total);
    if (studied > 0 && total > 0) return `进度 ${studiedText} / ${totalText}`;
    if (studied > 0) return `进度 ${studiedText}`;
    if (total > 0) return `时长 ${totalText}`;
    return '';
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
    const played = Number.isFinite(studyTotal) && studyTotal > 0 ? studyTotal : schedule;
    if (Number.isFinite(total) && total > 0 && Number.isFinite(played) && played >= 0) {
      return clampPercent((played / total) * 100);
    }
    return null;
  }

  function getCurrentLearningProgressText(summary) {
    if (!summary) return '';
    const status = Number(summary && summary.studyStatus);
    if (!summary.isVideo) return status === 1 ? '学习状态: 已完成' : '学习状态: 未完成';
    const percent = getVideoProgressPercent(summary);
    if (status === 1) return '学习进度: 已完成';
    if (percent !== null) return `学习进度: ${percent}%`;
    return '学习进度: 未开始';
  }

  function getCurrentLearningDurationText(summary) {
    if (!summary || !summary.isVideo) return '';
    const studied = Number(summary && summary.studyTotalTime);
    const total = Number(summary && summary.resourcesTime);
    const studiedText = formatSeconds(studied);
    const totalText = formatSeconds(total);
    if (studied > 0 && total > 0) return `学习时长: ${studiedText} / ${totalText}`;
    if (studied > 0) return `学习时长: ${studiedText}`;
    if (total > 0) return `资源时长: ${totalText}`;
    return '';
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
    const base = 'display:inline-flex;align-items:center;padding:0 6px;border-radius:4px;font-size:11px;line-height:1.7;margin:2px 6px 2px 0;border:1px solid #dbe6f3;vertical-align:middle;background:#f8fafc;';
    if (kind === 'done') return `${base}color:#166534;border-color:#86efac;background:#ecfdf3;`;
    if (kind === 'todo') return `${base}color:#b91c1c;border-color:#fecaca;background:#fef2f2;`;
    if (kind === 'type') return `${base}color:#334155;border-color:#cbd5e1;background:#f1f5f9;`;
    if (kind === 'time') return `${base}color:#92400e;border-color:#fcd34d;background:#fffbeb;`;
    return `${base}color:#334155;border-color:#cbd5e1;background:#f1f5f9;`;
  }

  function appendTag(parent, text, kind) {
    if (!text) return;
    const tag = document.createElement('span');
    tag.textContent = text;
    tag.style.cssText = getTagStyle(kind);
    parent.appendChild(tag);
  }

  function normalizeProgressText(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function getPointSummaryText(point) {
    const parts = [];
    const seen = new Set();
    function pushProgressText(text) {
      const value = String(text || '').trim();
      const key = normalizeProgressText(value);
      if (!value || seen.has(key)) return;
      seen.add(key);
      parts.push(value);
    }

    pushProgressText(point.progressText);
    if (
      point.requiredProgressText &&
      normalizeProgressText(point.requiredProgressText) !== normalizeProgressText(point.progressText) &&
      String(point.requiredProgressText).trim() !== ''
    ) {
      pushProgressText(point.requiredProgressText);
    }
    return parts.join(' | ');
  }

  function bindExclusiveDetails(detailsList) {
    for (const details of detailsList || []) {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        for (const peer of detailsList) {
          if (peer !== details) peer.open = false;
        }
      });
    }
  }

  const ICON_PATHS = {
    play: ['M8 5v14l11-7z'],
    pause: ['M10 5v14', 'M14 5v14'],
    stop: ['M7 7h10v10H7z'],
    rewind10: ['M11 19l-7-7 7-7v14z', 'M20 19l-7-7 7-7v14z'],
    forward10: ['M13 5l7 7-7 7V5z', 'M4 5l7 7-7 7V5z'],
    volumeOn: ['M11 5 6 9H3v6h3l5 4z', 'M16 9a5 5 0 0 1 0 6', 'M19 7a8 8 0 0 1 0 10'],
    volumeOff: ['M11 5 6 9H3v6h3l5 4z', 'M16 9l5 6', 'M21 9l-5 6'],
    eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    eyeOff: ['M3 3l18 18', 'M10.7 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-4.2 5.1', 'M6.6 6.6A18.7 18.7 0 0 0 2 12s3.5 7 10 7c1.9 0 3.5-.5 5-1.2', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
    chevronRight: ['M9 6l6 6-6 6'],
    chevronLeft: ['M15 6l-6 6 6 6'],
    externalLink: ['M14 3h7v7', 'M10 14 21 3', 'M21 14v7H3V3h7'],
    refresh: ['M3 12a9 9 0 0 1 15.5-6.4L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15.5 6.4L3 16', 'M3 21v-5h5'],
    copy: ['M9 9h11v11H9z', 'M4 15H3V4h11v1'],
    download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 20h16']
  };

  function createIcon(name, options = {}) {
    const paths = ICON_PATHS[name] || [];
    const size = Number(options.size || 14);
    const strokeWidth = Number(options.strokeWidth || 2);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(strokeWidth));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.style.display = 'inline-block';
    svg.style.flex = '0 0 auto';
    for (const d of paths) {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    }
    return svg;
  }

  function setButtonIconLabel(btn, iconName, label, iconSize = 14) {
    if (!btn) return;
    btn.innerHTML = '';
    if (iconName) {
      const icon = createIcon(iconName, { size: iconSize });
      btn.appendChild(icon);
    }
    const text = document.createElement('span');
    text.textContent = label;
    btn.appendChild(text);
  }

  function createIconBadge(iconName, options = {}) {
    const badge = document.createElement('div');
    badge.style.cssText = [
      'flex:0 0 auto',
      'border-radius:999px',
      'min-width:26px',
      'height:26px',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      `border:1px solid ${options.borderColor || '#93c5fd'}`,
      `background:${options.bgColor || '#dbeafe'}`,
      `color:${options.iconColor || '#1d4ed8'}`
    ].join(';');
    const icon = createIcon(iconName, {
      size: Number(options.iconSize || 16),
      strokeWidth: Number(options.strokeWidth || 2.2)
    });
    badge.appendChild(icon);
    return badge;
  }

  function findLatestUnfinishedResource(modules, options = {}) {
    const excludeUid = String(options && options.excludeResourceUid || '').trim();
    for (const mod of modules || []) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          for (const [resourceIndex, resource] of (point.requiredResources || []).entries()) {
            const resourceUid = String(resource && resource.resourcesUid || '').trim();
            if (excludeUid && resourceUid && resourceUid === excludeUid) continue;
            if (Number(resource && resource.studyStatus) !== 1) {
              return {
                moduleName: mod.moduleName || '',
                unitName: unit.unitName || '',
                pointName: point.pointName || '',
                pointId: String(point.pointId || ''),
                resourceName: resource.resourcesName || resource.resourcesFileName || resource.resourcesUid || '未命名资源',
                resourceUid,
                resourceIndex,
                resourceUrl: String(resource.resourcesUrl || ''),
                typeText: getResourceTypeText(resource),
                progressText: getResourceStudyTimeText(resource)
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
    if (total <= 0) return '';
    return `${finished}/${total}`;
  }

  function getRequiredProgressRatio(result) {
    if (!result) return '';
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
    if (total <= 0) return '';
    return `${finished}/${total}`;
  }

  function textEquals(a, b) {
    return String(a || '').replace(/\s+/g, '').trim() === String(b || '').replace(/\s+/g, '').trim();
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function findPointElement(pointName) {
    const selectors = [
      '.section-item-collapse-info .title-text',
      '.collapse-item-sub .title-text'
    ];
    for (const selector of selectors) {
      const list = Array.from(document.querySelectorAll(selector));
      const exact = list.find((el) => textEquals(el.textContent, pointName));
      if (exact) return exact;
    }
    return null;
  }

  function findPointAndResource(result, resourceUid) {
    const targetUid = String(resourceUid || '').trim();
    if (!targetUid || !result || !Array.isArray(result.modules)) return null;
    for (const mod of result.modules) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          for (const [index, resource] of (point.requiredResources || []).entries()) {
            if (String(resource && resource.resourcesUid || '') !== targetUid) continue;
            return {
              module: mod,
              unit,
              point,
              resource,
              resourceIndex: index
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
      sessionStorage.setItem(getPendingResourceKey(route), JSON.stringify({
        createdAt: Date.now(),
        courseId: route.courseId,
        pointId: String(match && match.point && match.point.pointId || ''),
        resourceUid: String(match && match.resource && match.resource.resourcesUid || ''),
        resourceName: String(match && match.resource && match.resource.resourcesName || '')
      }));
    } catch (e) {
      console.warn('[知识抓取] 保存待打开资源失败:', e.message);
    }
  }

  function setActiveResourceHint(match, source = 'unknown') {
    try {
      const route = parseRoute();
      const payload = {
        createdAt: Date.now(),
        courseId: route.courseId,
        pointId: String(match && match.point && match.point.pointId || ''),
        resourceUid: String(match && match.resource && match.resource.resourcesUid || ''),
        resourceName: String(match && match.resource && match.resource.resourcesName || ''),
        source: String(source || 'unknown')
      };
      if (!payload.pointId || !payload.resourceUid) return;
      sessionStorage.setItem(getActiveResourceHintKey(route), JSON.stringify(payload));
    } catch (e) {
      console.warn('[知识抓取] 保存活动资源提示失败:', e.message);
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
    const seg = location.pathname.split('/').filter(Boolean);
    const learnIdx = seg.indexOf('learnPage');
    if (learnIdx >= 0 && seg.length >= learnIdx + 4) {
      seg[learnIdx + 1] = route.courseId;
      seg[learnIdx + 2] = String(pointId || '');
      const url = new URL(location.href);
      url.pathname = `/${seg.join('/')}`;
      return url.toString();
    }
    const singleIdx = seg.indexOf('singleCourse');
    if (singleIdx >= 0 && seg[singleIdx + 1] === 'knowledgeStudy' && seg.length >= singleIdx + 4) {
      seg[singleIdx + 2] = route.courseId;
      seg[singleIdx + 3] = String(pointId || '');
      const url = new URL(location.href);
      url.pathname = `/${seg.join('/')}`;
      return url.toString();
    }
    return '';
  }

  function findPointByIdOrName(result, pointId, pointName) {
    const targetId = String(pointId || '').trim();
    const targetName = normalizeText(pointName);
    if (!result || !Array.isArray(result.modules)) return null;
    for (const mod of result.modules) {
      for (const unit of mod.units || []) {
        for (const point of unit.points || []) {
          if (targetId && String(point && point.pointId || '') === targetId) {
            return { module: mod, unit, point };
          }
          if (targetName && normalizeText(point && point.pointName) === targetName) {
            return { module: mod, unit, point };
          }
        }
      }
    }
    return null;
  }

  function isExternalResource(resource) {
    const dataType = Number(resource && resource.resourcesDataType);
    const url = String(resource && resource.resourcesUrl || '').trim();
    return dataType === 12 && /^https?:\/\//i.test(url);
  }

  function getCurrentVideoSrc() {
    const media = document.querySelector('video');
    if (!media) return '';
    return String(media.currentSrc || media.src || '').trim();
  }

  function getAssetStem(url) {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      const u = new URL(raw, location.href);
      const file = u.pathname.split('/').filter(Boolean).pop() || '';
      return file.replace(/\.[a-z0-9]+$/i, '').replace(/_(?:\d+|hd|sd)$/i, '');
    } catch {
      const file = raw.split('/').filter(Boolean).pop() || '';
      return file.replace(/\.[a-z0-9]+$/i, '').replace(/_(?:\d+|hd|sd)$/i, '');
    }
  }

  function getCurrentSegmentText() {
    const matches = Array.from(document.querySelectorAll('div,span,p'))
      .map((el) => String(el.textContent || '').trim())
      .filter((text) => /^00:00:00\s*-\s*\d{2}:\d{2}:\d{2}$/.test(text));
    return matches[0] || '';
  }

  function getCurrentPointNameFromPage() {
    const selectors = ['.study-main [class*=title]', '.resource-content [class*=title]', '.knowledge-title', 'h1', 'h2', 'h3'];
    for (const selector of selectors) {
      const list = Array.from(document.querySelectorAll(selector));
      for (const el of list) {
        const text = normalizeText(el.textContent);
        if (text && text.length >= 4) return text;
      }
    }
    return '';
  }

  function detectCurrentResource(result) {
    if (!result || !Array.isArray(result.modules)) return null;

    const route = parseRoute();
    const routePointId = String(route.classId || '').trim();
    const pointName = getCurrentPointNameFromPage();
    const pointMatch = findPointByIdOrName(result, routePointId, pointName);
    if (!pointMatch || !Array.isArray(pointMatch.point.requiredResources) || !pointMatch.point.requiredResources.length) {
      return null;
    }

    const resources = pointMatch.point.requiredResources;
    if (resources.length === 1) {
      return { ...pointMatch, resource: resources[0], resourceIndex: 0, matchedBy: 'single-resource' };
    }

    const currentVideoSrc = getCurrentVideoSrc();
    const currentVideoStem = getAssetStem(currentVideoSrc);
    if (currentVideoStem) {
      const hit = resources.findIndex((resource) => {
        const stems = [
          getAssetStem(resource.resourcesUrl),
          getAssetStem(resource.resourcesFileName),
          getAssetStem(resource.resourcesName)
        ].filter(Boolean);
        return stems.includes(currentVideoStem);
      });
      if (hit >= 0) {
        return { ...pointMatch, resource: resources[hit], resourceIndex: hit, matchedBy: 'video-src' };
      }
    }

    const segmentText = getCurrentSegmentText();
    if (segmentText) {
      const hit = resources.findIndex((resource) => formatSecondsClock(resource.resourcesTime) === segmentText.split('-').pop().trim());
      if (hit >= 0) {
        return { ...pointMatch, resource: resources[hit], resourceIndex: hit, matchedBy: 'segment-time' };
      }
    }

    const bodyText = normalizeText(document.body && document.body.innerText);
    const hitByName = resources.findIndex((resource) => {
      const name = normalizeText(resource.resourcesName || resource.resourcesFileName);
      if (!name) return false;
      if (!bodyText.includes(name)) return false;
      return Number(resource.resourcesDataType) === 21 || resources.length === 1;
    });
    if (hitByName >= 0) {
      return { ...pointMatch, resource: resources[hitByName], resourceIndex: hitByName, matchedBy: 'body-text' };
    }

    const activeHint = getActiveResourceHint();
    if (activeHint) {
      const currentPointId = String(pointMatch.point && pointMatch.point.pointId || '');
      if (String(activeHint.pointId || '') !== currentPointId) {
        clearActiveResourceHint();
      } else {
        const hitByHint = resources.findIndex((resource) => String(resource && resource.resourcesUid || '') === String(activeHint.resourceUid || ''));
        if (hitByHint >= 0) {
          return { ...pointMatch, resource: resources[hitByHint], resourceIndex: hitByHint, matchedBy: 'active-hint' };
        }
      }
    }

    return { ...pointMatch, resource: null, resourceIndex: -1, matchedBy: 'point-only' };
  }

  function getCurrentResourceSummary(result) {
    const match = detectCurrentResource(result);
    if (!match) return null;
    return {
      moduleName: match.module.moduleName || '',
      unitName: match.unit.unitName || '',
      pointId: String(match.point.pointId || ''),
      pointName: match.point.pointName || '',
      resourceName: match.resource ? (match.resource.resourcesName || match.resource.resourcesFileName || match.resource.resourcesUid || '未命名资源') : '未识别',
      resourceIndex: match.resourceIndex,
      resourceCount: Array.isArray(match.point.requiredResources) ? match.point.requiredResources.length : 0,
      resourcesUid: match.resource ? String(match.resource.resourcesUid || '') : '',
      resourcesFileId: match.resource ? String(match.resource.resourcesFileId || '') : '',
      resourcesType: match.resource && match.resource.resourcesType !== undefined ? Number(match.resource.resourcesType) : null,
      resourcesDataType: match.resource && match.resource.resourcesDataType !== undefined ? Number(match.resource.resourcesDataType) : null,
      studyStatus: match.resource && match.resource.studyStatus !== undefined ? Number(match.resource.studyStatus) : null,
      schedule: match.resource && match.resource.schedule !== undefined ? Number(match.resource.schedule) : null,
      studyTotalTime: match.resource && match.resource.studyTotalTime !== undefined ? Number(match.resource.studyTotalTime) : null,
      resourcesTime: match.resource && match.resource.resourcesTime !== undefined ? Number(match.resource.resourcesTime) : null,
      isVideo: isVideoResource(match.resource),
      matchedBy: match.matchedBy || '',
      isExternal: match.resource ? isExternalResource(match.resource) : false
    };
  }

  function getClickableAncestor(el) {
    return el && el.closest ? el.closest('a,button,[role="button"],li,div') : null;
  }

  function triggerElementClick(el) {
    if (!el) return false;
    const target = getClickableAncestor(el) || el;
    try {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    } catch {}
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
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

  async function clickExternalResourceAndKeepCourseTab(resource, timeoutMs = 10000, preferredIndex = -1) {
    const pageWin = getPageWindow();
    const canPatchOpen = !!(pageWin && typeof pageWin.open === 'function');
    const canUseGMOpenInTab = typeof GM_openInTab === 'function';
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
          const href = String(url || '').trim();
          if (href && /^https?:\/\//i.test(href) && canUseGMOpenInTab) {
            try {
              GM_openInTab(href, { active: false, insert: true, setParent: true });
              refocusCourseTab();
              return null;
            } catch (e) {
              console.warn('[知识抓取] GM_openInTab 打开外链失败，回退 window.open:', e.message);
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
    const pointName = String(point && point.pointName || '').trim();
    if (!pointName) throw new Error('知识点名称为空');
    const startTime = Date.now();
    const pointEl = findPointElement(pointName);
    if (!pointEl) throw new Error(`页面内未找到知识点: ${pointName}`);
    triggerElementClick(pointEl);
    const traffic = await waitForCapturedResourceResponse(startTime, point.pointId, timeoutMs);
    if (!traffic) await sleep(1200);
    return true;
  }

  function getResourceCardElements() {
    const selectors = [
      '.resources-list .basic-info-video-card-container',
      '.resources-list [class*="basic-info"][class*="card-container"]'
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
    const name = normalizeText(resource && (resource.resourcesName || resource.resourcesFileName));
    const uid = String(resource && resource.resourcesUid || '').trim();
    const fileId = String(resource && resource.resourcesFileId || '').trim();
    const url = String(resource && resource.resourcesUrl || '').trim();

    const index = Number(preferredIndex);
    const cards = getResourceCardElements();
    if (Number.isInteger(index) && index >= 0 && index < cards.length) {
      return cards[index];
    }
    if (name && cards.length) {
      const exactCard = cards.find((el) => normalizeText(el.textContent) === name);
      if (exactCard) return exactCard;
      const containsCard = cards.find((el) => {
        const text = normalizeText(el.textContent);
        return !!(text && text.includes(name));
      });
      if (containsCard) return containsCard;
    }

    if (!name && !uid && !fileId && !url) return null;

    const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], li, div, span'))
      .filter((el) => {
        const text = normalizeText(el.textContent);
        if (!text) return false;
        if (name) {
          if (text === name) return true;
          if (text.includes(name)) return true;
          if (name.length >= 6 && name.includes(text)) return true;
        }
        const html = String(el.outerHTML || '');
        if (uid && html.includes(uid)) return true;
        if (fileId && html.includes(fileId)) return true;
        if (url && html.includes(url)) return true;
        return false;
      });

    if (!candidates.length) return null;

    const exact = candidates.find((el) => normalizeText(el.textContent) === name);
    if (exact) return exact;
    const contains = candidates.find((el) => {
      const text = normalizeText(el.textContent);
      return !!(name && text && text.includes(name));
    });
    return contains || candidates[0];
  }

  async function clickResourceInPage(resource, timeoutMs = 10000, preferredIndex = -1) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const resourceEl = findResourceElement(resource, preferredIndex);
      if (resourceEl) {
        triggerElementClick(resourceEl);
        return true;
      }
      await sleep(250);
    }
    throw new Error(`页面内未找到资源: ${resource.resourcesName || resource.resourcesUid || '未命名资源'}`);
  }

  async function openResourceInCourse(result, resourceUid) {
    const match = findPointAndResource(result, resourceUid);
    if (!match) {
      throw new Error(`缓存中未找到资源 ${resourceUid}`);
    }
    const route = parseRoute();
    if (String(route.classId || '') !== String(match.point.pointId || '')) {
      setPendingResource(match);
      setActiveResourceHint(match, 'navigate-to-point');
      if (isVideoResource(match.resource)) {
        saveVideoSeekHint(match.resource.resourcesUid, Number(match.resource.studyTotalTime || 0));
      } else {
        clearVideoSeekHint();
      }
      const targetUrl = buildPointUrl(match.point.pointId);
      if (!targetUrl) throw new Error('无法构造目标知识点 URL');
      location.assign(targetUrl);
      return { ...match, openMode: 'navigating' };
    }
    if (isExternalResource(match.resource)) {
      await clickExternalResourceAndKeepCourseTab(match.resource, 12000, match.resourceIndex);
      setActiveResourceHint(match, 'external-click');
      clearPendingResource();
      return { ...match, openMode: 'external-in-page' };
    }
    if (isVideoResource(match.resource)) {
      saveVideoSeekHint(match.resource.resourcesUid, Number(match.resource.studyTotalTime || 0));
    } else {
      clearVideoSeekHint();
    }
    await clickResourceInPage(match.resource, 10000, match.resourceIndex);
    setActiveResourceHint(match, 'in-page-click');
    clearPendingResource();
    return { ...match, openMode: 'in-page' };
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
    if (String(route.classId || '') !== String(match.point.pointId || '')) {
      const targetUrl = buildPointUrl(match.point.pointId);
      if (targetUrl) location.assign(targetUrl);
      return true;
    }
    if (typeof onStatus === 'function') {
      onStatus(`状态: 继续打开资源 - ${match.resource.resourcesName || match.resource.resourcesUid}`);
    }
    if (isVideoResource(match.resource)) {
      saveVideoSeekHint(match.resource.resourcesUid, Number(match.resource.studyTotalTime || 0));
    } else {
      clearVideoSeekHint();
    }
    await clickResourceInPage(match.resource, 15000, match.resourceIndex);
    setActiveResourceHint(match, 'resume-pending');
    clearPendingResource();
    if (typeof onStatus === 'function') {
      onStatus(`状态: 已打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`);
    }
    return true;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForCapturedResourceResponse(startTime, pointId, timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (let i = CAPTURED_TRAFFIC.length - 1; i >= 0; i--) {
        const item = CAPTURED_TRAFFIC[i];
        if (!item || item.time < startTime) continue;
        if (!item.url || !item.url.includes('/resources/list-knowledge-resource')) continue;
        if (!item.responseJson || !isSuccessResponse(item.responseJson)) continue;
        const responsePointId = extractPointIdFromKnowledgeResourcesResponse(item.responseJson);
        if (!pointId || !responsePointId || String(responsePointId) === String(pointId)) return item;
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
        resourcesUid: String(r.resourcesUid || ''),
        resourcesName: String(r.resourcesName || ''),
        resourcesSyncType: Number(r.resourcesSyncType),
        studyStatus: r.studyStatus === undefined ? null : Number(r.studyStatus),
        schedule: r.schedule === undefined ? null : Number(r.schedule),
        resourcesType: r.resourcesType === undefined ? null : Number(r.resourcesType),
        resourcesDataType: r.resourcesDataType === undefined ? null : Number(r.resourcesDataType),
        resourcesLocalType: r.resourcesLocalType === undefined ? null : Number(r.resourcesLocalType),
        resourcesFileId: String(r.resourcesFileId || ''),
        resourcesFileName: String(r.resourcesFileName || ''),
        resourcesUrl: String(r.resourcesUrl || ''),
        resourcesTime: r.resourcesTime === undefined ? null : Number(r.resourcesTime),
        studyTotalTime: r.studyTotalTime === undefined ? null : Number(r.studyTotalTime),
        resourcesTag: String(r.resourcesTag || '')
      }));
  }

  function buildKnowledgeResourcePayloadVariants(route, point) {
    const base = {
      courseId: route.courseId,
      classId: route.classId,
      dateFormate: getDateFormate()
    };
    const pointId = String(point.pointId || '');
    return [
      { ...base, knowledgeId: pointId, nodeUid: pointId },
      { ...base, knowledgeId: pointId },
      { ...base, nodeUid: pointId }
    ];
  }

  async function collectRequiredResources(options = {}) {
    const route = parseRoute();
    const base = await collectKnowledge();
    const points = flattenPoints(base.modules);
    const gapMs = Number(options.gapMs || 0);
    const concurrency = Math.max(1, Math.min(Number(options.concurrency || 8), points.length || 1));
    const results = new Array(points.length);
    const endpoint = `${API_BASE}/resources/list-knowledge-resource`;
    let nextIndex = 0;
    let completed = 0;

    async function fetchPoint(point) {
      if (!point.pointId) {
        return {
          ...point,
          status: 'missing-point-id',
          requiredResourceCount: 0,
          requiredFinishedCount: 0,
          requiredResources: []
        };
      }

      try {
        const apiRes = await requestWithVariants(endpoint, buildKnowledgeResourcePayloadVariants(route, point));
        if (!apiRes.ok) {
          return {
            ...point,
            status: 'api-failed',
            sourceEndpoint: endpoint,
            requiredResourceCount: 0,
            requiredFinishedCount: 0,
            requiredResources: [],
            errors: apiRes.errors || []
          };
        }

        const requiredResources = normalizeRequiredResourcesFromResponse(apiRes.data);
        const requiredFinishedCount = requiredResources.filter((r) => Number(r.studyStatus) === 1).length;
        return {
          ...point,
          status: 'ok',
          sourceEndpoint: endpoint,
          sourceMethod: apiRes.method || 'POST-ENCRYPTED',
          responsePointId: extractPointIdFromKnowledgeResourcesResponse(apiRes.data),
          requestPayload: apiRes.payload || null,
          requiredResourceCount: requiredResources.length,
          requiredFinishedCount,
          requiredProgressText: `必学 ${requiredFinishedCount}/${requiredResources.length}`,
          requiredResources
        };
      } catch (e) {
        return {
          ...point,
          status: `exception: ${e.message}`,
          sourceEndpoint: endpoint,
          requiredResourceCount: 0,
          requiredFinishedCount: 0,
          requiredResources: []
        };
      }
    }

    async function worker() {
      while (nextIndex < points.length) {
        const idx = nextIndex++;
        const point = points[idx];
        if (typeof options.onProgress === 'function') {
          options.onProgress({ current: completed, total: points.length, point, phase: 'start' });
        }
        const result = await fetchPoint(point);
        results[idx] = result;
        completed += 1;
        if (typeof options.onProgress === 'function') {
          options.onProgress({ current: completed, total: points.length, point, result, phase: 'done' });
        }
        if (gapMs > 0) await sleep(gapMs);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const modulesWithResources = attachRequiredResourcesToModules(base.modules, results);

    return {
      fetchedAt: new Date().toISOString(),
      page: location.href,
      params: route,
      source: 'direct-encrypted-api:/stu/resources/list-knowledge-resource',
      concurrency,
      pointCount: points.length,
      okCount: results.filter((r) => r.status === 'ok').length,
      timeoutCount: 0,
      errorCount: results.filter((r) => r.status !== 'ok').length,
      elementMissingCount: 0,
      modules: modulesWithResources,
      points: results,
      structure: {
        ...base,
        modules: modulesWithResources
      }
    };
  }

  async function collectKnowledge() {
    const route = parseRoute();
    const basePayload = {
      courseId: route.courseId,
      classId: route.classId,
      dateFormate: getDateFormate()
    };
    const extPayload = {
      ...basePayload,
      knowledgeId: route.nodeUid,
      nodeUid: route.nodeUid
    };

    const urls = {
      knowledgeDic: `${API_BASE}/knowledge-study/get-course-knowledge-dic`,
      moduleInfo: `${API_BASE_COMMON}/course/query-module-info`,
      themeNodeList: `${API_BASE}/maptree/get-theme-node-list`
    };

    const [knowledgeDicRes, moduleInfoRes, themeNodeListRes] = await Promise.all([
      requestWithVariants(urls.knowledgeDic, [basePayload, extPayload]),
      requestWithVariants(urls.moduleInfo, [basePayload, extPayload]),
      requestWithVariants(urls.themeNodeList, [basePayload, extPayload])
    ]);

    const knowledgeDicRaw = knowledgeDicRes.ok ? knowledgeDicRes.data : { __error: knowledgeDicRes.errors };
    const moduleInfoRaw = moduleInfoRes.ok ? moduleInfoRes.data : { __error: moduleInfoRes.errors };
    const themeNodeListRaw = themeNodeListRes.ok ? themeNodeListRes.data : { __error: themeNodeListRes.errors };

    let modules = normalizeKnowledgeDic(knowledgeDicRaw);
    let source = 'knowledge-study/get-course-knowledge-dic';

    if (!modules.length) {
      const fallback = normalizeModuleInfo(moduleInfoRaw);
      if (fallback.length) {
        modules = fallback;
        source = 'common/course/query-module-info (fixed path)';
      }
    }

    if (!modules.length) {
      const fallback = normalizeThemeNodeList(themeNodeListRaw);
      if (fallback.length) {
        modules = fallback;
        source = 'maptree/get-theme-node-list';
      }
    }

    if (!modules.length) {
      const fallback = normalizeFromCaptured();
      if (fallback.length) {
        modules = fallback;
        source = 'captured-network-response';
      }
    }

    // 优先使用真实命中的接口响应（页面实际请求），避免猜测结构。
    if (!modules.length) {
      const t1 = pickLatestTrafficByUrl('/knowledge-study/get-course-knowledge-dic');
      if (t1) {
        const m = normalizeKnowledgeDic(t1.responseJson);
        if (m.length) {
          modules = m;
          source = 'captured-api:get-course-knowledge-dic';
        }
      }
    }
    if (!modules.length) {
      const t2 = pickLatestTrafficByUrl('/knowledge-study/list-knowledge-theme');
      if (t2) {
        const m = normalizeKnowledgeDic(t2.responseJson);
        if (m.length) {
          modules = m;
          source = 'captured-api:list-knowledge-theme';
        }
      }
    }
    if (!modules.length) {
      const t3 = pickLatestTrafficByUrl('/maptree/get-theme-node-list');
      if (t3) {
        const m = normalizeThemeNodeList(t3.responseJson);
        if (m.length) {
          modules = m;
          source = 'captured-api:get-theme-node-list';
        }
      }
    }

    const apiMeta = extractPointMetaFromCapturedApis();
    modules = mergePointMeta(modules, apiMeta);
    const hasKnowledgeResourcesTraffic = CAPTURED_TRAFFIC.some((it) =>
      it && it.url && it.url.includes('/resources/list-knowledge-resource')
    );
    const hasKnowledgeDicTraffic = CAPTURED_TRAFFIC.some((it) =>
      it && it.url && it.url.includes('/knowledge-study/get-course-knowledge-dic')
    );
    const progressCaptureReason =
      apiMeta.byPointId.size + apiMeta.byPointName.size > 0
        ? 'ok'
        : hasKnowledgeResourcesTraffic
          ? 'captured progress api but no recognizable count fields'
          : hasKnowledgeDicTraffic
            ? 'captured get-course-knowledge-dic but no recognizable count fields'
            : 'no captured call: /stu/resources/list-knowledge-resource or /stu/knowledge-study/get-course-knowledge-dic';

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
        themeNodeList: themeNodeListRaw
      },
      debug: {
        knowledgeDic: { ok: knowledgeDicRes.ok, errors: knowledgeDicRes.errors },
        moduleInfo: { ok: moduleInfoRes.ok, errors: moduleInfoRes.errors },
        themeNodeList: { ok: themeNodeListRes.ok, errors: themeNodeListRes.errors },
        capturedCount: CAPTURED_RESPONSES.length,
        capturedTrafficCount: CAPTURED_TRAFFIC.length,
        apiPointMetaCount: apiMeta.byPointId.size + apiMeta.byPointName.size,
        apiPointMetaById: apiMeta.byPointId.size,
        apiPointMetaByName: apiMeta.byPointName.size,
        apiPointMetaSources: apiMeta.sourceCount || {},
        progressCaptureReason,
        observedApiEndpoints: listObservedApiEndpoints().slice(0, 20),
        apiSamples: {
          supplements: pickApiSample('/maptree/list-node-detail-supplements'),
          knowledgeResources: pickApiSample('/resources/list-knowledge-resource'),
          knowledgeDic: pickApiSample('/knowledge-study/get-course-knowledge-dic')
        }
      }
    };
  }

  function renderTree(container, result, handlers = {}) {
    container.innerHTML = '';

    if (!result || !Array.isArray(result.modules) || result.modules.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '未抓取到结构数据';
      empty.style.cssText = 'color:#64748b;padding:8px 0;';
      container.appendChild(empty);
      return;
    }

    const moduleDetailsList = [];

    for (const [modIndex, mod] of result.modules.entries()) {
      const modDetails = document.createElement('details');
      modDetails.open = modIndex === 0;
      modDetails.style.cssText = 'margin-bottom:6px;border:1px solid #cbd5e1;border-radius:7px;padding:4px 6px;background:#ffffff;';
      moduleDetailsList.push(modDetails);

      const modSummary = document.createElement('summary');
      const modProgressText = getRequiredProgressSummary(
        (mod.units || []).flatMap((unit) => unit.points || [])
      );
      modSummary.textContent = `模块: ${mod.moduleName || '未命名'}${modProgressText ? ` (${modProgressText})` : ''}`;
      modSummary.style.cssText = 'cursor:pointer;color:#1e3a8a;font-weight:700;font-size:14px;line-height:1.45;';
      modDetails.appendChild(modSummary);

      const unitsWrap = document.createElement('div');
      unitsWrap.style.cssText = 'margin-top:6px;padding-left:8px;';
      const unitDetailsList = [];

      for (const [unitIndex, unit] of (mod.units || []).entries()) {
        const unitDetails = document.createElement('details');
        unitDetails.open = modIndex === 0 && unitIndex === 0;
        unitDetails.style.cssText = 'margin-bottom:6px;';
        unitDetailsList.push(unitDetails);

        const unitSummary = document.createElement('summary');
        const unitProgressText = getRequiredProgressSummary(unit.points || []);
        unitSummary.textContent = `单元: ${unit.unitName || '未命名'}${unitProgressText ? ` (${unitProgressText})` : ''}`;
        unitSummary.style.cssText = 'cursor:pointer;color:#334155;font-weight:600;font-size:13px;line-height:1.45;';
        unitDetails.appendChild(unitSummary);

        const pointsList = document.createElement('ul');
        pointsList.style.cssText = 'margin:6px 0 0 14px;padding:0;';
        for (const point of unit.points || []) {
          const li = document.createElement('li');
          const hasRequiredResources = Array.isArray(point.requiredResources) && point.requiredResources.length > 0;
          const pointTitle = document.createElement(hasRequiredResources ? 'summary' : 'div');
          const pointSummaryText = getPointSummaryText(point);
          pointTitle.textContent = point.pointName || '未命名知识点';
          if (pointSummaryText) {
            pointTitle.textContent += ` (${pointSummaryText})`;
          }
          li.style.cssText = 'list-style:none;color:#334155;line-height:1.6;margin-bottom:5px;font-size:13px;';

          const pointContent = hasRequiredResources ? document.createElement('details') : li;
          if (hasRequiredResources) {
            pointContent.style.cssText = 'margin:0;';
            pointTitle.style.cssText = 'cursor:pointer;color:#0f172a;font-weight:600;font-size:13px;line-height:1.55;';
            pointContent.appendChild(pointTitle);
            li.appendChild(pointContent);
          } else {
            pointTitle.style.cssText = 'color:#0f172a;font-size:13px;line-height:1.55;';
            li.appendChild(pointTitle);
          }

          if (hasRequiredResources) {
            const resourceWrap = document.createElement('div');
            resourceWrap.style.cssText = 'margin-top:4px;padding:6px 8px 4px 8px;border:1px solid #dbe6f3;background:#ffffff;border-radius:8px;';

            if (point.requiredResources.length > 0) {
              const resourceList = document.createElement('ol');
              resourceList.style.cssText = 'margin:0;padding-left:18px;';
              for (const resource of point.requiredResources) {
                const resourceItem = document.createElement('li');
                resourceItem.style.cssText = 'color:#334155;font-size:13px;margin:7px 0;';

                const name = resource.resourcesName || resource.resourcesFileName || resource.resourcesUid || '未命名资源';
                const statusText = getResourceStatusText(resource);
                const typeText = getResourceTypeText(resource);
                const studyTimeText = getResourceStudyTimeText(resource);
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:2px;';

                const titleWrap = document.createElement('div');
                titleWrap.style.cssText = 'min-width:0;line-height:1.6;';

                const openBtn = document.createElement('button');
                openBtn.type = 'button';
                openBtn.textContent = name;
                openBtn.style.cssText = 'border:none;background:transparent;padding:0;color:#1d4ed8;cursor:pointer;text-align:left;word-break:break-word;font:inherit;';
                if (typeof handlers.onOpenResource === 'function' && resource.resourcesUid) {
                  openBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openBtn.disabled = true;
                    const originalText = openBtn.textContent;
                    openBtn.textContent = '打开中...';
                    try {
                      await handlers.onOpenResource(resource, point);
                      openBtn.textContent = originalText;
                    } catch (err) {
                      openBtn.textContent = originalText;
                      alert(err && err.message ? err.message : '打开资源失败');
                    } finally {
                      openBtn.disabled = false;
                    }
                  });
                }
                titleWrap.appendChild(openBtn);

                const tagsWrap = document.createElement('div');
                tagsWrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;opacity:.95;';
                appendTag(tagsWrap, statusText, Number(resource && resource.studyStatus) === 1 ? 'done' : 'todo');
                appendTag(tagsWrap, typeText, 'type');
                appendTag(tagsWrap, studyTimeText, 'time');

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

  function createVideoControlPanel(anchorPanel, getResult, isAutomationRunning) {
    const existing = document.getElementById('zs-video-control-panel');
    if (existing) return existing;

    const panel = document.createElement('div');
    panel.id = 'zs-video-control-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:20px',
      'z-index:999999',
      'background:#ffffff',
      'color:#0f172a',
      'padding:14px 12px',
      'border-radius:14px',
      'font-size:12px',
      'width:460px',
      'display:flex',
      'flex-direction:column',
      'gap:12px',
      'border:1px solid #dbe6f3',
      'user-select:none',
      'overflow:auto'
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

    const title = document.createElement('div');
    title.textContent = '视频控制';
    title.style.cssText = 'font-weight:800;font-size:13px;color:#0f172a;line-height:1.2;letter-spacing:.2px;';

    const stateBadge = document.createElement('div');
    stateBadge.textContent = '未就绪';
    stateBadge.style.cssText = 'padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:11px;font-weight:700;line-height:1.4;';

    header.appendChild(title);
    header.appendChild(stateBadge);

    function makeControlButton(bg, fg) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = `border:none;background:${bg};color:${fg};padding:6px 10px;border-radius:9px;cursor:pointer;font-weight:700;line-height:1;display:inline-flex;align-items:center;justify-content:center;text-align:center;gap:6px;min-height:30px;`;
      return btn;
    }

    const controlsWrap = document.createElement('div');
    controlsWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const primaryControls = document.createElement('div');
    primaryControls.style.cssText = 'display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:8px;';

    const audioControls = document.createElement('div');
    audioControls.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

    const btnBack = makeControlButton('#e2e8f0', '#1e293b');
    setButtonIconLabel(btnBack, 'rewind10', '10s');

    const btnPlayPause = makeControlButton('#22c55e', '#052e16');
    setButtonIconLabel(btnPlayPause, 'play', '播放');

    const btnForward = makeControlButton('#e2e8f0', '#1e293b');
    setButtonIconLabel(btnForward, 'forward10', '10s');

    const btnMute = makeControlButton('#cbd5e1', '#0f172a');
    setButtonIconLabel(btnMute, 'volumeOff', '静音');

    const btnAutoMute = makeControlButton('#bae6fd', '#075985');
    setButtonIconLabel(btnAutoMute, 'volumeOff', '自动静音: 开');

    primaryControls.appendChild(btnBack);
    primaryControls.appendChild(btnPlayPause);
    primaryControls.appendChild(btnForward);
    audioControls.appendChild(btnMute);
    audioControls.appendChild(btnAutoMute);
    controlsWrap.appendChild(primaryControls);
    controlsWrap.appendChild(audioControls);

    const canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = 'padding:0;border:none;background:transparent;border-radius:0;';

    const progressCanvas = document.createElement('canvas');
    progressCanvas.width = 438;
    progressCanvas.height = 34;
    progressCanvas.style.cssText = 'width:100%;height:34px;display:block;cursor:pointer;';
    canvasWrap.appendChild(progressCanvas);

    const timeRow = document.createElement('div');
    timeRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;color:#64748b;font-size:12px;padding-top:2px;';
    const videoStateText = document.createElement('div');
    videoStateText.textContent = '未检测到视频';
    const timeText = document.createElement('div');
    timeText.textContent = '--:-- / --:--';
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
      if (!Number.isFinite(sec) || sec < 0) return '--:--';
      const whole = Math.floor(sec);
      const h = Math.floor(whole / 3600);
      const m = Math.floor((whole % 3600) / 60);
      const s = whole % 60;
      if (h > 0) return `${String(h)}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function getActiveVideoElement() {
      const videos = Array.from(document.querySelectorAll('video'));
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
      const ctx = progressCanvas.getContext('2d');
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
      ctx.fillStyle = '#dbe6f3';
      ctx.fill();
      ctx.save();
      roundedRectPath(trackLeft, y, trackW, barH, trackRadius);
      ctx.clip();

      if (!currentVideo) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(trackLeft, y, Math.floor(trackW * 0.1), barH);
        ctx.restore();
        timeText.textContent = '--:-- / --:--';
        videoStateText.textContent = '未检测到视频';
        return;
      }

      const duration = Number(currentVideo.duration);
      const current = Number(currentVideo.currentTime || 0);
      const ratio = Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;

      if (currentVideo.buffered && currentVideo.buffered.length > 0 && Number.isFinite(duration) && duration > 0) {
        const bufferedEnd = currentVideo.buffered.end(currentVideo.buffered.length - 1);
        const bufferedRatio = Math.max(0, Math.min(1, bufferedEnd / duration));
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(trackLeft, y, Math.floor(trackW * bufferedRatio), barH);
      }

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(trackLeft, y, Math.floor(trackW * ratio), barH);
      ctx.restore();

      const knobX = Math.floor(trackLeft + trackW * ratio);
      if (knobHover) {
        ctx.fillStyle = 'rgba(59,130,246,.22)';
        ctx.beginPath();
        ctx.arc(knobX, y + barH / 2, knobR + 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(knobX, y + barH / 2, knobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#93c5fd';
      ctx.stroke();

      timeText.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
      videoStateText.textContent = currentVideo.paused ? '已暂停' : '播放中';
    }

    function applyAutoMute(video) {
      if (!video || !autoMuteEnabled) return;
      video.muted = true;
    }

    function updateButtons() {
      setButtonIconLabel(btnAutoMute, autoMuteEnabled ? 'volumeOff' : 'volumeOn', autoMuteEnabled ? '自动静音: 开' : '自动静音: 关');
      btnAutoMute.style.background = autoMuteEnabled ? '#bae6fd' : '#e2e8f0';
      btnAutoMute.style.color = autoMuteEnabled ? '#075985' : '#475569';

      if (!currentVideo) {
        setButtonIconLabel(btnPlayPause, 'play', '播放');
        btnPlayPause.style.background = '#22c55e';
        btnPlayPause.style.color = '#052e16';
        setButtonIconLabel(btnMute, 'volumeOff', '静音');
        stateBadge.textContent = '未就绪';
        stateBadge.style.background = '#e2e8f0';
        stateBadge.style.color = '#334155';
        return;
      }
      setButtonIconLabel(btnPlayPause, currentVideo.paused ? 'play' : 'pause', currentVideo.paused ? '播放' : '暂停');
      btnPlayPause.style.background = currentVideo.paused ? '#22c55e' : '#f59e0b';
      btnPlayPause.style.color = currentVideo.paused ? '#052e16' : '#3b2f08';
      setButtonIconLabel(btnMute, currentVideo.muted ? 'volumeOn' : 'volumeOff', currentVideo.muted ? '取消静音' : '静音');
      stateBadge.textContent = currentVideo.paused ? '已暂停' : '播放中';
      stateBadge.style.background = currentVideo.paused ? '#e2e8f0' : '#dcfce7';
      stateBadge.style.color = currentVideo.paused ? '#334155' : '#166534';
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
      const x = Math.max(0, Math.min(innerWidth, clientX - rect.left - progressTrackPadding));
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
      const ratio = Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0;
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

    progressCanvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      progressCanvas.setPointerCapture(e.pointerId);
      updateKnobHover(e.clientX, e.clientY);
      seekByPointer(e.clientX);
    });
    progressCanvas.addEventListener('pointermove', (e) => {
      updateKnobHover(e.clientX, e.clientY);
      if (!dragging) return;
      seekByPointer(e.clientX);
    });
    progressCanvas.addEventListener('pointerup', (e) => {
      dragging = false;
      try {
        progressCanvas.releasePointerCapture(e.pointerId);
      } catch {}
      updateKnobHover(e.clientX, e.clientY);
      seekByPointer(e.clientX);
    });
    progressCanvas.addEventListener('pointercancel', () => {
      dragging = false;
      if (knobHover) {
        knobHover = false;
        drawProgress();
      }
    });
    progressCanvas.addEventListener('pointerleave', () => {
      if (knobHover) {
        knobHover = false;
        drawProgress();
      }
    });

    btnBack.addEventListener('click', () => {
      if (!currentVideo) return;
      currentVideo.currentTime = Math.max(0, Number(currentVideo.currentTime || 0) - 10);
      drawProgress();
    });

    btnForward.addEventListener('click', () => {
      if (!currentVideo) return;
      const duration = Number(currentVideo.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      currentVideo.currentTime = Math.min(duration, Number(currentVideo.currentTime || 0) + 10);
      drawProgress();
    });

    btnPlayPause.addEventListener('click', async () => {
      if (!currentVideo) return;
      try {
        if (currentVideo.paused) {
          await currentVideo.play();
        } else {
          currentVideo.pause();
        }
      } catch (e) {
        console.warn('[知识抓取] 切换播放失败:', e.message);
      }
      updateButtons();
      drawProgress();
    });

    btnMute.addEventListener('click', () => {
      if (!currentVideo) return;
      if (autoMuteEnabled && currentVideo.muted) {
        autoMuteEnabled = false;
        saveVideoAutoMuteEnabled(autoMuteEnabled);
      }
      currentVideo.muted = !currentVideo.muted;
      updateButtons();
    });

    btnAutoMute.addEventListener('click', () => {
      autoMuteEnabled = !autoMuteEnabled;
      saveVideoAutoMuteEnabled(autoMuteEnabled);
      if (autoMuteEnabled && currentVideo) currentVideo.muted = true;
      updateButtons();
      drawProgress();
    });

    function positionPanel() {
      if (panel.parentElement && panel.parentElement.id === 'zs-assistant-layout-slot') {
        panel.style.position = 'static';
        panel.style.top = 'auto';
        panel.style.right = 'auto';
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
      const result = typeof getResult === 'function' ? getResult() : null;
      const currentSummary = getCurrentResourceSummary(result);
      const isCurrentVideoResource = !!(currentSummary && currentSummary.isVideo);
      if (!isCurrentVideoResource) {
        bindVideo(null);
        panel.style.display = 'none';
        return;
      }
      const active = getActiveVideoElement();
      if (!active) {
        bindVideo(null);
        panel.style.display = 'none';
        return;
      }
      panel.style.display = 'flex';
      bindVideo(active);
      if (currentVideo) {
        const seekHint = loadVideoSeekHint();
        if (
          seekHint &&
          currentSummary &&
          String(seekHint.resourceUid || '') === String(currentSummary.resourcesUid || '')
        ) {
          const target = Number(seekHint.seekSeconds || 0);
          const duration = Number(currentVideo.duration || 0);
          const currentTime = Number(currentVideo.currentTime || 0);
          if (Number.isFinite(target) && target > 1 && Number.isFinite(duration) && duration > 3) {
            const clamped = Math.max(0, Math.min(duration - 0.8, target));
            if (Math.abs(currentTime - clamped) > 1.2) {
              currentVideo.currentTime = clamped;
            }
            clearVideoSeekHint();
          }
        }
        applyAutoMute(currentVideo);
        const automationRunning = typeof isAutomationRunning === 'function' ? !!isAutomationRunning() : false;
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
            console.warn('[知识抓取] 自动续播失败:', e.message);
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
    window.addEventListener('resize', positionPanel);
    window.addEventListener('beforeunload', () => {
      if (syncTimer) window.clearInterval(syncTimer);
      if (positionTimer) window.clearInterval(positionTimer);
    });

    return panel;
  }

  function getAiAssistantContainer() {
    const selectors = [
      '.right-section-outer',
      '.ai-assistant-new-wrapper',
      '.right-section',
      '.ai-assistant-main'
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
    target.setAttribute('data-zs-hidden-ai', '1');
    target.style.setProperty('display', 'none', 'important');
    target.style.setProperty('visibility', 'hidden', 'important');
    target.style.setProperty('pointer-events', 'none', 'important');
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

    let slot = parent.querySelector('#zs-assistant-layout-slot');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'zs-assistant-layout-slot';
      parent.insertBefore(slot, aiContainer.nextSibling);
    }
    slot.style.display = 'block';
    slot.style.position = 'static';
    slot.style.width = `${Math.max(260, Math.round(rect.width))}px`;
    slot.style.minWidth = `${Math.max(220, Math.round(rect.width))}px`;
    slot.style.maxWidth = `${Math.max(260, Math.round(rect.width))}px`;
    slot.style.height = `${Math.max(360, Math.round(rect.height))}px`;
    slot.style.display = 'flex';
    slot.style.flexDirection = 'column';
    slot.style.gap = '8px';
    slot.style.flex = '0 0 auto';
    slot.style.alignSelf = 'stretch';
    slot.style.margin = '0';
    slot.style.padding = '0';
    slot.style.minHeight = '0';
    slot.style.overflow = 'hidden';
    slot.style.position = 'relative';
    slot.style.zIndex = '1000001';

    if (panel.parentElement !== slot) {
      slot.prepend(panel);
    }

    const videoPanel = document.getElementById('zs-video-control-panel');
    if (videoPanel && videoPanel.parentElement !== slot) {
      slot.appendChild(videoPanel);
    }

    const width = Math.max(260, Math.round(rect.width));
    const slotHeight = Math.max(360, Math.round(rect.height));
    const videoDesiredHeight = videoPanel
      ? Math.max(220, Math.round(videoPanel.scrollHeight || videoPanel.offsetHeight || 220))
      : 0;
    const minMainHeight = 120;
    const mainHeight = Math.max(minMainHeight, slotHeight - (videoDesiredHeight ? (videoDesiredHeight + 8) : 0));
    const videoFinalHeight = videoPanel ? Math.max(200, slotHeight - mainHeight - 8) : 0;
    panel.style.position = 'static';
    panel.style.right = 'auto';
    panel.style.left = 'auto';
    panel.style.top = 'auto';
    panel.style.bottom = 'auto';
    panel.style.zIndex = '1000002';
    panel.style.position = 'relative';
    panel.style.margin = '0';
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${mainHeight}px`;
    panel.style.height = `${mainHeight}px`;
    panel.style.overflow = 'hidden';
    panel.style.minHeight = '0';

    if (videoPanel) {
      videoPanel.style.position = 'static';
      videoPanel.style.right = 'auto';
      videoPanel.style.left = 'auto';
      videoPanel.style.top = 'auto';
      videoPanel.style.bottom = 'auto';
      videoPanel.style.width = `${width}px`;
      videoPanel.style.height = `${videoFinalHeight}px`;
      videoPanel.style.maxHeight = `${videoFinalHeight}px`;
      videoPanel.style.margin = '0';
      videoPanel.style.zIndex = '1000002';
      videoPanel.style.flex = '0 0 auto';
      videoPanel.style.overflow = 'hidden';
    }
    return true;
  }

  function installNoSelectStyle() {
    if (document.getElementById('zs-no-select-style')) return;
    const style = document.createElement('style');
    style.id = 'zs-no-select-style';
    style.textContent = [
      '#zs-knowledge-capture-panel, #zs-knowledge-capture-panel * {',
      '  user-select: none !important;',
      '  -webkit-user-select: none !important;',
      '}',
      '#zs-video-control-panel, #zs-video-control-panel * {',
      '  user-select: none !important;',
      '  -webkit-user-select: none !important;',
      '}',
      '#zs-automation-overlay, #zs-automation-overlay * {',
      '  user-select: none !important;',
      '  -webkit-user-select: none !important;',
      '}',
      '#zs-automation-overlay-loader {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  gap: 11px;',
      '  margin-bottom: 16px;',
      '}',
      '#zs-automation-overlay-loader .zs-loader-dot {',
      '  width: 26px;',
      '  height: 26px;',
      '  border-radius: 6px;',
      '  box-shadow: 0 4px 9px rgba(30, 64, 175, .16);',
      '  opacity: .98;',
      '  transform-origin: center 22px;',
      '  will-change: transform;',
      '}',
      '#zs-automation-overlay-loader .zs-loader-dot:nth-child(1) { background:#1d78de; }',
      '#zs-automation-overlay-loader .zs-loader-dot:nth-child(2) { background:#1d8ae2; }',
      '#zs-automation-overlay-loader .zs-loader-dot:nth-child(3) { background:#1e9ce6; }',
      '#zs-automation-overlay-loader .zs-loader-dot:nth-child(4) { background:#1faeea; }',
      '#zs-automation-overlay-loader .zs-loader-dot:nth-child(5) { background:#21c0ee; }',
      '#zs-knowledge-capture-panel button, #zs-video-control-panel button {',
      '  cursor: pointer !important;',
      '}',
      '#zs-knowledge-capture-panel button:hover, #zs-video-control-panel button:hover {',
      '  cursor: pointer !important;',
      '}',
      '.zs-btn-loader {',
      '  width: 12px;',
      '  height: 12px;',
      '  border-radius: 999px;',
      '  border: 2px solid rgba(248,250,252,.35);',
      '  border-top-color: #f8fafc;',
      '  border-right-color: #f8fafc;',
      '  animation: zs-spin .9s linear infinite;',
      '  flex: 0 0 auto;',
      '}',
      '@keyframes zs-spin {',
      '  from { transform: rotate(0deg); }',
      '  to { transform: rotate(360deg); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function createPanel() {
    installNoSelectStyle();
    const automationOverlay = document.createElement('div');
    automationOverlay.id = 'zs-automation-overlay';
    automationOverlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:999998',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:rgba(2,6,23,.28)',
      'backdrop-filter:blur(4px)',
      '-webkit-backdrop-filter:blur(4px)'
    ].join(';');
    const automationOverlayBox = document.createElement('div');
    automationOverlayBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;';
    const automationOverlayLoader = document.createElement('div');
    automationOverlayLoader.id = 'zs-automation-overlay-loader';
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement('span');
      dot.className = 'zs-loader-dot';
      automationOverlayLoader.appendChild(dot);
    }
    const automationOverlayStatusRow = document.createElement('div');
    automationOverlayStatusRow.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:10px;';
    const automationOverlayText = document.createElement('div');
    automationOverlayText.textContent = '正在执行自动化进程';
    automationOverlayText.style.cssText = 'color:#e2e8f0;font-weight:700;font-size:20px;letter-spacing:.5px;text-shadow:0 2px 8px rgba(0,0,0,.45);line-height:1.2;';
    const automationOverlayProgress = document.createElement('div');
    automationOverlayProgress.textContent = '--%';
    automationOverlayProgress.style.cssText = 'color:#93c5fd;font-weight:800;font-size:20px;line-height:1.2;letter-spacing:.4px;text-shadow:0 2px 8px rgba(0,0,0,.45);min-width:56px;text-align:left;';
    automationOverlayStatusRow.appendChild(automationOverlayText);
    automationOverlayStatusRow.appendChild(automationOverlayProgress);
    automationOverlayBox.appendChild(automationOverlayLoader);
    automationOverlayBox.appendChild(automationOverlayStatusRow);
    automationOverlay.appendChild(automationOverlayBox);
    document.body.appendChild(automationOverlay);

    const panel = document.createElement('div');
    panel.id = 'zs-knowledge-capture-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      'z-index:999999',
      'background:#ffffff',
      'color:#0f172a',
      'padding:12px',
      'border-radius:12px',
      'font-size:12px',
      'border:1px solid #dbe6f3',
      'width:460px',
      'max-height:78vh',
      'display:flex',
      'flex-direction:column',
      'gap:10px',
      'overflow:hidden'
    ].join(';');

    const title = document.createElement('div');
    title.textContent = '智慧树助手';
    title.style.cssText = 'font-weight:700;font-size:13px;color:#0f172a;line-height:1.2;';
    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

    const btnIssues = document.createElement('button');
    btnIssues.type = 'button';
    setButtonIconLabel(btnIssues, 'externalLink', '问题反馈', 13);
    btnIssues.style.cssText = [
      'border:1px solid #c7d2fe',
      'background:#eef2ff',
      'color:#3730a3',
      'padding:5px 9px',
      'border-radius:9px',
      'cursor:pointer',
      'font-weight:700',
      'line-height:1.1',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'gap:6px',
      'font-size:11px',
      'flex:0 0 auto'
    ].join(';');
    applyHoverAccent(btnIssues, { hoverBorderColor: '#818cf8', hoverShadow: '0 0 0 2px rgba(99,102,241,.14)' });

    const feedbackHint = document.createElement('div');
    feedbackHint.textContent = '问题反馈: 使用中如遇异常，可点击右上角“问题反馈”前往 GitHub Issues 提交。';
    feedbackHint.style.cssText = 'color:#475569;font-size:11px;line-height:1.45;margin-top:-2px;';

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:2px 0 4px 0;';

    function styleTopButton(btn, bg, fg, borderColor) {
      btn.style.cssText = [
        'border:1px solid ' + borderColor,
        'background:' + bg,
        'color:' + fg,
        'padding:7px 10px',
        'border-radius:10px',
        'cursor:pointer',
        'font-weight:700',
        'line-height:1.2',
        'min-height:34px',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'text-align:center',
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 2px 6px rgba(2,6,23,.35)',
        'transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease'
      ].join(';');
    }

    function applyHoverAccent(el, options = {}) {
      if (!el) return;
      const hoverBorderColor = options.hoverBorderColor || '#60a5fa';
      const hoverShadow = options.hoverShadow || '0 0 0 2px rgba(59,130,246,.15)';
      const originalBorderColor = el.style.borderColor || '';
      const originalShadow = el.style.boxShadow || '';
      const baseTransition = el.style.transition || '';
      const transitions = [baseTransition, 'border-color .18s ease', 'box-shadow .18s ease']
        .filter(Boolean)
        .join(',');
      el.style.transition = transitions;
      const activate = () => {
        el.style.borderColor = hoverBorderColor;
        el.style.boxShadow = originalShadow ? `${originalShadow}, ${hoverShadow}` : hoverShadow;
      };
      const deactivate = () => {
        el.style.borderColor = originalBorderColor;
        el.style.boxShadow = originalShadow;
      };
      el.addEventListener('mouseenter', activate);
      el.addEventListener('mouseleave', deactivate);
      el.addEventListener('focus', activate, true);
      el.addEventListener('blur', deactivate, true);
    }

    const btnRefresh = document.createElement('button');
    setButtonIconLabel(btnRefresh, 'refresh', '刷新');
    styleTopButton(btnRefresh, '#0f9f7d', '#f8fafc', '#1fb493');
    applyHoverAccent(btnRefresh, { hoverBorderColor: '#34d399', hoverShadow: '0 0 0 2px rgba(16,185,129,.18)', lift: true });

    const btnCopy = document.createElement('button');
    setButtonIconLabel(btnCopy, 'copy', '复制JSON');
    styleTopButton(btnCopy, '#2563eb', '#eaf2ff', '#3b82f6');
    applyHoverAccent(btnCopy, { hoverBorderColor: '#60a5fa', hoverShadow: '0 0 0 2px rgba(37,99,235,.2)', lift: true });

    const btnDownload = document.createElement('button');
    setButtonIconLabel(btnDownload, 'download', '下载JSON');
    styleTopButton(btnDownload, '#64748b', '#f8fafc', '#74849c');
    applyHoverAccent(btnDownload, { hoverBorderColor: '#94a3b8', hoverShadow: '0 0 0 2px rgba(100,116,139,.18)' });

    const treeEntryCard = document.createElement('div');
    treeEntryCard.style.cssText = 'border:1px solid #93c5fd;border-radius:11px;padding:10px 12px;background:#eff6ff;color:#0f172a;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;flex:0 0 auto;margin-top:8px;';
    treeEntryCard.setAttribute('role', 'button');
    treeEntryCard.tabIndex = 0;
    applyHoverAccent(treeEntryCard, { hoverBorderColor: '#3b82f6', hoverShadow: '0 0 0 2px rgba(59,130,246,.16)' });
    const treeEntryText = document.createElement('div');
    treeEntryText.textContent = '查看树结构详情';
    treeEntryText.style.cssText = 'font-weight:800;color:#1d4ed8;font-size:15px;line-height:1.2;letter-spacing:.2px;';
    const treeEntryHint = document.createElement('div');
    treeEntryHint.textContent = '展开模块/单元/知识点';
    treeEntryHint.style.cssText = 'font-size:12px;color:#334155;margin-top:3px;line-height:1.3;';
    const treeEntryLeft = document.createElement('div');
    treeEntryLeft.style.cssText = 'min-width:0;';
    treeEntryLeft.appendChild(treeEntryText);
    treeEntryLeft.appendChild(treeEntryHint);
    const treeEntryArrow = createIconBadge('chevronRight', {
      borderColor: '#93c5fd',
      bgColor: '#dbeafe',
      iconColor: '#1d4ed8',
      iconSize: 16
    });
    treeEntryCard.appendChild(treeEntryLeft);
    treeEntryCard.appendChild(treeEntryArrow);

    const statusCard = document.createElement('div');
    statusCard.style.cssText = 'border:1px solid #dbe6f3;border-radius:9px;padding:7px 9px;background:#f8fafc;display:flex;flex-direction:column;gap:5px;min-width:0;';
    applyHoverAccent(statusCard, { hoverBorderColor: '#93c5fd', hoverShadow: '0 0 0 2px rgba(59,130,246,.1)' });

    const status = document.createElement('div');
    status.textContent = '状态: 待执行';
    status.style.cssText = 'color:#334155;line-height:1.45;min-width:0;font-size:12px;';

    const stats = document.createElement('div');
    stats.textContent = '模块: 0 | 单元: 0 | 知识点: 0';
    stats.style.cssText = 'color:#92400e;line-height:1.45;min-width:0;font-size:12px;';

    const infoGrid = document.createElement('div');
    infoGrid.style.cssText = 'display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-height:0;overflow:auto;padding-right:2px;';

    const autoControlCard = document.createElement('div');
    autoControlCard.style.cssText = 'border:1px solid #dbe6f3;border-radius:9px;padding:8px;background:#f8fafc;color:#334155;';
    applyHoverAccent(autoControlCard, { hoverBorderColor: '#93c5fd', hoverShadow: '0 0 0 2px rgba(59,130,246,.1)' });

    const autoControlHeader = document.createElement('div');
    autoControlHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;';

    const autoControlTitle = document.createElement('div');
    autoControlTitle.textContent = '自动化控制';
    autoControlTitle.style.cssText = 'color:#1d4ed8;font-weight:700;line-height:1.2;';

    const autoControlToolbar = document.createElement('div');
    autoControlToolbar.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:2px 0 6px 0;';

    function styleAutoControlButton(btn) {
      btn.style.cssText = [
        'border:1px solid #dbe6f3',
        'background:#eef4fb',
        'color:#1f2937',
        'padding:7px 10px',
        'border-radius:10px',
        'cursor:pointer',
        'font-weight:700',
        'line-height:1.2',
        'min-height:34px',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'text-align:center',
        'gap:6px',
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 2px 6px rgba(2,6,23,.35)'
      ].join(';');
    }

    const btnAutoRun = document.createElement('button');
    setButtonIconLabel(btnAutoRun, 'play', '开始');
    styleAutoControlButton(btnAutoRun);
    applyHoverAccent(btnAutoRun, { hoverBorderColor: '#22c55e', hoverShadow: '0 0 0 2px rgba(34,197,94,.16)', lift: true });

    const btnMaskToggle = document.createElement('button');
    setButtonIconLabel(btnMaskToggle, 'eye', '遮罩: 开');
    styleAutoControlButton(btnMaskToggle);
    applyHoverAccent(btnMaskToggle, { hoverBorderColor: '#38bdf8', hoverShadow: '0 0 0 2px rgba(56,189,248,.18)', lift: true });

    const autoControlState = document.createElement('div');
    autoControlState.textContent = '自动化状态: 未开启';
    autoControlState.style.cssText = 'color:#166534;line-height:1.2;font-size:11px;flex:0 0 auto;';

    const nextPending = document.createElement('div');
    nextPending.style.cssText = 'border:1px solid #dbe6f3;border-radius:9px;padding:8px 10px;background:#f8fafc;color:#334155;font-size:13px;';
    nextPending.textContent = '最近未完成资源: 暂无';
    applyHoverAccent(nextPending, { hoverBorderColor: '#93c5fd', hoverShadow: '0 0 0 2px rgba(59,130,246,.1)' });

    const currentResource = document.createElement('div');
    currentResource.style.cssText = 'border:1px solid #dbe6f3;border-radius:9px;padding:8px 10px;background:#f8fafc;color:#334155;font-size:13px;';
    currentResource.textContent = '当前资源: 未识别';
    applyHoverAccent(currentResource, { hoverBorderColor: '#86efac', hoverShadow: '0 0 0 2px rgba(34,197,94,.12)' });

    const treeWrap = document.createElement('div');
    treeWrap.style.cssText = 'overflow:auto;border:1px solid #dbe6f3;border-radius:9px;padding:8px;background:#ffffff;min-height:240px;flex:1 1 auto;font-size:13px;';
    treeWrap.textContent = '点击“刷新”后在这里显示结构';

    const switchViewport = document.createElement('div');
    switchViewport.style.cssText = 'position:relative;flex:1 1 auto;min-height:0;overflow:hidden;';
    const switchTrack = document.createElement('div');
    switchTrack.style.cssText = 'display:flex;width:200%;height:100%;transform:translateX(0);transition:transform .26s cubic-bezier(.2,.8,.2,1);will-change:transform;';

    const overviewView = document.createElement('div');
    overviewView.style.cssText = 'display:flex;flex-direction:column;gap:0;min-height:0;flex:0 0 50%;width:50%;max-width:50%;overflow:hidden;';

    const detailView = document.createElement('div');
    detailView.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-height:0;flex:0 0 50%;width:50%;max-width:50%;overflow:hidden;';

    const detailHeader = document.createElement('div');
    detailHeader.style.cssText = 'display:flex;align-items:center;justify-content:flex-start;gap:8px;';

    const detailTitle = document.createElement('div');
    detailTitle.textContent = '树结构详情';
    detailTitle.style.cssText = 'font-weight:700;color:#0f172a;font-size:14px;';

    const backOverviewCard = document.createElement('div');
    backOverviewCard.style.cssText = 'border:1px solid #a7f3d0;border-radius:11px;padding:10px 12px;background:#ecfdf5;color:#334155;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;flex:0 0 auto;margin-top:8px;';
    backOverviewCard.setAttribute('role', 'button');
    backOverviewCard.tabIndex = 0;
    applyHoverAccent(backOverviewCard, { hoverBorderColor: '#34d399', hoverShadow: '0 0 0 2px rgba(16,185,129,.14)' });
    const backOverviewText = document.createElement('div');
    backOverviewText.textContent = '返回概览';
    backOverviewText.style.cssText = 'font-weight:800;color:#047857;font-size:15px;line-height:1.2;letter-spacing:.2px;';
    const backOverviewHint = document.createElement('div');
    backOverviewHint.textContent = '回到当前资源与最近未完成资源';
    backOverviewHint.style.cssText = 'font-size:12px;color:#334155;margin-top:3px;line-height:1.3;';
    const backOverviewLeft = document.createElement('div');
    backOverviewLeft.style.cssText = 'min-width:0;';
    backOverviewLeft.appendChild(backOverviewText);
    backOverviewLeft.appendChild(backOverviewHint);
    const backOverviewArrow = createIconBadge('chevronLeft', {
      borderColor: '#86efac',
      bgColor: '#dcfce7',
      iconColor: '#047857',
      iconSize: 16
    });
    backOverviewCard.appendChild(backOverviewLeft);
    backOverviewCard.appendChild(backOverviewArrow);

    const metaBar = document.createElement('div');
    metaBar.style.cssText = 'display:block;';

    let lastResult = null;
    let currentResourceTimer = 0;
    let currentView = 'overview';
    let autoLoopTimer = 0;
    let autoLoopBusy = false;
    let autoRunning = false;
    let autoProgressTimer = 0;
    let autoProgressBusy = false;
    let autoTargetUid = '';
    let automationMaskEnabled = loadAutomationMaskEnabled();
    let aiSlotSyncTimer = 0;
    let externalStuckCount = 0;
    const overlayLoaderDots = Array.from(automationOverlayLoader.querySelectorAll('.zs-loader-dot'));
    let overlayLoaderTimer = 0;
    let overlayLoaderFrameIndex = 0;
    let overlayLoaderRunning = false;
    let overlayProgressTimer = 0;

    function applyOverlayLoaderFrame(frameIndex) {
      const totalFrames = LOADER_GIF_FRAMES.length;
      if (!totalFrames || !overlayLoaderDots.length) return;
      const normalizedIndex = ((Number(frameIndex) || 0) % totalFrames + totalFrames) % totalFrames;
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
      const duration = Math.max(16, Number(LOADER_GIF_FRAME_DURATIONS[overlayLoaderFrameIndex]) || 20);
      overlayLoaderFrameIndex = (overlayLoaderFrameIndex + 1) % totalFrames;
      overlayLoaderTimer = window.setTimeout(tickOverlayLoaderAnimation, duration);
    }

    function startOverlayLoaderAnimation() {
      if (overlayLoaderRunning) return;
      overlayLoaderRunning = true;
      overlayLoaderFrameIndex = 0;
      tickOverlayLoaderAnimation();
    }

    function findVisibleVideoForOverlay() {
      const videos = Array.from(document.querySelectorAll('video'));
      for (const video of videos) {
        if (!video || video.readyState <= 0) continue;
        const rect = video.getBoundingClientRect();
        if (rect.width > 24 && rect.height > 24) return video;
      }
      return videos[0] || null;
    }

    function buildOverlayProgressText() {
      const summary = lastResult ? getCurrentResourceSummary(lastResult) : null;
      if (!summary) {
        if (autoTargetUid) return '--%';
        return '--%';
      }
      if (Number(summary.studyStatus) === 1) return '100%';
      if (summary.isVideo) {
        const percent = getVideoProgressPercent(summary);
        if (percent !== null) return `${percent}%`;
      }
      return '0%';
    }

    function updateOverlayProgressText() {
      automationOverlayProgress.textContent = autoRunning ? buildOverlayProgressText() : '--%';
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
      overlayProgressTimer = window.setInterval(updateOverlayProgressText, 1000);
    }

    function setView(mode) {
      currentView = mode === 'detail' ? 'detail' : 'overview';
      const isDetail = currentView === 'detail';
      switchTrack.style.transform = isDetail ? 'translateX(-50%)' : 'translateX(0)';
      overviewView.setAttribute('aria-hidden', isDetail ? 'true' : 'false');
      detailView.setAttribute('aria-hidden', isDetail ? 'false' : 'true');
    }

    function updateOverlayVisibility() {
      const shouldShow = autoRunning && automationMaskEnabled;
      automationOverlay.style.display = shouldShow ? 'flex' : 'none';
      if (shouldShow) {
        startOverlayLoaderAnimation();
        syncOverlayProgressTimer();
        updateOverlayProgressText();
      } else {
        stopOverlayLoaderAnimation(true);
        clearOverlayProgressTimer();
      }
    }

    function updateMaskToggleButton() {
      setButtonIconLabel(btnMaskToggle, automationMaskEnabled ? 'eye' : 'eyeOff', automationMaskEnabled ? '遮罩: 开' : '遮罩: 关');
      btnMaskToggle.style.background = automationMaskEnabled ? '#0284c7' : '#475569';
      btnMaskToggle.style.borderColor = automationMaskEnabled ? '#0ea5e9' : '#64748b';
      btnMaskToggle.style.color = '#f8fafc';
    }

    function setAutoControlRunning(isRunning) {
      autoRunning = !!isRunning;
      if (!autoRunning) externalStuckCount = 0;
      if (autoRunning) {
        btnAutoRun.innerHTML = '';
        const loader = document.createElement('span');
        loader.className = 'zs-btn-loader';
        const text = document.createElement('span');
        text.textContent = '终止';
        btnAutoRun.appendChild(loader);
        btnAutoRun.appendChild(text);
      } else {
        setButtonIconLabel(btnAutoRun, 'play', '开始');
      }
      btnAutoRun.style.background = autoRunning ? '#e11d48' : '#0f9f7d';
      btnAutoRun.style.borderColor = autoRunning ? '#f43f5e' : '#1fb493';
      btnAutoRun.style.color = '#f8fafc';
      autoControlState.textContent = autoRunning ? '自动化状态: 运行中' : '自动化状态: 未开启';
      syncAutoProgressTimer();
      updateOverlayVisibility();
      updateOverlayProgressText();
      saveAutomationState({
        enabled: autoRunning,
        targetUid: autoTargetUid
      });
    }

    async function openResourceWithPanelFlow(resourceUid, displayName) {
      const uid = String(resourceUid || '').trim();
      if (!uid) throw new Error('资源UID为空');
      if (!lastResult) throw new Error('无可用缓存，请先刷新');
      status.textContent = `状态: 正在打开资源 - ${displayName || uid}`;
      const match = await openResourceInCourse(lastResult, uid);
      const modeText =
        match.openMode === 'navigating'
          ? `正在前往知识点，稍后自动打开第${match.resourceIndex + 1}个资源`
          : match.openMode === 'external-in-page'
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

    function syncAutoProgressTimer() {
      clearAutoProgressTimer();
      if (!autoRunning) return;
      autoProgressTimer = window.setInterval(() => {
        refreshCurrentResourceProgressForAuto().catch((e) => {
          console.warn('[知识抓取] 自动化进度刷新失败:', e.message);
        });
      }, 2000);
    }

    function scheduleAutoLoop(delayMs = 2000) {
      clearAutoLoopTimer();
      if (!autoRunning) return;
      autoLoopTimer = window.setTimeout(() => {
        runAutoLoop().catch((e) => {
          console.error('[知识抓取] 自动化循环失败:', e);
          status.textContent = `状态: 自动化异常 - ${e.message}`;
          if (autoRunning) scheduleAutoLoop(8000);
        });
      }, Math.max(0, Number(delayMs || 0)));
    }

    async function refreshResultForAuto(reason) {
      status.textContent = `状态: 自动化刷新中 (${reason})...`;
      const result = await collectRequiredResources({
        concurrency: 20,
        gapMs: 0
      });
      saveCachedResult(result);
      applyResultToPanel(result, `状态: 自动化刷新完成 (${result.okCount}/${result.pointCount})`);
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
        const apiRes = await requestWithVariants(endpoint, buildKnowledgeResourcePayloadVariants(route, { pointId: summary.pointId }));
        if (!apiRes.ok) return;
        const latestResources = normalizeRequiredResourcesFromResponse(apiRes.data);
        if (!latestResources.length) return;

        const pointMatch = findPointByIdOrName(lastResult, summary.pointId, summary.pointName);
        if (!pointMatch || !Array.isArray(pointMatch.point.requiredResources)) return;
        const latestMap = new Map(
          latestResources
            .filter((resource) => String(resource && resource.resourcesUid || '').trim() !== '')
            .map((resource) => [String(resource.resourcesUid), resource])
        );
        let changed = false;
        pointMatch.point.requiredResources = pointMatch.point.requiredResources.map((resource) => {
          const uid = String(resource && resource.resourcesUid || '');
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
      const pointMatch = findPointByIdOrName(result, summary.pointId, summary.pointName);
      if (!pointMatch || !Array.isArray(pointMatch.point.requiredResources)) return false;
      let changed = false;
      pointMatch.point.requiredResources = pointMatch.point.requiredResources.map((resource) => {
        if (String(resource && resource.resourcesUid || '') !== String(summary.resourcesUid || '')) return resource;
        const next = { ...resource };
        if (Number(next.studyStatus) !== 1) {
          next.studyStatus = 1;
          changed = true;
        }
        if (summary.isVideo) {
          const totalSeconds = Number(next.resourcesTime);
          const playedSeconds = Number(next.studyTotalTime);
          const canAlignByDuration = Number.isFinite(totalSeconds) && totalSeconds > 0;
          if (canAlignByDuration && (!Number.isFinite(playedSeconds) || playedSeconds < totalSeconds)) {
            next.studyTotalTime = totalSeconds;
            changed = true;
          }
          if (canAlignByDuration && (!Number.isFinite(Number(next.schedule)) || Number(next.schedule) < totalSeconds)) {
            next.schedule = totalSeconds;
            changed = true;
          }
        }
        return changed ? next : resource;
      });
      return changed;
    }

    function stopAutoLoop(message) {
      clearAutoLoopTimer();
      setAutoControlRunning(false);
      autoTargetUid = '';
      if (message) status.textContent = message;
    }

    async function runAutoLoop() {
      if (!autoRunning || autoLoopBusy) return;
      autoLoopBusy = true;
      try {
        if (!lastResult) {
          await refreshResultForAuto('初始化');
          if (!autoRunning) return;
        }

        let pending = findLatestUnfinishedResource(lastResult && lastResult.modules);
        if (!pending || !pending.resourceUid) {
          stopAutoLoop('状态: 自动化完成，已无未完成资源');
          return;
        }
        const current = getCurrentResourceSummary(lastResult);
        const hasVideoContext = !current || !current.isVideo || !!getCurrentVideoSrc();
        const onTarget =
          current &&
          hasVideoContext &&
          String(current.resourcesUid || '') === String(pending.resourceUid || '');

        if (!onTarget) {
          externalStuckCount = 0;
          const pendingUid = String(pending.resourceUid || '');
          const targetUid = String(autoTargetUid || '');
          const isSameTarget = !!targetUid && targetUid === pendingUid;
          if (!current && isSameTarget) {
            status.textContent = '状态: 未识别到当前资源，正在刷新目标完成状态';
            await refreshResultForAuto('检查目标完成状态');
            if (!autoRunning) return;
            pending = findLatestUnfinishedResource(lastResult && lastResult.modules);
            if (!pending) {
              stopAutoLoop('状态: 自动化完成，已全部学习');
              return;
            }
            if (String(pending.resourceUid || '') !== targetUid) {
              autoTargetUid = String(pending.resourceUid || '');
              saveAutomationState({ enabled: true, targetUid: autoTargetUid });
              status.textContent = '状态: 目标资源已完成，准备前往下一个未完成资源';
              scheduleAutoLoop(200);
              return;
            }
            status.textContent = '状态: 当前目标仍未完成，等待后重试';
            scheduleAutoLoop(2500);
            return;
          }

          autoTargetUid = pendingUid;
          saveAutomationState({ enabled: true, targetUid: autoTargetUid });
          status.textContent = `状态: 自动前往未完成资源 - ${pending.resourceName}`;
          const match = await openResourceInCourse(lastResult, pending.resourceUid);
          const modeText = match.openMode === 'navigating'
            ? `正在前往知识点，稍后自动打开第${match.resourceIndex + 1}个资源`
            : match.openMode === 'external-in-page'
              ? `已点击外链资源并返回课程页 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`
            : `已自动打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`;
          status.textContent = `状态: ${modeText}`;
          if (match.openMode === 'navigating') return;
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
          const currentUid = String(current && current.resourcesUid || '').trim();
          pending = findLatestUnfinishedResource(
            lastResult && lastResult.modules,
            currentUid ? { excludeResourceUid: currentUid } : undefined
          );
          if (!pending) {
            stopAutoLoop('状态: 自动化完成，已全部学习');
            return;
          }
          autoTargetUid = String(pending.resourceUid || '');
          saveAutomationState({ enabled: true, targetUid: autoTargetUid });
          status.textContent = `状态: 学习进度已完成，自动前往下一个未完成资源 - ${pending.resourceName}`;
          const match = await openResourceInCourse(lastResult, pending.resourceUid);
          const modeText = match.openMode === 'navigating'
            ? `正在前往知识点，稍后自动打开第${match.resourceIndex + 1}个资源`
            : match.openMode === 'external-in-page'
              ? `已点击外链资源并返回课程页 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`
              : `已自动打开资源 (${match.point.pointName} / 第${match.resourceIndex + 1}个)`;
          status.textContent = `状态: ${modeText}`;
          if (match.openMode === 'navigating') return;
          scheduleAutoLoop(2500);
          return;
        }

        if (current && current.isExternal && current.resourcesUid) {
          status.textContent = '状态: 外链资源未完成，正在重试点击';
          try {
            await openResourceInCourse(lastResult, current.resourcesUid);
            await sleep(1200);
          } catch (e) {
            console.warn('[知识抓取] 外链资源重试点击失败:', e.message);
          }
        }

        await refreshResultForAuto('检查目标完成状态');
        if (!autoRunning) return;
        pending = findLatestUnfinishedResource(lastResult && lastResult.modules);
        if (!pending) {
          stopAutoLoop('状态: 自动化完成，已全部学习');
          return;
        }
        if (String(pending.resourceUid || '') !== String(autoTargetUid || '')) {
          externalStuckCount = 0;
          autoTargetUid = String(pending.resourceUid || '');
          saveAutomationState({ enabled: true, targetUid: autoTargetUid });
          status.textContent = '状态: 已更新资源状态，准备前往下一个未完成资源';
          scheduleAutoLoop(1200);
          return;
        }
        if (current && current.isExternal && String(current.resourcesUid || '') === String(autoTargetUid || '')) {
          externalStuckCount += 1;
          if (externalStuckCount >= 3) {
            status.textContent = '状态: 外链资源状态卡住，正在自动刷新页面后继续';
            saveAutomationState({ enabled: true, targetUid: autoTargetUid });
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
        status.textContent = '状态: 当前目标仍未完成，等待后重试';
        scheduleAutoLoop(6000);
      } finally {
        autoLoopBusy = false;
      }
    }

    async function detectUnfinishedResource(refreshFirst) {
      if (refreshFirst || !lastResult) {
        await refreshResultForAuto('检测未完成资源');
      }
      const pending = findLatestUnfinishedResource(lastResult && lastResult.modules);
      if (!pending) {
        status.textContent = '状态: 未检测到未完成资源';
      } else {
        status.textContent = `状态: 检测到未完成资源 - ${pending.resourceName}`;
      }
      return pending;
    }

    function renderNextPending(result) {
      const item = findLatestUnfinishedResource(result && result.modules);
      nextPending.innerHTML = '';

      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;';

      const title = document.createElement('div');
      title.textContent = '最近未完成资源';
      title.style.cssText = 'color:#dc2626;font-weight:700;line-height:1.3;font-size:14px;';

      const progress = document.createElement('div');
      const progressRatio = getRequiredProgressRatio(result);
      progress.textContent = progressRatio ? `总进度 ${progressRatio}` : '总进度 --/--';
      progress.style.cssText = 'color:#1d4ed8;font-weight:700;line-height:1.3;font-size:12px;flex:0 0 auto;';

      headerRow.appendChild(title);
      headerRow.appendChild(progress);
      nextPending.appendChild(headerRow);

      if (!item) {
        const empty = document.createElement('div');
        empty.textContent = '暂无';
        empty.style.cssText = 'color:#64748b;font-size:12px;line-height:1.45;';
        nextPending.appendChild(empty);
        return;
      }

      const path = document.createElement('div');
      const pathParts = [item.moduleName, item.unitName, item.pointName].filter(Boolean);
      path.textContent = pathParts.join(' / ') || '未定位到所属知识点';
      path.style.cssText = 'color:#64748b;font-size:12px;line-height:1.45;margin-bottom:4px;';

      const resourceRow = document.createElement('div');
      resourceRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;min-width:0;margin-bottom:4px;';

      const name = document.createElement(item.resourceUid ? 'button' : 'div');
      name.textContent = item.resourceName;
      name.style.cssText = item.resourceUid
        ? 'display:block;flex:1 1 auto;min-width:0;color:#0f172a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.45;font-size:14px;border:none;background:transparent;padding:0;text-align:left;cursor:pointer;'
        : 'display:block;flex:1 1 auto;min-width:0;color:#0f172a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.45;font-size:14px;';
      if (item.resourceUid) {
        name.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!lastResult) {
            status.textContent = '状态: 无可用缓存，请先刷新';
            return;
          }
          name.disabled = true;
          const originalText = name.textContent;
          name.textContent = '打开中...';
          try {
            await openResourceWithPanelFlow(item.resourceUid, item.resourceName);
          } catch (err) {
            console.error('[知识抓取] 打开最近未完成资源失败:', err);
            status.textContent = `状态: 打开失败 - ${err && err.message ? err.message : '未知错误'}`;
          } finally {
            name.textContent = originalText;
            name.disabled = false;
          }
        });
      }

      const tagsWrap = document.createElement('div');
      tagsWrap.style.cssText = 'display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;';
      appendTag(tagsWrap, item.typeText, 'type');

      nextPending.appendChild(path);
      resourceRow.appendChild(name);
      resourceRow.appendChild(tagsWrap);
      nextPending.appendChild(resourceRow);
    }

    function renderCurrentResource(result) {
      const summary = getCurrentResourceSummary(result);
      if (!summary) {
        currentResource.textContent = '当前资源: 未识别';
        return;
      }

      currentResource.innerHTML = '';

      const title = document.createElement('div');
      title.textContent = '当前资源';
      title.style.cssText = 'color:#16a34a;font-weight:700;margin-bottom:4px;line-height:1.3;font-size:14px;';

      const path = document.createElement('div');
      path.textContent = [summary.moduleName, summary.unitName, summary.pointName].filter(Boolean).join(' / ') || '未定位到知识点';
      path.style.cssText = 'color:#64748b;font-size:12px;line-height:1.45;margin-bottom:4px;';

      const progress = document.createElement('div');
      const progressMain = getCurrentLearningProgressText(summary);
      const progressDetail = getCurrentLearningDurationText(summary);
      progress.textContent = progressDetail ? `${progressMain} · ${progressDetail}` : progressMain;
      progress.style.cssText = 'color:#0f172a;font-size:13px;line-height:1.45;margin-bottom:5px;';

      const resourceRow = document.createElement('div');
      resourceRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;min-width:0;margin-bottom:4px;';

      const name = document.createElement('div');
      const indexText = summary.resourceIndex >= 0 && summary.resourceCount > 0
        ? `第 ${summary.resourceIndex + 1} / ${summary.resourceCount} 个`
        : `共 ${summary.resourceCount || 0} 个`;
      name.textContent = `${indexText} · ${summary.resourceName}`;
      name.style.cssText = 'display:block;flex:1 1 auto;min-width:0;color:#0f172a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;line-height:1.45;font-size:14px;';

      const tagsWrap = document.createElement('div');
      tagsWrap.style.cssText = 'display:flex;flex:0 0 auto;align-items:center;justify-content:flex-end;';
      const typeText = getResourceTypeText({
        resourcesType: summary.resourcesType,
        resourcesDataType: summary.resourcesDataType
      });
      appendTag(tagsWrap, typeText, 'type');
      appendTag(tagsWrap, summary.isExternal ? '外链' : '站内', summary.isExternal ? 'todo' : 'done');

      currentResource.appendChild(title);
      currentResource.appendChild(path);
      if (progress.textContent) currentResource.appendChild(progress);
      resourceRow.appendChild(name);
      resourceRow.appendChild(tagsWrap);
      currentResource.appendChild(resourceRow);
    }

    function syncCurrentResource(result) {
      if (!result) {
        currentResource.textContent = '当前资源: 未识别';
        updateOverlayProgressText();
        return;
      }
      renderCurrentResource(result);
      updateOverlayProgressText();
    }

    function applyResultToPanel(result, statusText) {
      if (!result) return;
      lastResult = result;
      if (typeof result.moduleCount === 'number' && typeof result.unitCount === 'number') {
        stats.textContent = `模块: ${result.moduleCount} | 单元: ${result.unitCount} | 知识点: ${result.pointCount || 0}`;
      } else {
        stats.textContent = `知识点: ${result.pointCount || 0} | 并发: ${result.concurrency || 0} | 成功: ${result.okCount || 0}`;
      }
      if (statusText) status.textContent = statusText;
      renderNextPending(result);
      syncCurrentResource(result);
      updateOverlayProgressText();
      renderTree(treeWrap, result, {
        onOpenResource: async (resource, point) => {
          await openResourceWithPanelFlow(
            resource.resourcesUid,
            resource.resourcesName || resource.resourcesFileName || resource.resourcesUid
          );
        }
      });
      resumePendingResource(result, (text) => {
        status.textContent = text;
      }).then((resumed) => {
        if (resumed) syncCurrentResource(result);
      }).catch((e) => {
        console.error('[知识抓取] 续开资源失败:', e);
        status.textContent = `状态: 续开资源失败 - ${e.message}`;
        clearPendingResource();
      });
    }

    const cachedResult = loadCachedResult();
    if (cachedResult) {
      const cacheTime = cachedResult.cachedAt ? new Date(cachedResult.cachedAt).toLocaleString() : '未知时间';
      applyResultToPanel(cachedResult, `状态: 已从缓存恢复 (${cacheTime})`);
    }
    updateMaskToggleButton();
    const persistedAuto = loadAutomationState();
    autoTargetUid = persistedAuto && persistedAuto.targetUid ? persistedAuto.targetUid : '';
    setAutoControlRunning(!!(persistedAuto && persistedAuto.enabled));
    if (autoRunning) {
      status.textContent = '状态: 已恢复自动化任务';
      scheduleAutoLoop(1200);
    }

    btnRefresh.addEventListener('click', async () => {
      status.textContent = '状态: 刷新中...';
      try {
        const result = await collectRequiredResources({
          concurrency: 20,
          gapMs: 0,
          onProgress: ({ current, total, point }) => {
            status.textContent = `状态: 刷新 ${current}/${total}`;
            stats.textContent = `当前: ${point.pointName || point.pointId}`;
          }
        });
        saveCachedResult(result);
        applyResultToPanel(result, `状态: 刷新完成 (${result.okCount}/${result.pointCount})`);
        console.log('[知识抓取] refreshed result =', result);
      } catch (e) {
        console.error('[知识抓取] 刷新失败:', e);
        status.textContent = `状态: 刷新失败 - ${e.message}`;
        treeWrap.textContent = '抓取失败，请检查登录状态或接口权限';
      }
    });

    btnCopy.addEventListener('click', async () => {
      if (!lastResult) {
        alert('请先执行一次“刷新”');
        return;
      }
      const text = JSON.stringify(lastResult, null, 2);
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      status.textContent = '状态: 已复制 JSON';
    });

    btnDownload.addEventListener('click', () => {
      if (!lastResult) {
        alert('请先执行一次“刷新”');
        return;
      }
      const filename = `zhihuishu-knowledge-${lastResult.params.courseId}-${Date.now()}.json`;
      downloadJson(filename, lastResult);
      status.textContent = '状态: 已下载 JSON';
    });

    btnAutoRun.addEventListener('click', async () => {
      if (autoRunning) {
        stopAutoLoop('状态: 已停止自动前往');
        return;
      }
      setAutoControlRunning(true);
      try {
        await detectUnfinishedResource(!lastResult);
        scheduleAutoLoop(200);
      } catch (e) {
        console.error('[知识抓取] 开启自动化失败:', e);
        stopAutoLoop(`状态: 自动化启动失败 - ${e.message}`);
      }
    });
    btnMaskToggle.addEventListener('click', () => {
      automationMaskEnabled = !automationMaskEnabled;
      saveAutomationMaskEnabled(automationMaskEnabled);
      updateMaskToggleButton();
      updateOverlayVisibility();
    });
    btnIssues.addEventListener('click', () => {
      window.open('https://github.com/yixing233/Smart-Tree-Assistant/issues', '_blank', 'noopener,noreferrer');
    });

    toolbar.appendChild(btnRefresh);
    toolbar.appendChild(btnCopy);
    toolbar.appendChild(btnDownload);

    autoControlToolbar.appendChild(btnAutoRun);
    autoControlToolbar.appendChild(btnMaskToggle);
    autoControlHeader.appendChild(autoControlTitle);
    autoControlHeader.appendChild(autoControlState);
    autoControlCard.appendChild(autoControlHeader);
    autoControlCard.appendChild(autoControlToolbar);

    infoGrid.appendChild(autoControlCard);
    infoGrid.appendChild(currentResource);
    infoGrid.appendChild(nextPending);
    overviewView.appendChild(infoGrid);
    overviewView.appendChild(treeEntryCard);

    statusCard.appendChild(status);
    statusCard.appendChild(stats);
    metaBar.appendChild(statusCard);
    detailHeader.appendChild(detailTitle);
    detailView.appendChild(detailHeader);
    detailView.appendChild(metaBar);
    detailView.appendChild(treeWrap);
    detailView.appendChild(backOverviewCard);

    titleBar.appendChild(title);
    titleBar.appendChild(btnIssues);
    panel.appendChild(titleBar);
    panel.appendChild(feedbackHint);
    panel.appendChild(toolbar);
    switchTrack.appendChild(overviewView);
    switchTrack.appendChild(detailView);
    switchViewport.appendChild(switchTrack);
    panel.appendChild(switchViewport);
    document.body.appendChild(panel);
    placePanelIntoAiSlot(panel);
    createVideoControlPanel(panel, () => lastResult, () => autoRunning);
    placePanelIntoAiSlot(panel);

    treeEntryCard.addEventListener('click', () => {
      setView('detail');
    });
    treeEntryCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setView('detail');
      }
    });
    backOverviewCard.addEventListener('click', () => {
      setView('overview');
    });
    backOverviewCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setView('overview');
      }
    });
    setView('overview');
    const syncAiSlot = () => {
      placePanelIntoAiSlot(panel);
    };
    syncAiSlot();
    aiSlotSyncTimer = window.setInterval(syncAiSlot, 1200);
    window.addEventListener('resize', syncAiSlot);
    window.addEventListener('beforeunload', () => {
      clearAutoLoopTimer();
      clearAutoProgressTimer();
      stopOverlayLoaderAnimation(false);
      clearOverlayProgressTimer();
      if (aiSlotSyncTimer) window.clearInterval(aiSlotSyncTimer);
    });

    currentResourceTimer = window.setInterval(() => {
      if (!lastResult) return;
      syncCurrentResource(lastResult);
    }, 800);
  }

  function init() {
    installNetworkHooks();
    if (!/\/learnPage\//.test(location.pathname)) return;
    if (document.getElementById('zs-knowledge-capture-panel')) return;
    createPanel();

    window.addEventListener('keydown', async (e) => {
      if (e.altKey && e.key.toLowerCase() === 'k') {
        try {
          const result = await collectKnowledge();
          console.log('[知识抓取 ALT+K] result =', result);
        } catch (err) {
          console.error('[知识抓取 ALT+K] failed:', err);
        }
      }
    });

    console.log('[知识抓取] Tampermonkey 脚本已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();




