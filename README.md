# 智慧树助手 (Smart Tree Assistant)

一个基于智慧树 AI 课程平台开发的用户脚本，能够自动完成所有必学内容。

## 功能简介

- 必学资源识别与自动化学习流程（开始 / 终止）
- 视频资源自动播放、自动续播、自动静音
- 视频进度控制（播放/暂停、快进快退、进度调节、静音）
- 当前资源、最近未完成资源、树结构详情联动
- 自动化运行遮罩与学习进度提示

## 安装教程（Tampermonkey）

### 1. 安装 Tampermonkey 扩展

1. 通过对应浏览器商店安装 Tampermonkey：
   - [![Microsoft Edge | 安装 Tampermonkey](https://img.shields.io/badge/Microsoft%20Edge-%E5%AE%89%E8%A3%85%20Tampermonkey-0078D4?style=for-the-badge)](https://microsoftedge.microsoft.com/addons/detail/%E7%AF%A1%E6%94%B9%E7%8C%B4/iikmkjmpaadaobahmlepeloendndfphd?hl=zh-CN)
   - [![Google Chrome | 安装 Tampermonkey](https://img.shields.io/badge/Google%20Chrome-%E5%AE%89%E8%A3%85%20Tampermonkey-4285F4?style=for-the-badge)](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=zh-CN&utm_source=ext_sidebar)
   - [![Mozilla Firefox | 安装 Tampermonkey](https://img.shields.io/badge/Mozilla%20Firefox-%E5%AE%89%E8%A3%85%20Tampermonkey-FF7139?style=for-the-badge)](https://addons.mozilla.org/zh-CN/firefox/addon/tampermonkey/)

2. 安装完成后，在扩展管理页面确认 Tampermonkey 已启用。

### 2. 在 Edge / Chrome 中开启开发者模式（重要）

Tampermonkey 在 Microsoft Edge 和 Chrome 中要正常生效，通常需要在浏览器扩展页启用开发者模式：

1. Microsoft Edge：打开 `edge://extensions/`，开启“开发人员模式”。
2. Google Chrome：打开 `chrome://extensions/`，开启“开发者模式”。

### 3. 启用“允许用户脚本”（重要）

在 Edge 扩展管理中，找到 Tampermonkey，并启用“允许用户脚本”。

请注意以下风险提示（请原文阅读）：

> 此扩展能运行未经 Microsoft Edge 评审的代码，可能会使你的设备或数据面临风险。仅在你完全信任此扩展的情况下启用此扩展。

### 4. 安装本脚本

1. 安装并启用 Tampermonkey 后，直接访问：

   [![安装 智慧树助手 脚本](https://img.shields.io/badge/GitHub-%E4%B8%80%E9%94%AE%E5%AE%89%E8%A3%85%20%E6%99%BA%E6%85%A7%E6%A0%91%E5%8A%A9%E6%89%8B-1E80FF?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yixing233/Smart-Tree-Assistant/raw/main/zhihuishu-knowledge-capture.user.js)

2. 浏览器会自动唤起 Tampermonkey 安装页面，点击“安装”即可。
3. 打开智慧树学习页并刷新，确认脚本已生效。

## 适配页面

- `https://ai-smart-course-student-pro.zhihuishu.com/learnPage/*`（主学习页，面板注入页）
- `https://ai-smart-course-student-pro.zhihuishu.com/singleCourse/knowledgeStudy/*`
- `https://hike-teaching-center.polymas.com/stu-hike/agent-course-hike/ai-course-center*`
- `https://onlineweb.zhihuishu.com/*`
- `https://passport.zhihuishu.com/login*`

## 常见问题

- 脚本未生效：
  - 检查 Tampermonkey 扩展是否启用。
  - 检查 Edge / Chrome 是否已开启开发者模式。
  - 检查 Tampermonkey 是否已开启“允许用户脚本”。
  - 检查脚本匹配站点（`@match`）是否包含当前页面。
  - 确认当前页面是否为 `learnPage`（面板仅在学习页显示）。

- 自动化中断或无响应：
  - 尝试刷新课程页后重新开始自动化。
  - 检查是否有弹窗拦截或页面权限限制。

## 问题反馈

如有 bug，请前往 GitHub 提交 Issues：

- [Smart-Tree-Assistant Issues](https://github.com/yixing233/Smart-Tree-Assistant/issues)

## 免责声明

本项目仅供学习与效率提升使用。请遵守目标网站服务条款与相关法律法规。
