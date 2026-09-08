# @toijs skills

Agent skills for the Lamtoi modular runtime. Source of truth is the package source, not NestJS / typical TypeORM tutorials.

| Skill | Use when |
|-------|----------|
| [toijs-modular](./toijs-modular/SKILL.md) | Launcher, modules, DI, task, config, metadata, shell |
| [toijs-typeorm](./toijs-typeorm/SKILL.md) | TypeORMModule, ConnectionManager, entities, repos, migrations, seeds |

Package source:
- `@toijs/modular/src/`
- `@toijs/typeorm/src/`

Cursor auto-discovers these via symlinks in `.cursor/skills/` (same names). Do not duplicate the files there.
