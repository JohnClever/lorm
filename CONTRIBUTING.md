
# Contributing to Lorm 🛠️

Welcome! 👋 I'm excited that you're interested in contributing to **Lorm** — a zero-config, full-stack mobile framework for building high-performance, type-safe mobile applications.

Whether it's a bug report, feature request, or a pull request — all contributions are welcome and appreciated!

---

## 📌 Ground Rules

- Be respectful, open, and kind — we want to build a great community.
- No contribution is too small. Even typo fixes help.
- Use inclusive language and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## 🧑‍💻 How to Contribute

### 1. Issues

- Search existing issues before opening a new one.
- For bugs, provide:
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment info (OS, Node.js version, Lorm version)

Use labels if possible:
- `bug`, `feature`, `discussion`, `question`, `good first issue`

---

### 2. Pull Requests

#### ✅ Prerequisites:
- Fork the repo and clone your fork
- Create a new branch from `main`:  
  `git checkout -b fix/some-bug`  
- Install dependencies:  
  `npm install` or `pnpm install`
- Make your changes, write clear commits

#### 🚦 Guidelines:
- Keep pull requests focused and small
- Include tests if applicable
- Run `pnpm build`, `pnpm lint`, and `pnpm test` before submitting
- Test CLI changes with `npx @lorm/cli` commands
- Describe what your PR does in the description
- Link to related issues
- Update documentation if you change CLI commands or behavior

---

## 🧪 Local Development

```bash
# clone and cd into the repo
git clone https://github.com/your-username/lorm.git
cd lorm

# install dependencies
pnpm install

# build all packages
pnpm build

# run tests
pnpm test

# test CLI locally (after building)
npx @lorm/cli --version
```

### Working with the CLI

The CLI package requires building before testing:

```bash
# navigate to CLI package
cd packages/@lorm/cli

# build the CLI
pnpm build

# test CLI commands
node bin/cli.js --help
node bin/cli.js --version

# or use npx after building
npx @lorm/cli help
```

### Development Workflow

1. **Make changes** to source files in `src/`
2. **Build the package** with `pnpm build`
3. **Test your changes** using `npx @lorm/cli <command>`
4. **Run integration tests** with `pnpm test`
5. **Validate with linting** using `pnpm lint`

---

## 📁 Project Structure (Monorepo)

```
packages/
  @lorm/
    cli/        → Lorm CLI tool
    core/       → Core framework logic
    client/     → Auto-typed http client
    lib/        → Shared utility folder
    schema/     → Database schema definitions
    www/       → Documentation site
  examples/   → Sample apps using Lorm
```

---

## 🧙‍♂️ Join the Mission

Lorm is built in the open to empower mobile-first developers with better tools and DX. If you believe in that vision, contribute however you can — even feedback is gold ✨

---

## 💬 Need Help?

- Open a discussion on [GitHub Discussions](https://github.com/JohnClever/lorm/discussions)
- Join our Discord Community [@Lorm](https://discord.gg/T3pUn5NvnV)
- Reach out on X [@jc_johnclever](https://x.com/jc_johnclever)

---

Made with ❤️ by [@johnclever](https://xorla.me)
