# Compositor Pass: Light-Wrap + Occlusion (performance-budgeted)

Adds the genuinely ZD-grade compositing pieces — **light-wrap** (the keyed source
picks up the real rendered backdrop at its edges) and **occlusion** (set geometry
hides the source) — while protecting frame rate.

## How it works
- **Backdrop render target** (`StudioEngine.updateBackdropRtt`): renders the
  scene **minus the Program plane** to a **half-resolution** `RenderTargetTexture`
  once per frame, via `scene.customRenderTargets` (runs before the main pass).
  The plane is hidden during this pass (`onBeforeRender`/`onAfterRender`).
- **Screen-space sampling** (media shader): the vertex shader outputs the
  fragment's screen position (`vScreen`); the fragment samples the backdrop at
  that position → exactly what's behind the plane.
- **Light-wrap**: at translucent subject edges (`1 - alpha`), the kept colour is
  blended toward the sampled backdrop, so the source integrates into the set.
- **Occlusion**: the Program plane is a real depth-tested scene mesh, so opaque
  set geometry in front of it (pillars, floor ring, desk) occludes it via the
  depth buffer — no extra work.
- **Screen-insert fit**: a `screenInsert` source now fits the **target screen's
  real size** (aspect-preserved) instead of a fixed size — a real product
  improvement and what makes the wall-filling occlusion demo possible.

## Performance budget (kept smooth)
- The backdrop RTT is **created only when light-wrap > 0** and disposed when it
  returns to 0 → **zero extra render cost by default**. It's **half-resolution**
  when active.
- Measured FPS (CI software-WebGL): light-wrap **off 10 → on 10**, occlusion
  frame 11 — no regression from the extra pass (`compositor.txt`).
- Shader light-wrap sample is gated behind `if (lightWrap > 0.001)`.

## Evidence
| File | Proves |
|------|--------|
| `00-backdrop-sample-debug.png` | **Compositor verification** (one-off debug output): the plate shows the scene *behind* it (desk + desk-screen + floor), correctly aligned with the surrounding scene → the backdrop RTT renders scene-minus-plane and the screen-space UV is correct. Debug line was reverted after capture. |
| `01-lightwrap-off.png` / `02-lightwrap-on.png` | Keyed source renders cleanly with light-wrap off and on; FPS held. |
| `03-occlusion-screeninsert-ledwall.png` | `screenInsert` video fills the LED wall and is **occluded by the pillars + floor-ring arc** (opaque geometry in front) via the depth buffer — real occlusion. |
| `compositor.txt` | FPS off/on/occlusion + clean console. |

## Gates
`tsc -b` ✅ · `vite build` ✅ · `node tests/anti-demo-smoke.mjs` ✅ · leak scan
clean (RTT removed from customRenderTargets + disposed on clear/dispose; dummy bg
texture disposed; no CHASE-DIAG/setInterval left).

## Still ahead (toward full ZD parity)
- Garbage/holdout masks; camera tracking; lighting/colour match.
- Higher-quality light-wrap (blurred backdrop sample for a softer wrap) — a small
  extra blur pass, to be budgeted.
</content>
