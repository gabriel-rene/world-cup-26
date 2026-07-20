import { VERT, FRAG } from "./shaders";
import { WAKE_SAMPLES } from "@/lib/wave-motion";

export interface WaveFrame {
  time: number;
  momentum: number;
  wake: Float32Array; // WAKE_SAMPLES values
  drift: number;
  goalProgress: number; // -1 when no active ripple
  goalSide: number; // +1 home, -1 away, 0 none
}

export interface WavesRenderer {
  render(frame: WaveFrame): void;
  dispose(): void;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("waves shader compile failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** Returns null when WebGL2 is unavailable or setup fails: callers fall back. */
export function createWavesRenderer(
  canvas: HTMLCanvasElement,
  homeColor: string,
  awayColor: string,
  seed: number,
): WavesRenderer | null {
  const gl = canvas.getContext("webgl2");
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("waves program link failed:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  // one clipping-space triangle that covers the viewport
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform3fv(u("uHomeColor"), hexToRgb(homeColor));
  gl.uniform3fv(u("uAwayColor"), hexToRgb(awayColor));
  gl.uniform1f(u("uSeed"), seed);
  const uTime = u("uTime");
  const uMomentum = u("uMomentum");
  const uWake = u("uWake");
  const uDrift = u("uDrift");
  const uGoalProgress = u("uGoalProgress");
  const uGoalSide = u("uGoalSide");

  return {
    render(f: WaveFrame) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, f.time);
      gl.uniform1f(uMomentum, f.momentum);
      gl.uniform1fv(uWake, f.wake.length === WAKE_SAMPLES ? f.wake : new Float32Array(WAKE_SAMPLES));
      gl.uniform1f(uDrift, f.drift);
      gl.uniform1f(uGoalProgress, f.goalProgress);
      gl.uniform1f(uGoalSide, f.goalSide);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    },
  };
}
