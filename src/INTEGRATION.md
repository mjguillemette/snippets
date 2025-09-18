# Feature Branch Integration Plan

This document outlines the safe workflow for integrating the long-lived `feature` branch into `master`.

## Goals

* **Safety**: Never lose work, always keep backups.
* **Incremental Conflicts**: Resolve in small steps.
* **Clean History**: Split monolithic commits into atomic changes.
* **Reviewability**: Deliver as small sequential MRs.

## Workflow

### 1. Backups

```bash
git checkout feature
git checkout -b feature-backup
```

### 2. Update Master

```bash
git checkout master
git pull origin master
```

### 3. Split Commits (Feature Rewrite)

```bash
git checkout feature
git rebase -i master   # OR use `git reset --soft` + `git add -p` to split
# Create small, logical commits with clear messages
```

### 4. Create Integration Branch

```bash
git checkout -b feature-integration master
git merge --no-commit feature
# Resolve conflicts incrementally, commit in chunks
```

### 5. Stack Merge Requests

1. Push each chunk as a dedicated branch:

   ```bash
   git checkout -b feature-part1
   git push origin feature-part1
   ```
2. Open an MR into `master`.
3. For the next chunk: branch from the last part, push, and open MR into the previous one.

   * Use GitLab stacked MRs or Merge Trains for orderly review & merge.

---

✅ Result: Feature branch is safely merged into `master` via clean, reviewable steps.
