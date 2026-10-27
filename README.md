# Reify Learn AI

独立的学习博客。文章、资源、源码依据、专用演示与写作规范保存在这里，使用本地框架依赖 `reify: file:../reify`。

```text
workspace/
├── reify/              框架
└── reify-learn-ai/     本博客
```

```sh
node ../reify/cli.mjs dev --port 4179
node ../reify/cli.mjs build
node ../reify/cli.mjs check
```

使用 Node.js 24 或更新版本，先在框架与博客分别执行 `npm ci`，再使用 `npm run dev/build/check`。`npm run typecheck` 检查博客组件、客户端与资料工具的严格类型。Windows 从 WSL 路径运行时，CLI 管理本机执行缓存；文章的真实位置仍在此目录。

```sh
git clone https://github.com/Delva0/reify.git
git clone https://github.com/Delva0/reify-learn-ai.git
cd reify-learn-ai
npm ci
npm run dev
```

- `content/`：文章 MDX 与仓库版本清单。
- `data/`：文章使用的源码依据和文件职责数据。
- `public/`：图片、附件、源码快照、目录索引与文章字体。
- `src/`：本博客专用的 MDX 组件、数学演示和客户端入口。
- `reify.config.json`：博客身份、内容入口、组件与数学别名。
- `.agents/skills/website-mdx/`：本博客的写作规范。

客户端、内容入口和资料工具的实现使用 TypeScript。`prepare-source.mjs`、`prepare-ge-facts.mjs` 和 `scripts/prepare-trees.mjs` 保留为兼容入口，从同级源码克隆生成资料；普通构建使用已准备的资料，不要求读者重新克隆全部依赖。`prepare-fonts.mjs` 更新本博客的中文字体子集。`check.mjs` 验证构建结果，设置 `REIFY_CHECK_DIST` 可检查另一个输出目录。

`.openai/` 保留本地部署身份并排除在 Git 外。`dist/` 是构建产物。系统组件、UI 规则与通用测试由 `../reify` 维护。
