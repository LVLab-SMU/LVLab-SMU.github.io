# Independently maintained project pages

## Decision

The UMI-WM project website is maintained in the public repository `LV-Robotics-Lab/umi-wm-project-page`. This website includes it as a Git submodule at `umi-wm/`, using its HTTPS repository URL. GitHub Pages pulls public submodules during its build, so the canonical address is `https://www.lv-lab.org/umi-wm/`. No iframe, redirect, domain reassignment, or duplicate asset copy is required.

## Updates

The submodule is pinned to a reviewed project commit. After publishing a new project revision, fetch and update this pointer, validate the site, and commit the pointer update here. A project-only push updates its GitHub Pages mirror but does not change the pinned lab-site version.

For local previews, initialize with `git submodule update --init umi-wm`. The project uses relative asset URLs to support both hosting paths. The lab CNAME and existing pages remain unchanged.
