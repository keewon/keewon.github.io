# CG HW3 in the browser

The 2004 SDL 1.2 + OpenGL version of this assignment (`../src/*.cpp`), ported to
WebGL. The C++ sources are untouched; everything here is new.

## Running it

Open `web/index.html` in a browser. Both textures are inlined as data URIs, so
it also works straight off the file system (`file://`) - WebGL refuses to upload
textures loaded from `file://` as separate image files, which is why they are
embedded. If your browser is locked down against local files:

    cd web && python3 -m http.server 8000     # then http://localhost:8000/

`web/hw3-standalone.html` is the same program bundled into one file - no `js/`
directory needed. Regenerate it with `python3 tools/build_single.py` after
editing anything under `web/js/`.

## What maps to what

| original            | port                  |
| ------------------- | --------------------- |
| `main.cpp`          | `js/main.js`          |
| `light.cpp`         | `js/light.js`         |
| `part.cpp`          | `js/part.js`          |
| `part_factory.cpp`  | `js/part_factory.js`  |
| `robot.cpp`         | `js/robot.js`         |
| `draw_manager.cpp`  | `js/draw_manager.js`  |
| `collision_manager.cpp` | `js/collision_manager.js` |
| `linear_algebra.cpp`| `js/linear_algebra.js`|
| `menu.cpp`          | `js/menu.js`          |
| `tga.cpp`, `error.cpp` | gone - see below   |
| -                   | `js/gl_compat.js`     |
| -                   | `js/assets.js`        |

`gl_compat.js` is the only real piece of new engineering: WebGL has no fixed
function pipeline, so it reimplements the parts this program uses - the matrix
stack, immediate mode (`glBegin`/`glVertex3f`/...), `GL_LIGHTING` with four
lights (directional, positional, spot, attenuation), `GL_COLOR_MATERIAL` and a
`GL_MODULATE` texture unit. That keeps the geometry, lighting and robot code a
near line-by-line transcription of the C++.

`tga.cpp` and the BMP loading in `menu.cpp` are replaced by
`tools/make_assets.py`, which converts `yuria.tga` and `menu.bmp` (with its
magenta colour key turned into alpha, as `SDL_SetColorKey` did) into the data
URIs in `js/assets.js`. `error.cpp`'s log file becomes the browser console.

## Deliberate differences

* **The face texture now shows.** `draw_manager.cpp` had its
  `glBindTexture(GL_TEXTURE_2D, g_TexturesArray[0])` commented out, so the head
  was drawn with texturing enabled but nothing bound - the photo never appeared,
  even though `HW3_20042081.txt` lists it as done. The port binds it for the
  front face of the head only (the other five faces have no texture
  coordinates).
* **Lighting is per fragment, not per vertex.** Same equation, evaluated in the
  fragment shader, so the spot lights have smooth edges instead of following the
  floor's tessellation.
* **The menu is drawn with textured quads.** `SDL_OPENGLBLIT`, which the
  original used to blit `menu.bmp` over the GL scene, only ever existed in
  SDL 1.2. The sprite rectangles and all the button logic are unchanged.
* **Fixed 60 Hz simulation step.** The original slept to hit 60 fps; here
  `requestAnimationFrame` drives a fixed step, so the robot walks at the same
  speed on a 144 Hz display.
* **`glPolygonMode(GL_LINE)`** does not exist in WebGL - wireframe mode emits
  the polygon edges as lines instead.
* Extras that were not in the original: `p` pauses, on-screen buttons for
  touch/mouse, and a status line under the canvas.

Kept as they were, including the quirks noted in `HW3_20042081.txt`:

* Menu colour/angle values are still not pushed to GL ("control colors : not
  implemented"), so the menu only switches lights on and off and selects which
  light the panel refers to.
* `e` toggles `GL_LIGHTING`, so the first press does nothing and the second one
  turns lighting off. (In `main.cpp` that case also fell through into `m` and
  toggled the menu; that fallthrough is not reproduced.)
* Robot 2 wanders around, permanently drunk, and the two lanterns blink when the
  player robot gets close to a wall or to it.

## Keys

Same as the original, plus `p`:

    up / f      walk forward          a    drunken mode
    down / b    walk backward         w    wireframe
    left / l    turn left             e    lighting on/off
    right / r   turn right            m    menu (click its buttons)
    s / d       zoom in / out         p    pause
    z / x       raise left/right arm  q, esc  quit
