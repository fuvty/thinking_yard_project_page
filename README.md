# Thinking Yard · Project Pages

NICS-EFC 的研究主页与项目页面，共用导航、视觉组件和构建入口。主页使用 Next.js，项目页输出静态 HTML/CSS/JS。

[线上站点](https://fuvty.github.io/thinking_yard_project_page/) · [Agent / 开发者设计指南](docs/design-system/README.md)

**项目清单只维护在 [config/projects.json](config/projects.json)。** 全站导航、主页卡片和研究路线从这里生成；README 不再重复列举项目。项目地址统一为 `/projects/<slug>/`。

## 本地开发

需要 Node.js 22.13+ 与 npm。

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:3000/>。指定端口：`npm run dev -- --port 3003`。
主页支持热更新；修改项目文件或共享配置后，生成器会自动更新页面，刷新浏览器查看。

## 修改位置

| 内容 | 源文件 |
| --- | --- |
| 项目名称、简介、分类、logo、研究路线 | `config/projects.json` |
| 分类与目录分组 | `config/categories.json`、`config/section-groups.json` |
| 站点名称、域名与部署前缀 | `config/site.json` |
| 主页内容、曲线与样式 | `hub/`（`app/` 是 Next.js 入口） |
| 项目标题、页面摘要与章节目录 | `projects/<slug>/page.json` |
| 项目正文、作者与资源链接 | `projects/<slug>/content.html` |
| 项目引用 | `projects/<slug>/citation.bib` |
| 项目素材、样式与交互 | `projects/<slug>/static/`；依赖在 `head.html` 引入 |
| 共享导航与公共控件 | `shared/navigation/`、`shared/ui/` |
| 设计变量、公共样式与 logo 文件 | `shared/styles/`、`shared/assets/` |
| 设计规范、交互动效和页面编写参考 | `docs/design-system/`（agent 从 `README.md` 开始） |

- 只编辑源文件；`public/`、`out/`、`.next/` 均为生成目录，不提交。
- 导航、页尾、回到顶部和复制引用统一由共享组件提供，不在项目内复制。
- 正文保留一个 `{{citation}}` 插槽；章节 `id` 与 `page.json` 的 `sections` 一致，按 `research`、`evaluation`、`resources` 分组。
- 项目简介明确研究对象，如 LLMs 或 LVLMs；页面短描述与元信息保持一致。

## 新增项目

```sh
npm run new:project -- my-project "My Project" context
```

分类可选 `adaptivity`、`context`、`compression`。命令创建 `projects/<slug>/` 并自动登记到项目清单，无需再更新 README、其他项目页面或发布工作流。

随后填写正文、引用和页面元信息，并在清单中完善简介、logo 与 `route`（`02` 或 `03`）。

## 主页中英文

内容修改遵循[内容与中英文写作规范](docs/design-system/content.md)：提炼讨论中的意图，保留必要逻辑，两种语言各自自然成文，不机械压缩或逐句翻译。

主页共用 `app/[[...lang]]/page.tsx` 和 `hub/ScalingPaths.tsx`，静态导出英文 `/` 与中文 `/zh/`。页脚始终提供「中文 / English」普通链接，刷新、直接访问和 GitHub Pages 均可用；研究项目页保持英文。

默认入口保持英文，不自动跳转。`hub/LanguagePreference.tsx` 根据浏览器语言偏好，在英文首页为偏好中文的访客显示一次可关闭的提示；访客切换或选择 Keep English 后，将选择存于本地（`thinking-yard-home-language`），不再提示。禁用本地存储或 JavaScript 时，页脚链接仍可使用。检测逻辑独立在 `hub/language-preference.mjs`，与项目清单无关。

- 主页文案（包括画布标注、无障碍说明）：`hub/locales/en.json`、`zh.json`，保持键名和章节 `id` 一致。
- 新增项目仍只登记 `config/projects.json`。英文简介放在 `description`，中文放在可选的 `translations.zh.description`；缺少中文时自动使用英文。两种语言共用项目名称、logo、分类、路由和排序。
- 分类和主页目录的翻译分别随条目维护在 `config/categories.json`、`config/site.json` 的 `translations.zh` 中。
- `hub/i18n.mjs` 统一处理语言选择、英文回退和主页路径；共享导航与页脚的默认文案保持英文。

## 检查与发布

构建前先停止开发服务，避免同时写入生成目录。

```sh
npm run check                         # 类型、回归测试、资源与链接检查
GITHUB_PAGES=true npm run build        # 按线上路径构建到 out/
GITHUB_PAGES=true npm run preview      # 预览生产构建
```

预览地址：<http://127.0.0.1:3002/thinking_yard_project_page/>。修改界面后检查桌面、手机和相关交互。

推送到 `main` 后，GitHub Actions 自动检查、构建并发布；PR 只检查和构建。路径由 `config/site.json` 决定，本地默认无前缀，也可通过 `SITE_ORIGIN`、`SITE_BASE_PATH` 覆盖。
