/**
 * Jest setup: Mock HTMLCanvasElement.getContext for WebGL.
 * This must run before any Three.js tests in jsdom environment.
 *
 * NOTE: This file is registered in setupFiles and runs for ALL test suites.
 * Since main-process tests use 'node' environment (no DOM), we guard with
 * typeof check.
 */

if (typeof HTMLCanvasElement === 'undefined') {
  // Not a DOM environment (e.g. main process tests in node)
  module.exports = {};
} else {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type: string): any {
  if (type === '2d') {
    return originalGetContext.call(this, type);
  }
  return {
    getParameter: (p: number) => {
      const params: Record<number, unknown> = {
        7938: 'WebGL 2.0',                        // VERSION
        7937: 'WebGL Mock Renderer',              // RENDERER
        3379: 4096,                                // MAX_TEXTURE_SIZE
        34076: 4096,                               // MAX_CUBE_MAP_TEXTURE_SIZE
        34024: 4096,                               // MAX_RENDERBUFFER_SIZE
        34930: 16,                                 // MAX_TEXTURE_IMAGE_UNITS
        35661: 32,                                 // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        35660: 16,                                 // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        34921: 16,                                 // MAX_VERTEX_ATTRIBS
        36347: 256,                                // MAX_VERTEX_UNIFORM_VECTORS
        36349: 256,                                // MAX_FRAGMENT_UNIFORM_VECTORS
        36348: 16,                                 // MAX_VARYING_VECTORS
        3386: [4096, 4096],                        // MAX_VIEWPORT_DIMS
        33901: [1, 1024],                          // ALIASED_POINT_SIZE_RANGE
        33902: [1, 1],                             // ALIASED_LINE_WIDTH_RANGE
        34047: 16,                                 // MAX_TEXTURE_MAX_ANISOTROPY_EXT
        3410: 8, 3411: 8, 3412: 8, 3413: 8,       // RED/GREEN/BLUE/ALPHA_BITS
        3414: 24, 3415: 8,                         // DEPTH_BITS, STENCIL_BITS
        32937: 0,                                  // SAMPLES
        32936: 0,                                  // SAMPLE_BUFFERS
        36183: 4,                                  // MAX_SAMPLES
        36063: 4,                                  // MAX_COLOR_ATTACHMENTS
        34852: 4,                                  // MAX_DRAW_BUFFERS
        35723: 0x1100,                             // FRAGMENT_SHADER_DERIVATIVE_HINT
      };
      return params[p] ?? null;
    },
    getExtension: () => null,
    getShaderPrecisionFormat: () => ({ rangeMin: 1, rangeMax: 1, precision: 23 }),
    createShader: () => ({}) as WebGLShader,
    createProgram: () => ({}) as WebGLProgram,
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    attachShader: () => {},
    linkProgram: () => {},
    useProgram: () => {},
    uniform1i: () => {},
    uniform1f: () => {},
    uniform2fv: () => {},
    uniform3fv: () => {},
    uniform4fv: () => {},
    uniformMatrix4fv: () => {},
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
    clearColor: () => {},
    clear: () => {},
    viewport: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    bufferData: () => {},
    bufferSubData: () => {},
    createBuffer: () => ({}),
    createTexture: () => ({}),
    createFramebuffer: () => ({}),
    createRenderbuffer: () => ({}),
    bindBuffer: () => {},
    bindTexture: () => {},
    bindFramebuffer: () => {},
    bindRenderbuffer: () => {},
    framebufferTexture2D: () => {},
    renderbufferStorage: () => {},
    framebufferRenderbuffer: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    pixelStorei: () => {},
    readPixels: () => {},
    getError: () => 0,
    getSupportedExtensions: () => [],
    getContextAttributes: () => ({}),
    isContextLost: () => false,
    getUniformLocation: () => ({}),
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    drawBuffers: () => {},
    getFramebufferAttachmentParameter: () => {},
    activeTexture: () => {},
    uniformMatrix3fv: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    vertexAttrib2f: () => {},
    vertexAttrib3f: () => {},
    cullFace: () => {},
    frontFace: () => {},
    depthFunc: () => {},
    depthMask: () => {},
    depthRange: () => {},
    polygonOffset: () => {},
    blendEquation: () => {},
    blendFuncSeparate: () => {},
    blendColor: () => {},
    colorMask: () => {},
    lineWidth: () => {},
    stencilFunc: () => {},
    stencilMask: () => {},
    stencilOp: () => {},
    stencilFuncSeparate: () => {},
    stencilMaskSeparate: () => {},
    stencilOpSeparate: () => {},
    generateMipmap: () => {},
    deleteTexture: () => {},
    deleteFramebuffer: () => {},
    deleteRenderbuffer: () => {},
    deleteBuffer: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
    getFramebufferStatus: () => 0x8CD5,
    checkFramebufferStatus: () => 0x8CD5,
    scissor: () => {},
    hint: () => {},
    isEnabled: () => true,
    getBufferParameter: () => {},
    getTexParameter: () => {},
    getVertexAttrib: () => ({}),
    getVertexAttribOffset: () => 0,
    getActiveUniform: () => ({}),
    getActiveAttrib: () => ({}),
    getAttachedShaders: () => [],
    getUniform: () => ({}),
    vertexAttrib1f: () => {},
    vertexAttrib1fv: () => {},
    vertexAttrib2fv: () => {},
    vertexAttrib3fv: () => {},
    vertexAttrib4f: () => {},
    vertexAttrib4fv: () => {},
    uniform1fv: () => {},
    uniform1iv: () => {},
    uniform2iv: () => {},
    uniform2fv: () => {},
    uniform3iv: () => {},
    uniform3fv: () => {},
    uniform4iv: () => {},
    uniform4fv: () => {},
    uniformMatrix2fv: () => {},
    uniformMatrix3fv: () => {},
    uniformMatrix4fv: () => {},
    drawingBufferWidth: 1024,
    drawingBufferHeight: 768,
    drawingBufferColorSpace: 'srgb',
    canvas: document.createElement('canvas'),
  } as unknown as WebGLRenderingContext;
};
}
