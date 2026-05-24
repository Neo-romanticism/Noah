# Asset Pipeline: Room Mesh Replacement Strategy

> **Scope**: Procedural Three.js geometry → Designer-made Blender meshes  
> **Status**: Prepared (Stage 4 code is forward-compatible)  
> **Owner**: Orchestrator / Technical Artist

---

## 1. Current State (Stage 4)

Noah's room is built entirely from **procedural Three.js geometry**:

```
src/renderer/room/
├── floor.ts    → PlaneGeometry(6, 4)
├── walls.ts    → 6× PlaneGeometry (back hole + left + right)
├── bed.ts      → 5× BoxGeometry
├── desk.ts     → 9× BoxGeometry + PlaneGeometry
├── window.ts   → 7× BoxGeometry
└── index.ts    → buildRoom() assembles everything
```

### Why Procedural First?

- Zero external asset dependencies (build always passes)
- Immediate iteration speed (change a number, see result)
- Programmatic material assignment (weather-reactive window, monitor glow)
- No licensing or version-control bloat from binary meshes

### The Transition Point

Stage 14 ("Content Population and Asset Integration") is the **official** slot for replacing procedural meshes with production art. However, the orchestrator must prepare the **abstraction layer now** so that the swap is a one-line change later.

---

## 2. Target State (Production)

A designer delivers:

```
assets/rooms/
├── default_room.glb      # Entire room (bed, desk, walls, floor, window)
├── default_room.fbx      # Alternative format if GLB has issues
└── room_manifest.json    # Metadata: node names, material slots, collider bounds
```

The game loads **one file** instead of generating 30+ meshes at runtime.

---

## 3. Abstraction Layer Design

### 3.1 Keep `RoomObjects` Interface Stable

The contract between the renderer and the room must not change:

```typescript
// src/renderer/room/index.ts
export interface RoomObjects {
  bed: THREE.Group;
  desk: THREE.Group;
  floor: THREE.Mesh;
  walls: THREE.Group;
  window: THREE.Group;
  windowLight: THREE.Mesh; // sky plane for weather
}
```

Whether the `bed` is 5 `BoxGeometry` meshes or a single imported GLB node, `renderer/index.ts` does not care.

### 3.2 Factory Pattern

Introduce a factory that selects the implementation:

```typescript
// src/renderer/room/factory.ts
export type RoomBuildMode = 'procedural' | 'external-glb' | 'external-fbx';

export async function buildRoom(
  ctx: SceneContext,
  mode: RoomBuildMode = 'procedural'
): Promise<RoomObjects> {
  switch (mode) {
    case 'procedural':
      return buildRoomProcedural(ctx);
    case 'external-glb':
      return buildRoomFromGLB(ctx, './assets/rooms/default_room.glb');
    case 'external-fbx':
      return buildRoomFromFBX(ctx, './assets/rooms/default_room.fbx');
  }
}
```

**Stage 4 default**: `mode = 'procedural'`  
**Stage 14 toggle**: Change one line in `renderer/index.ts`:

```typescript
const room = await buildRoom(ctx, 'external-glb'); // or from config/env
```

---

## 4. GLB/GLTF Pipeline (Recommended)

### Why GLB over FBX for Rooms?

| Factor | GLB | FBX |
|--------|-----|-----|
| File size | Smaller (binary JSON) | Larger (ASCII/Binary) |
| Three.js loader | `GLTFLoader` (builtin, maintained) | `FBXLoader` (examples/jsm, heavier) |
| Material support | PBR out-of-the-box | Requires re-mapping |
| Blender export | Native, one-click | Requires specific settings |
| Draco compression | Supported | Not supported |
| Runtime parse speed | Faster | Slower |

**Decision**: Use **GLB** for static environment meshes. Reserve FBX for animated avatars (where skeleton data is critical).

### 4.1 Blender Export Settings (Designer Checklist)

In Blender 4.x:

1. **File → Export → glTF 2.0 (.glb/.gltf)**
2. **Format**: `glTF Separate (.gltf + .bin + textures)` or `glTF Binary (.glb)`
   - Use `.glb` for single-file simplicity.
3. **Include**:
   - ✅ Modifiers (apply bevels/subdiv)
   - ✅ Custom Properties (for node metadata)
4. **Transform**:
   - ☐ +Y Up (checked — matches Three.js)
5. **Geometry**:
   - ✅ Apply Modifiers
   - ✅ UVs
6. **Materials**:
   - Use Principled BSDF → exports as `metallicRoughness` PBR
   - Name each material clearly: `MAT_Wall`, `MAT_Floor_Wood`, `MAT_Bed_Frame`
7. **Object Naming** (critical for code lookup):
   - `BED` → bed group root
   - `DESK` → desk group root
   - `WINDOW_FRAME` → window frame mesh
   - `WINDOW_SKY` → sky plane (or we inject it in code)
   - `FLOOR` → floor mesh

### 4.2 Runtime Loading Code

```typescript
// src/renderer/room/glb-loader.ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function buildRoomFromGLB(
  ctx: SceneContext,
  path: string
): Promise<RoomObjects> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(path);
  const scene = gltf.scene;

  // Enable shadows on everything
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  ctx.scene.add(scene);

  // Extract named nodes
  const bed = scene.getObjectByName('BED') as THREE.Group;
  const desk = scene.getObjectByName('DESK') as THREE.Group;
  const floor = scene.getObjectByName('FLOOR') as THREE.Mesh;
  const walls = scene.getObjectByName('WALLS') as THREE.Group;
  const window = scene.getObjectByName('WINDOW') as THREE.Group;

  // Inject dynamic sky plane (weather-reactive)
  const skyGeo = new THREE.PlaneGeometry(1.6, 1.2);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
  const windowLight = new THREE.Mesh(skyGeo, skyMat);
  windowLight.position.set(0, 0, -0.06);
  window.add(windowLight);

  return { bed, desk, floor, walls, window, windowLight };
}
```

### 4.3 Fallback Strategy

If `default_room.glb` fails to load:

```typescript
try {
  return await buildRoomFromGLB(ctx, path);
} catch (err) {
  console.warn('GLB room load failed, falling back to procedural:', err);
  return buildRoomProcedural(ctx);
}
```

This mirrors the avatar placeholder pattern already in Stage 4.

---

## 5. Material Override System

### Problem

Designers bake materials in Blender, but some colors must change at runtime:

- `windowLight` → weather color (sunny/cloudy/rainy/stormy)
- `MONITOR_GLOW` → could flicker based on system load
- `LAMP` → time-of-day brightness

### Solution: Named Material Slots

In Blender, assign **placeholder materials** with descriptive names:

| Blender Material | Runtime Purpose | Override? |
|------------------|-----------------|-----------|
| `MAT_Window_Sky` | Sky behind window | ✅ Yes — weather color |
| `MAT_Monitor_Glow` | Screen emission | ✅ Yes — system pulse |
| `MAT_Wall` | Wall paint | ❌ No — static |
| `MAT_Floor_Wood` | Floor texture | ❌ No — static |

Runtime override:

```typescript
const skyMesh = scene.getObjectByName('WINDOW_SKY') as THREE.Mesh;
if (skyMesh) {
  // Replace designer material with dynamic basic material
  skyMesh.material = new THREE.MeshBasicMaterial({ color: currentWeatherColor });
}
```

### Material Manifest JSON

For complex rooms, ship a manifest:

```json
// assets/rooms/room_manifest.json
{
  "format": "glb",
  "file": "default_room.glb",
  "dynamic_nodes": {
    "WINDOW_SKY": { "type": "MeshBasicMaterial", "override": "weather" },
    "MONITOR_GLOW": { "type": "MeshBasicMaterial", "override": "system_pulse" }
  },
  "colliders": {
    "FLOOR": { "type": "plane", "y": -0.5 },
    "BED": { "type": "box", "bounds": [...] }
  }
}
```

---

## 6. Physics / Collision Considerations

### Current (Stage 4)

Physics is visual-only. Drag/throw are not implemented yet.

### Future (Stage 7+)

When click/drag/throw interactions arrive, the game needs **collision bounds**.

| Approach | Pros | Cons |
|----------|------|------|
| Reuse visual mesh as collider | Exact match | High poly count = slow physics |
| Simplified invisible colliders | Fast | Extra setup |
| Blender-defined collision meshes | Designer controls accuracy | Requires naming convention |

**Recommendation**: In Blender, create a `_COLLIDER` suffix collection:

- `BED_COLLIDER` → simple box
- `FLOOR_COLLIDER` → plane

At load time, hide visual collider meshes (`visible = false`) and feed their geometry to the physics engine (Cannon.js or Ammo.js).

---

## 7. Multi-Room Support (Stage 11+)

GDD specifies rooms unlocked by level:

| Room | Level | File |
|------|-------|------|
| Default | 0 | `default_room.glb` |
| Garden | 20 | `garden_room.glb` |
| Gaming | 35 | `gaming_room.glb` |
| Minimal | 50 | `minimal_room.glb` |

With the factory pattern, switching rooms is:

```typescript
async function switchRoom(roomId: string): Promise<void> {
  // 1. Unload current room
  currentRoom.bed.traverse((c) => { if (c.isMesh) { c.geometry.dispose(); (c.material as THREE.Material).dispose(); }});
  ctx.scene.remove(currentRoom.bed.parent!);

  // 2. Load new room
  const newRoom = await buildRoomFromGLB(ctx, `./assets/rooms/${roomId}_room.glb`);
  currentRoom = newRoom;
}
```

**Memory note**: Always dispose geometries/materials when unloading to prevent VRAM leaks.

---

## 8. Workflow Summary

```
Designer (Blender)                          Developer (Code)
     │                                            │
     ▼                                            ▼
┌─────────────┐                           ┌──────────────┐
│ Model room  │                           │ Procedural   │
│ Name nodes  │                           │ fallback     │
│ Assign MAT_ │                           │ (Stage 4)    │
└──────┬──────┘                           └──────┬───────┘
       │                                          │
       ▼                                          ▼
┌─────────────┐                           ┌──────────────┐
│ Export .glb │ ────────────────────────► │ GLTFLoader   │
│ (+Y Up)     │                           │ buildRoom()  │
└──────┬──────┘                           └──────┬───────┘
       │                                          │
       ▼                                          ▼
┌─────────────┐                           ┌──────────────┐
│ Test in     │ ◄──────────────────────── │ Runtime      │
│ Three.js    │         iterate           │ feedback     │
└─────────────┘                           └──────────────┘
```

---

## 9. Action Items

| Priority | Task | Stage | Owner |
|----------|------|-------|-------|
| P1 | Implement `buildRoomFromGLB()` wrapper | 4→5 | Developer |
| P2 | Document Blender node naming convention | 4 | Technical Artist |
| P3 | Create `room_manifest.json` schema | 5 | Developer |
| P4 | Add `disposeRoom()` cleanup function | 5 | Developer |
| P5 | Export first designer room to GLB | 14 | Designer |
| P6 | Replace `buildRoomProcedural` default | 14 | Developer |

---

*Prepared by Orchestrator for Stage 4→14 transition planning.*
