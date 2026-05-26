# LVLab Website Context

This repository hosts the Learning and Vision Laboratory static website. The root site presents the shared LV-Lab identity, `nus/` contains NUS-facing pages, and `SMU/` contains SMU-facing pages.

## Domain Language

- **Root site**: The shared public LV-Lab entrypoint at the repository root.
- **NUS site**: The NUS-facing static pages under `nus/`.
- **SMU site**: The SMU-facing static pages under `SMU/`.
- **People data**: JSON or HTML records used to render lab members.
- **Publication data**: JSON or HTML records used to render papers and project outputs.
- **Event data**: JSON or HTML records used to render news, talks, visits, and announcements.
- **Validation script**: The local site verifier at `scripts/validate-site.mjs`.

## Invariants

- Keep root, NUS, and SMU navigation consistent unless the task explicitly asks for divergent content.
- Static assets must keep relative paths correct for GitHub Pages hosting.
- Public content should remain safe to publish; do not add private contact details, credentials, or draft-only research material.
- Run the validation script after structural or data changes.
