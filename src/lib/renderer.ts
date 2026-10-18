import type { WebGLRenderer } from "three";

/**
 * three checks every shader it compiles by reading back the compile and link logs, which makes the page
 * wait for the GPU to finish compiling: a stall of tens of milliseconds per program, the first time each
 * one draws (the cursor trail's first move, a section's first frame). The shaders here are fixed and tested
 * in development, so the production build skips the check and lets the GPU compile in the background.
 */
export function quiet<R extends WebGLRenderer>(renderer: R) {
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
  return renderer;
}
