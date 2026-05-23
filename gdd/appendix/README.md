# Appendix

> References, asset lists, external tools, and miscellany.

## Asset Sources

| Asset | Source | License | Notes |
|-------|--------|---------|-------|
| Noah FBX | _(TBD)_ | _(TBD)_ | Base avatar (FBX format) |
| Animations | Mixamo / Custom | _(TBD)_ | FBX format, no conversion needed |
| Room models | _(TBD)_ | _(TBD)_ | Low-poly preferred |

## External Tools

| Tool | Purpose |
|------|---------|
| Blender | VRM editing, animation conversion |
| Unity (optional) | VRM setup, testing |
| VRoid Studio | Base avatar creation |

## References

- [three.js FBXLoader example](https://threejs.org/examples/webgl_loader_fbx.html)
- [mixamo.com](https://www.mixamo.com/) — Free FBX animations
- [Electron Documentation](https://www.electronjs.org/docs)

## Naming Conventions

### Files
- `lowercase-with-hyphens.ts`
- Assets: `{type}-{name}.{ext}` (e.g., `anim-idle.fbx`)

### Code
- Classes: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase` with `I` prefix optional

---

*Keep track of where things come from. Future-you will thank present-you.*
