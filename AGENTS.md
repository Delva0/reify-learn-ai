# Reify Learn AI

This is the independent learning blog. Its articles, resources, source evidence, topic-specific components, writing rules, and deployment configuration belong here.

- Read `.agents/skills/website-mdx/SKILL.md` before editing articles.
- Use `../reify` for shared rendering and UI; read its UI skill before changing framework components.
- `reify.config.json` declares content, repository metadata, component registration, client scripts, and formula aliases.
- Keep domain demonstrations in `src/`, source evidence in `data/`, and downloadable resources in `public/`.
- Local dependency: `reify: file:../reify`. Do not copy its renderer into this project.
- Build with `node ../reify/cli.mjs build`, verify with `node ../reify/cli.mjs check`, and preview with `node ../reify/cli.mjs dev --port 4179`.
- The former `../sites/ge-backend-explorer` checkout is a migration backup. Preserve it until the user asks to remove it.
