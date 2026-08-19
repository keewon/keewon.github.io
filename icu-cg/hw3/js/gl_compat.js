// gl_compat.js
//
// A small OpenGL 1.1 fixed-function emulation on top of WebGL, just big enough
// for this program: matrix stack, immediate mode (glBegin/glVertex/...),
// GL_LIGHTING with 4 lights (positional/directional, spot, attenuation),
// GL_COLOR_MATERIAL and a single 2D texture unit in GL_MODULATE mode.
//
// The point is that draw_manager.js / part.js / light.js can stay a near
// line-by-line transcription of the original C++.
//
// Difference worth knowing about: the original pipeline lit per vertex
// (Gouraud). Here the same equation runs per fragment, so the spot lights have
// smooth edges instead of following the floor tessellation.

var GLC = (function () {
	'use strict';

	var MAX_LIGHTS = 4;
	var FLOATS_PER_VERTEX = 12; // pos3 + normal3 + color4 + uv2

	var gl = null;
	var canvas = null;
	var prog = null;
	var loc = {};      // uniform locations
	var vbo = null;
	var vboBytes = 0;

	// ---- matrix helpers ------------------------------------------------

	function mat4Identity(m) {
		m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
		m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
		m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
		m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
		return m;
	}

	// out = a * b, column major like OpenGL
	function mat4Mul(out, a, b) {
		var t = mat4Mul.tmp;
		for (var c = 0; c < 4; ++c) {
			for (var r = 0; r < 4; ++r) {
				t[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
					a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
			}
		}
		for (var i = 0; i < 16; ++i) out[i] = t[i];
		return out;
	}
	mat4Mul.tmp = new Float32Array(16);

	// v' = m * v, with v = (x, y, z, w)
	function mat4MulVec4(out, m, x, y, z, w) {
		out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
		out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
		out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
		out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
		return out;
	}

	// direction transformed by the upper-left 3x3, which is what OpenGL does
	// to GL_SPOT_DIRECTION when glLightfv is called.
	function mat3MulVec3(out, m, x, y, z) {
		out[0] = m[0] * x + m[4] * y + m[8] * z;
		out[1] = m[1] * x + m[5] * y + m[9] * z;
		out[2] = m[2] * x + m[6] * y + m[10] * z;
		return out;
	}

	// inverse transpose of the upper-left 3x3, for normals
	function normalMatrix(out, m) {
		var a00 = m[0], a01 = m[1], a02 = m[2];
		var a10 = m[4], a11 = m[5], a12 = m[6];
		var a20 = m[8], a21 = m[9], a22 = m[10];

		var b01 = a22 * a11 - a12 * a21;
		var b11 = -a22 * a10 + a12 * a20;
		var b21 = a21 * a10 - a11 * a20;

		var det = a00 * b01 + a01 * b11 + a02 * b21;
		if (!det) { // singular: fall back to the plain 3x3
			out[0] = a00; out[1] = a01; out[2] = a02;
			out[3] = a10; out[4] = a11; out[5] = a12;
			out[6] = a20; out[7] = a21; out[8] = a22;
			return out;
		}
		det = 1.0 / det;

		out[0] = b01 * det;
		out[1] = (-a22 * a01 + a02 * a21) * det;
		out[2] = (a12 * a01 - a02 * a11) * det;
		out[3] = b11 * det;
		out[4] = (a22 * a00 - a02 * a20) * det;
		out[5] = (-a12 * a00 + a02 * a10) * det;
		out[6] = b21 * det;
		out[7] = (-a21 * a00 + a01 * a20) * det;
		out[8] = (a11 * a00 - a01 * a10) * det;
		return out;
	}

	// ---- state ---------------------------------------------------------

	var MODELVIEW = 0, PROJECTION = 1;
	var matrixMode = MODELVIEW;
	var stacks = [[], []];                        // saved matrices per mode
	var matrices = [new Float32Array(16), new Float32Array(16)];
	mat4Identity(matrices[0]);
	mat4Identity(matrices[1]);

	var state = {
		lighting: false,
		texture2d: false,
		depthTest: false,
		blend: false,
		cullFace: false,
		normalize: false,
		colorMaterial: false,
		wireframe: false,
		boundTexture: null,
		lightModelAmbient: new Float32Array([0.2, 0.2, 0.2, 1.0]),
		matAmbient: new Float32Array([0.2, 0.2, 0.2, 1.0]),
		matDiffuse: new Float32Array([0.8, 0.8, 0.8, 1.0]),
		matSpecular: new Float32Array([0, 0, 0, 1]),
		matEmission: new Float32Array([0, 0, 0, 1]),
		matShininess: 0.0
	};

	function makeLight(index) {
		return {
			enabled: false,
			ambient: new Float32Array([0, 0, 0, 1]),
			diffuse: new Float32Array(index === 0 ? [1, 1, 1, 1] : [0, 0, 0, 1]),
			specular: new Float32Array(index === 0 ? [1, 1, 1, 1] : [0, 0, 0, 1]),
			// position and spot direction are kept in eye space, exactly like
			// OpenGL stores them: they are transformed by the modelview matrix
			// that was current when glLightfv() was called.
			position: new Float32Array([0, 0, 1, 0]),
			spotDirection: new Float32Array([0, 0, -1]),
			spotExponent: 0.0,
			spotCutoff: 180.0,
			atten: new Float32Array([1, 0, 0])
		};
	}

	var lights = [];
	for (var li = 0; li < MAX_LIGHTS; ++li) lights.push(makeLight(li));

	// current immediate-mode vertex attributes
	var curColor = new Float32Array([1, 1, 1, 1]);
	var curNormal = new Float32Array([0, 0, 1]);
	var curTexCoord = new Float32Array([0, 0]);

	var primMode = -1;
	var verts = [];              // flat array of FLOATS_PER_VERTEX-sized vertices
	var scratch = new Float32Array(4);

	// GL primitive constants used by the ported code
	var GL_TRIANGLES = 0x0004;
	var GL_QUADS = 0x0007;
	var GL_QUAD_STRIP = 0x0008;
	var GL_LINES = 0x0001;
	var GL_LINE_LOOP = 0x0002;
	var GL_TRIANGLE_FAN = 0x0006;

	// ---- shaders -------------------------------------------------------

	var VERT_SRC = [
		'attribute vec3 aPos;',
		'attribute vec3 aNormal;',
		'attribute vec4 aColor;',
		'attribute vec2 aTexCoord;',
		'uniform mat4 uModelView;',
		'uniform mat4 uProjection;',
		'uniform mat3 uNormalMatrix;',
		'varying vec3 vEyePos;',
		'varying vec3 vNormal;',
		'varying vec4 vColor;',
		'varying vec2 vTexCoord;',
		'void main() {',
		'  vec4 eye = uModelView * vec4(aPos, 1.0);',
		'  vEyePos = eye.xyz;',
		'  vNormal = uNormalMatrix * aNormal;',
		'  vColor = aColor;',
		'  vTexCoord = aTexCoord;',
		'  gl_Position = uProjection * eye;',
		'}'
	].join('\n');

	var FRAG_SRC = [
		'precision mediump float;',
		'#define MAX_LIGHTS ' + MAX_LIGHTS,
		'varying vec3 vEyePos;',
		'varying vec3 vNormal;',
		'varying vec4 vColor;',
		'varying vec2 vTexCoord;',
		'uniform bool uLightingEnabled;',
		'uniform bool uTextureEnabled;',
		'uniform sampler2D uSampler;',
		'uniform vec4 uLightModelAmbient;',
		'uniform vec4 uMatAmbient;',
		'uniform vec4 uMatDiffuse;',
		'uniform vec4 uMatSpecular;',
		'uniform vec4 uMatEmission;',
		'uniform float uMatShininess;',
		'uniform bool uColorMaterial;',
		'uniform bool uLightEnabled[MAX_LIGHTS];',
		'uniform vec4 uLightAmbient[MAX_LIGHTS];',
		'uniform vec4 uLightDiffuse[MAX_LIGHTS];',
		'uniform vec4 uLightSpecular[MAX_LIGHTS];',
		'uniform vec4 uLightPosition[MAX_LIGHTS];',
		'uniform vec3 uLightSpotDir[MAX_LIGHTS];',
		'uniform float uLightSpotExp[MAX_LIGHTS];',
		'uniform float uLightSpotCutoff[MAX_LIGHTS];',
		'uniform vec3 uLightAtten[MAX_LIGHTS];',
		'',
		'void main() {',
		'  vec4 texel = uTextureEnabled ? texture2D(uSampler, vTexCoord) : vec4(1.0);',
		'  if (!uLightingEnabled) {',
		'    gl_FragColor = vColor * texel;',
		'    return;',
		'  }',
		'',
		// GL_COLOR_MATERIAL with GL_AMBIENT_AND_DIFFUSE: the vertex colour
		// replaces both the ambient and the diffuse material reflectance.
		'  vec4 matAmb = uColorMaterial ? vColor : uMatAmbient;',
		'  vec4 matDiff = uColorMaterial ? vColor : uMatDiffuse;',
		'',
		'  vec3 n = normalize(vNormal);',
		// GL_LIGHT_MODEL_LOCAL_VIEWER is GL_TRUE in this program
		'  vec3 v = normalize(-vEyePos);',
		'  vec3 color = uMatEmission.rgb + uLightModelAmbient.rgb * matAmb.rgb;',
		'',
		'  for (int i = 0; i < MAX_LIGHTS; ++i) {',
		'    if (!uLightEnabled[i]) continue;',
		'    vec3 L;',
		'    float atten = 1.0;',
		'    float spot = 1.0;',
		'    if (uLightPosition[i].w == 0.0) {',
		// directional: no attenuation and no spot, per the GL spec
		'      L = normalize(uLightPosition[i].xyz);',
		'    } else {',
		'      vec3 toLight = uLightPosition[i].xyz - vEyePos;',
		'      float d = length(toLight);',
		'      L = toLight / max(d, 0.0001);',
		'      vec3 k = uLightAtten[i];',
		'      atten = 1.0 / max(k.x + k.y * d + k.z * d * d, 0.0001);',
		'      if (uLightSpotCutoff[i] < 180.0) {',
		'        float cosA = dot(-L, normalize(uLightSpotDir[i]));',
		'        if (cosA < cos(radians(uLightSpotCutoff[i]))) spot = 0.0;',
		'        else spot = pow(max(cosA, 0.0), uLightSpotExp[i]);',
		'      }',
		'    }',
		'    float att = atten * spot;',
		'    if (att <= 0.0) continue;',
		'',
		'    vec3 contrib = uLightAmbient[i].rgb * matAmb.rgb;',
		'    float nl = dot(n, L);',
		'    if (nl > 0.0) {',
		'      contrib += nl * uLightDiffuse[i].rgb * matDiff.rgb;',
		'      vec3 h = normalize(L + v);',
		'      float sp = pow(max(dot(n, h), 0.0), max(uMatShininess, 0.001));',
		'      contrib += sp * uLightSpecular[i].rgb * uMatSpecular.rgb;',
		'    }',
		'    color += att * contrib;',
		'  }',
		'',
		'  gl_FragColor = vec4(clamp(color, 0.0, 1.0), matDiff.a) * texel;',
		'}'
	].join('\n');

	function compile(type, src) {
		var s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			throw new Error('shader compile failed: ' + gl.getShaderInfoLog(s));
		}
		return s;
	}

	function buildProgram() {
		var p = gl.createProgram();
		gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT_SRC));
		gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
		gl.bindAttribLocation(p, 0, 'aPos');
		gl.bindAttribLocation(p, 1, 'aNormal');
		gl.bindAttribLocation(p, 2, 'aColor');
		gl.bindAttribLocation(p, 3, 'aTexCoord');
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			throw new Error('program link failed: ' + gl.getProgramInfoLog(p));
		}
		return p;
	}

	function cacheUniforms() {
		var names = ['uModelView', 'uProjection', 'uNormalMatrix', 'uLightingEnabled',
			'uTextureEnabled', 'uSampler', 'uLightModelAmbient', 'uMatAmbient',
			'uMatDiffuse', 'uMatSpecular', 'uMatEmission', 'uMatShininess',
			'uColorMaterial'];
		for (var i = 0; i < names.length; ++i) {
			loc[names[i]] = gl.getUniformLocation(prog, names[i]);
		}
		var arrays = ['uLightEnabled', 'uLightAmbient', 'uLightDiffuse', 'uLightSpecular',
			'uLightPosition', 'uLightSpotDir', 'uLightSpotExp', 'uLightSpotCutoff',
			'uLightAtten'];
		for (var a = 0; a < arrays.length; ++a) {
			loc[arrays[a]] = [];
			for (var k = 0; k < MAX_LIGHTS; ++k) {
				loc[arrays[a]].push(gl.getUniformLocation(prog, arrays[a] + '[' + k + ']'));
			}
		}
	}

	// ---- public API ----------------------------------------------------

	var api = {};

	api.GL_TRIANGLES = GL_TRIANGLES;
	api.GL_QUADS = GL_QUADS;
	api.GL_QUAD_STRIP = GL_QUAD_STRIP;
	api.GL_LINES = GL_LINES;
	api.GL_LINE_LOOP = GL_LINE_LOOP;
	api.GL_TRIANGLE_FAN = GL_TRIANGLE_FAN;

	api.init = function (c) {
		canvas = c;
		var opts = { alpha: false, depth: true, antialias: true, preserveDrawingBuffer: false };
		gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
		if (!gl) return null;

		prog = buildProgram();
		gl.useProgram(prog);
		cacheUniforms();

		vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);
		gl.enableVertexAttribArray(3);
		var stride = FLOATS_PER_VERTEX * 4;
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 24);
		gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 40);

		gl.uniform1i(loc.uSampler, 0);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		return gl;
	};

	api.raw = function () { return gl; };

	// -- capabilities

	api.enable = function (cap) { setCap(cap, true); };
	api.disable = function (cap) { setCap(cap, false); };

	function setCap(cap, on) {
		switch (cap) {
			case 'lighting': state.lighting = on; break;
			case 'texture2d': state.texture2d = on; break;
			case 'normalize': state.normalize = on; break;
			case 'colorMaterial': state.colorMaterial = on; break;
			case 'depthTest':
				state.depthTest = on;
				if (on) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
				break;
			case 'blend':
				state.blend = on;
				if (on) gl.enable(gl.BLEND); else gl.disable(gl.BLEND);
				break;
			case 'cullFace':
				state.cullFace = on;
				if (on) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
				break;
			default:
				if (cap >= 0 && cap < MAX_LIGHTS) lights[cap].enabled = on; // GL_LIGHTi
				break;
		}
	}

	api.enableLight = function (i) { if (i >= 0 && i < MAX_LIGHTS) lights[i].enabled = true; };
	api.disableLight = function (i) { if (i >= 0 && i < MAX_LIGHTS) lights[i].enabled = false; };
	api.isLightEnabled = function (i) { return i >= 0 && i < MAX_LIGHTS && lights[i].enabled; };

	api.setWireframe = function (on) { state.wireframe = !!on; };

	api.clearColor = function (r, g, b, a) { gl.clearColor(r, g, b, a); };
	api.clear = function () { gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); };
	api.viewport = function (x, y, w, h) { gl.viewport(x, y, w, h); };
	api.depthMask = function (on) { gl.depthMask(!!on); };

	// -- matrix stack

	api.matrixMode = function (mode) { matrixMode = mode; };
	api.MODELVIEW = MODELVIEW;
	api.PROJECTION = PROJECTION;

	api.loadIdentity = function () { mat4Identity(matrices[matrixMode]); };

	api.pushMatrix = function () {
		stacks[matrixMode].push(new Float32Array(matrices[matrixMode]));
	};

	api.popMatrix = function () {
		var m = stacks[matrixMode].pop();
		if (m) matrices[matrixMode].set(m);
	};

	api.multMatrix = function (m) { mat4Mul(matrices[matrixMode], matrices[matrixMode], m); };

	var tmpM = new Float32Array(16);

	api.translatef = function (x, y, z) {
		mat4Identity(tmpM);
		tmpM[12] = x; tmpM[13] = y; tmpM[14] = z;
		mat4Mul(matrices[matrixMode], matrices[matrixMode], tmpM);
	};

	api.scalef = function (x, y, z) {
		mat4Identity(tmpM);
		tmpM[0] = x; tmpM[5] = y; tmpM[10] = z;
		mat4Mul(matrices[matrixMode], matrices[matrixMode], tmpM);
	};

	api.rotatef = function (angleDeg, x, y, z) {
		var len = Math.sqrt(x * x + y * y + z * z);
		if (len < 1e-8) return; // glRotatef with a zero axis is a no-op
		x /= len; y /= len; z /= len;
		var a = angleDeg * Math.PI / 180.0;
		var c = Math.cos(a), s = Math.sin(a), t = 1 - c;

		mat4Identity(tmpM);
		tmpM[0] = t * x * x + c;
		tmpM[1] = t * x * y + s * z;
		tmpM[2] = t * x * z - s * y;
		tmpM[4] = t * x * y - s * z;
		tmpM[5] = t * y * y + c;
		tmpM[6] = t * y * z + s * x;
		tmpM[8] = t * x * z + s * y;
		tmpM[9] = t * y * z - s * x;
		tmpM[10] = t * z * z + c;
		mat4Mul(matrices[matrixMode], matrices[matrixMode], tmpM);
	};

	api.perspective = function (fovy, aspect, zNear, zFar) { // gluPerspective
		var f = 1.0 / Math.tan(fovy * Math.PI / 360.0);
		var m = tmpM;
		mat4Identity(m);
		m[0] = f / aspect;
		m[5] = f;
		m[10] = (zFar + zNear) / (zNear - zFar);
		m[11] = -1;
		m[14] = (2 * zFar * zNear) / (zNear - zFar);
		m[15] = 0;
		mat4Mul(matrices[matrixMode], matrices[matrixMode], m);
	};

	api.ortho = function (left, right, bottom, top, zNear, zFar) {
		var m = tmpM;
		mat4Identity(m);
		m[0] = 2 / (right - left);
		m[5] = 2 / (top - bottom);
		m[10] = -2 / (zFar - zNear);
		m[12] = -(right + left) / (right - left);
		m[13] = -(top + bottom) / (top - bottom);
		m[14] = -(zFar + zNear) / (zFar - zNear);
		mat4Mul(matrices[matrixMode], matrices[matrixMode], m);
	};

	api.lookAt = function (ex, ey, ez, cx, cy, cz, ux, uy, uz) { // gluLookAt
		var fx = cx - ex, fy = cy - ey, fz = cz - ez;
		var rl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
		fx /= rl; fy /= rl; fz /= rl;

		var sx = fy * uz - fz * uy;
		var sy = fz * ux - fx * uz;
		var sz = fx * uy - fy * ux;
		var sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
		sx /= sl; sy /= sl; sz /= sl;

		var tx = sy * fz - sz * fy;
		var ty = sz * fx - sx * fz;
		var tz = sx * fy - sy * fx;

		var m = tmpM;
		mat4Identity(m);
		m[0] = sx; m[4] = sy; m[8] = sz;
		m[1] = tx; m[5] = ty; m[9] = tz;
		m[2] = -fx; m[6] = -fy; m[10] = -fz;
		mat4Mul(matrices[matrixMode], matrices[matrixMode], m);
		api.translatef(-ex, -ey, -ez);
	};

	// -- lights and materials

	api.lightModelAmbient = function (v) { state.lightModelAmbient.set(v); };

	api.materialAmbient = function (v) { state.matAmbient.set(v); };
	api.materialDiffuse = function (v) { state.matDiffuse.set(v); };
	api.materialSpecular = function (v) { state.matSpecular.set(v); };
	api.materialEmission = function (v) { state.matEmission.set(v); };
	api.materialShininess = function (s) { state.matShininess = s; };

	api.lightAmbient = function (i, v) { lights[i].ambient.set(v); };
	api.lightDiffuse = function (i, v) { lights[i].diffuse.set(v); };
	api.lightSpecular = function (i, v) { lights[i].specular.set(v); };
	api.lightSpotExponent = function (i, v) { lights[i].spotExponent = v; };
	api.lightSpotCutoff = function (i, v) { lights[i].spotCutoff = v; };
	api.lightAttenuation = function (i, c, l, q) {
		lights[i].atten[0] = c; lights[i].atten[1] = l; lights[i].atten[2] = q;
	};

	// glLightfv(.., GL_POSITION, ..): the position is transformed by the
	// modelview matrix in effect right now and kept in eye coordinates.
	api.lightPosition = function (i, p) {
		mat4MulVec4(scratch, matrices[MODELVIEW], p[0], p[1], p[2], p[3]);
		lights[i].position[0] = scratch[0];
		lights[i].position[1] = scratch[1];
		lights[i].position[2] = scratch[2];
		lights[i].position[3] = p[3];
	};

	// glLightfv(.., GL_SPOT_DIRECTION, ..): transformed by the upper-left 3x3.
	api.lightSpotDirection = function (i, d) {
		mat3MulVec3(scratch, matrices[MODELVIEW], d[0], d[1], d[2]);
		lights[i].spotDirection[0] = scratch[0];
		lights[i].spotDirection[1] = scratch[1];
		lights[i].spotDirection[2] = scratch[2];
	};

	// -- textures

	// flipY defaults to true: TGA/BMP rows run bottom-to-top, which is also how
	// OpenGL reads texture data, while HTML images are top-down. The menu sheet
	// passes false so its sprite rectangles can stay in top-down pixel coords.
	api.createTexture = function (image, mipmap, wrapClamp, flipY) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY === undefined ? true : !!flipY);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

		var clamp = wrapClamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clamp);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, clamp);
		if (mipmap) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return tex;
	};

	api.bindTexture = function (tex) { state.boundTexture = tex || null; };

	// -- immediate mode

	api.color3f = function (r, g, b) {
		curColor[0] = r; curColor[1] = g; curColor[2] = b; curColor[3] = 1.0;
	};
	api.color4f = function (r, g, b, a) {
		curColor[0] = r; curColor[1] = g; curColor[2] = b; curColor[3] = a;
	};
	api.color4fv = function (v) { curColor.set(v); };

	api.normal3f = function (x, y, z) {
		curNormal[0] = x; curNormal[1] = y; curNormal[2] = z;
	};

	api.texCoord2f = function (s, t) { curTexCoord[0] = s; curTexCoord[1] = t; };

	api.begin = function (mode) {
		primMode = mode;
		verts.length = 0;
	};

	api.vertex3f = function (x, y, z) {
		verts.push(x, y, z,
			curNormal[0], curNormal[1], curNormal[2],
			curColor[0], curColor[1], curColor[2], curColor[3],
			curTexCoord[0], curTexCoord[1]);
	};

	api.vertex3fv = function (p) { api.vertex3f(p[0], p[1], p[2]); };

	function pushVertex(out, src, i) {
		var o = i * FLOATS_PER_VERTEX;
		for (var k = 0; k < FLOATS_PER_VERTEX; ++k) out.push(src[o + k]);
	}

	// Turn the immediate-mode primitive into a triangle or line list, which is
	// all WebGL understands. Wireframe mode (glPolygonMode GL_LINE) is emulated
	// by emitting the polygon edges instead of its triangles.
	var assembled = [];

	function assemble() {
		var n = verts.length / FLOATS_PER_VERTEX;
		assembled.length = 0;
		var i, wire = state.wireframe;

		function tri(a, b, c) {
			if (wire) {
				pushVertex(assembled, verts, a); pushVertex(assembled, verts, b);
				pushVertex(assembled, verts, b); pushVertex(assembled, verts, c);
				pushVertex(assembled, verts, c); pushVertex(assembled, verts, a);
			} else {
				pushVertex(assembled, verts, a);
				pushVertex(assembled, verts, b);
				pushVertex(assembled, verts, c);
			}
		}

		switch (primMode) {
			case GL_TRIANGLES:
				for (i = 0; i + 2 < n; i += 3) tri(i, i + 1, i + 2);
				return wire ? gl.LINES : gl.TRIANGLES;

			case GL_QUADS:
				for (i = 0; i + 3 < n; i += 4) {
					if (wire) {
						// the four edges, not the diagonal
						pushVertex(assembled, verts, i); pushVertex(assembled, verts, i + 1);
						pushVertex(assembled, verts, i + 1); pushVertex(assembled, verts, i + 2);
						pushVertex(assembled, verts, i + 2); pushVertex(assembled, verts, i + 3);
						pushVertex(assembled, verts, i + 3); pushVertex(assembled, verts, i);
					} else {
						tri(i, i + 1, i + 2);
						tri(i, i + 2, i + 3);
					}
				}
				return wire ? gl.LINES : gl.TRIANGLES;

			case GL_QUAD_STRIP:
				for (i = 0; i + 3 < n; i += 2) {
					if (wire) {
						pushVertex(assembled, verts, i); pushVertex(assembled, verts, i + 1);
						pushVertex(assembled, verts, i + 1); pushVertex(assembled, verts, i + 3);
						pushVertex(assembled, verts, i + 3); pushVertex(assembled, verts, i + 2);
						pushVertex(assembled, verts, i + 2); pushVertex(assembled, verts, i);
					} else {
						// quad is (i, i+1, i+3, i+2)
						tri(i, i + 1, i + 3);
						tri(i, i + 3, i + 2);
					}
				}
				return wire ? gl.LINES : gl.TRIANGLES;

			case GL_TRIANGLE_FAN:
				for (i = 1; i + 1 < n; ++i) tri(0, i, i + 1);
				return wire ? gl.LINES : gl.TRIANGLES;

			case GL_LINE_LOOP:
				for (i = 0; i < n; ++i) {
					pushVertex(assembled, verts, i);
					pushVertex(assembled, verts, (i + 1) % n);
				}
				return gl.LINES;

			case GL_LINES:
			default:
				for (i = 0; i < n; ++i) pushVertex(assembled, verts, i);
				return gl.LINES;
		}
	}

	var uploadBuf = new Float32Array(0);

	function upload(data) {
		if (uploadBuf.length < data.length) {
			uploadBuf = new Float32Array(Math.max(data.length, uploadBuf.length * 2, 4096));
		}
		uploadBuf.set(data);
		var view = uploadBuf.subarray(0, data.length);
		var bytes = view.byteLength;
		if (bytes > vboBytes) {
			gl.bufferData(gl.ARRAY_BUFFER, uploadBuf, gl.DYNAMIC_DRAW);
			vboBytes = uploadBuf.byteLength;
		} else {
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
		}
		return view.length / FLOATS_PER_VERTEX;
	}

	function applyUniforms(useTexture) {
		gl.uniformMatrix4fv(loc.uModelView, false, matrices[MODELVIEW]);
		gl.uniformMatrix4fv(loc.uProjection, false, matrices[PROJECTION]);
		normalMatrix(applyUniforms.nm, matrices[MODELVIEW]);
		gl.uniformMatrix3fv(loc.uNormalMatrix, false, applyUniforms.nm);

		gl.uniform1i(loc.uLightingEnabled, state.lighting ? 1 : 0);
		gl.uniform1i(loc.uTextureEnabled, useTexture ? 1 : 0);
		gl.uniform1i(loc.uColorMaterial, state.colorMaterial ? 1 : 0);
		gl.uniform4fv(loc.uLightModelAmbient, state.lightModelAmbient);
		gl.uniform4fv(loc.uMatAmbient, state.matAmbient);
		gl.uniform4fv(loc.uMatDiffuse, state.matDiffuse);
		gl.uniform4fv(loc.uMatSpecular, state.matSpecular);
		gl.uniform4fv(loc.uMatEmission, state.matEmission);
		gl.uniform1f(loc.uMatShininess, state.matShininess);

		for (var i = 0; i < MAX_LIGHTS; ++i) {
			var L = lights[i];
			gl.uniform1i(loc.uLightEnabled[i], L.enabled ? 1 : 0);
			if (!L.enabled) continue;
			gl.uniform4fv(loc.uLightAmbient[i], L.ambient);
			gl.uniform4fv(loc.uLightDiffuse[i], L.diffuse);
			gl.uniform4fv(loc.uLightSpecular[i], L.specular);
			gl.uniform4fv(loc.uLightPosition[i], L.position);
			gl.uniform3fv(loc.uLightSpotDir[i], L.spotDirection);
			gl.uniform1f(loc.uLightSpotExp[i], L.spotExponent);
			gl.uniform1f(loc.uLightSpotCutoff[i], L.spotCutoff);
			gl.uniform3fv(loc.uLightAtten[i], L.atten);
		}
	}
	applyUniforms.nm = new Float32Array(9);

	api.end = function () {
		if (verts.length === 0) { primMode = -1; return; }

		var drawMode = assemble();
		var count = upload(assembled);
		var useTexture = state.texture2d && state.boundTexture;

		if (useTexture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, state.boundTexture);
		}
		applyUniforms(useTexture);
		gl.drawArrays(drawMode, 0, count);

		verts.length = 0;
		primMode = -1;
	};

	return api;
})();
