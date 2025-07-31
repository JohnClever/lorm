# Lorm Scripts

This directory contains utility scripts for maintaining the Lorm codebase.

## cleanup-code.ts

A comprehensive code cleanup tool that removes comments and unused imports from TypeScript files.

### Features

- **Comment Removal**: Removes all types of comments including:
  - Single-line comments (`//`)
  - Multi-line comments (`/* */`)
  - JSDoc comments (`/** */`)
  - Inline comments

- **Unused Import Removal**: Identifies and removes:
  - Completely unused imports
  - Unused identifiers from import statements
  - Rebuilds import statements with only used identifiers

- **Statistics**: Provides detailed cleanup statistics including:
  - Files processed
  - Comments removed
  - Unused imports removed
  - Bytes reduced

### Usage

#### Via npm scripts (recommended):

```bash
# Clean all packages
pnpm cleanup:code

# Clean specific packages
pnpm cleanup:cli     # Clean @lorm/cli package
pnpm cleanup:core    # Clean @lorm/core package
pnpm cleanup:client  # Clean @lorm/client package
pnpm cleanup:schema  # Clean @lorm/schema package
```

#### Direct usage:

```bash
# Clean current directory's src folder
tsx scripts/cleanup-code.ts

# Clean specific directory
tsx scripts/cleanup-code.ts /path/to/project src

# Clean multiple subdirectories
tsx scripts/cleanup-code.ts /path/to/project src lib utils
```

### Parameters

1. **Root Directory** (optional): The base directory to start from. Defaults to current working directory.
2. **Target Directories** (optional): Subdirectories to process. Defaults to `['src']`.

### Example Output

```
🧹 Starting codebase cleanup...
🎯 Target directory: /Users/user/project
📁 Processing subdirectories: src
✅ Cleaned: /Users/user/project/src/index.ts
   📝 Removed 5 comments
   📦 Removed 2 unused imports
✅ Cleaned: /Users/user/project/src/utils/helper.ts
   📝 Removed 3 comments

📊 Cleanup Statistics:
   Files processed: 15
   Comments removed: 47
   Unused imports removed: 8
   Bytes reduced: 2,341

✨ Cleanup completed!
```

### Safety Features

- Only processes TypeScript files (`.ts`, `.tsx`)
- Skips hidden directories and `node_modules`
- Preserves code functionality while removing clutter
- Provides detailed logging of all changes

### When to Use

- Before major releases to clean up the codebase
- After refactoring sessions that may leave unused imports
- When preparing code for production
- As part of automated CI/CD cleanup processes

## clean.ts

Existing script for cleaning build artifacts and temporary files.

### Usage

```bash
pnpm clean
```