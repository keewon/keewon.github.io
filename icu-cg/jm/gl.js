// gl.js - OpenGL 1.x 고정 파이프라인 흉내내기 (행렬 스택 + 셰이더 헬퍼)
// 원본 jm.cpp 가 쓰던 glPushMatrix/glTranslatef/gluLookAt/gluPerspective 대체

// 행렬은 OpenGL 과 동일하게 column-major 로 저장한다.
function matIdentity() {
	return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

function matMul(a, b) { // a * b
	const o = new Float32Array(16);
	for (let c = 0; c < 4; ++c) {
		for (let r = 0; r < 4; ++r) {
			o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
		}
	}
	return o;
}

function matMulVec(m, v) {
	return [
		m[0]*v[0] + m[4]*v[1] + m[8]*v[2] + m[12]*v[3],
		m[1]*v[0] + m[5]*v[1] + m[9]*v[2] + m[13]*v[3],
		m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
		m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3],
	];
}

function matUpper3(m) { // 법선 변환용 (회전 + 균등 스케일만 쓰므로 정규화하면 충분)
	return new Float32Array([m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]);
}

function matTranslate(x, y, z) {
	const m = matIdentity();
	m[12] = x; m[13] = y; m[14] = z;
	return m;
}

function matScale(x, y, z) {
	const m = matIdentity();
	m[0] = x; m[5] = y; m[10] = z;
	return m;
}

function matRotate(angleDeg, x, y, z) { // glRotatef
	const len = Math.hypot(x, y, z);
	if (len === 0) return matIdentity();
	x /= len; y /= len; z /= len;
	const a = angleDeg * Math.PI / 180.0;
	const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
	return new Float32Array([
		t*x*x + c,   t*x*y + s*z, t*x*z - s*y, 0,
		t*x*y - s*z, t*y*y + c,   t*y*z + s*x, 0,
		t*x*z + s*y, t*y*z - s*x, t*z*z + c,   0,
		0, 0, 0, 1,
	]);
}

function matPerspective(fovyDeg, aspect, zNear, zFar) { // gluPerspective
	const f = 1.0 / Math.tan(fovyDeg * Math.PI / 360.0);
	return new Float32Array([
		f/aspect, 0, 0, 0,
		0, f, 0, 0,
		0, 0, (zFar+zNear)/(zNear-zFar), -1,
		0, 0, (2*zFar*zNear)/(zNear-zFar), 0,
	]);
}

function matLookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz) { // gluLookAt
	let fx = cx-ex, fy = cy-ey, fz = cz-ez;
	let fl = Math.hypot(fx, fy, fz);
	fx /= fl; fy /= fl; fz /= fl;
	let ul = Math.hypot(ux, uy, uz);
	ux /= ul; uy /= ul; uz /= ul;
	// s = f x up
	let sx = fy*uz - fz*uy, sy = fz*ux - fx*uz, sz = fx*uy - fy*ux;
	const sl = Math.hypot(sx, sy, sz);
	sx /= sl; sy /= sl; sz /= sl;
	// u = s x f
	const nx = sy*fz - sz*fy, ny = sz*fx - sx*fz, nz = sx*fy - sy*fx;
	const m = new Float32Array([
		sx, nx, -fx, 0,
		sy, ny, -fy, 0,
		sz, nz, -fz, 0,
		0, 0, 0, 1,
	]);
	return matMul(m, matTranslate(-ex, -ey, -ez));
}

// glPushMatrix / glPopMatrix 와 같은 모델뷰 스택
class MatrixStack {
	constructor() { this.m = matIdentity(); this.stack = []; }
	loadIdentity() { this.m = matIdentity(); }
	load(m) { this.m = m; }
	push() { this.stack.push(this.m); }
	pop() { this.m = this.stack.pop(); }
	mult(x) { this.m = matMul(this.m, x); }
	translate(x, y, z) { this.mult(matTranslate(x, y, z)); }
	rotate(a, x, y, z) { this.mult(matRotate(a, x, y, z)); }
	scale(x, y, z) { this.mult(matScale(x, y, z)); }
	get top() { return this.m; }
}

function compileShader(gl, type, src) {
	const sh = gl.createShader(type);
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		throw new Error('shader compile: ' + gl.getShaderInfoLog(sh));
	}
	return sh;
}

function createProgram(gl, vsSrc, fsSrc) {
	const p = gl.createProgram();
	gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vsSrc));
	gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fsSrc));
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
		throw new Error('program link: ' + gl.getProgramInfoLog(p));
	}
	return p;
}

// MSVC 의 rand() 를 그대로 옮긴 것. Floor() 의 난수 법선을 원본과 같게 만든다.
class MsvcRand {
	constructor(seed) { this.seed = seed >>> 0; }
	srand(seed) { this.seed = seed >>> 0; }
	rand() {
		this.seed = (Math.imul(this.seed, 214013) + 2531011) >>> 0;
		return (this.seed >>> 16) & 0x7fff;
	}
}
const RAND_MAX = 32767;

// ---------------------------------------------------------------------------
// Renderer : glColor/glNormal/glTexCoord/glBindTexture 상태와 고정 파이프라인
// 조명 계산(정점 단위 Gouraud)을 셰이더로 흉내낸다.
// ---------------------------------------------------------------------------

const VS_SRC = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
attribute vec4 aColor;

uniform mat4 uMV;
uniform mat4 uProj;
uniform mat3 uNormalMat;

uniform vec4 uLightPos[4];
uniform vec3 uSpotDir[4];
uniform float uSpotExp[4];
uniform float uSpotCut[4];
uniform vec4 uLightAmb[4];
uniform vec4 uLightDiff[4];
uniform vec4 uLightSpec[4];

uniform vec4 uModelAmb;
uniform vec4 uMatSpec;
uniform vec4 uMatEmission;
uniform float uShininess;

varying vec4 vColor;
varying vec2 vTexCoord;

void main()
{
	vec4 eyePos = uMV * vec4(aPos, 1.0);
	gl_Position = uProj * eyePos;
	vTexCoord = aTexCoord;

	vec3 P = eyePos.xyz;
	vec3 N = normalize(uNormalMat * aNormal);   // GL_NORMALIZE
	vec3 eyeDir = normalize(-P);                // GL_LIGHT_MODEL_LOCAL_VIEWER

	// GL_COLOR_MATERIAL(GL_AMBIENT_AND_DIFFUSE) 이므로 glColor 가 ambient/diffuse
	vec4 matAmbDiff = aColor;
	vec4 c = uMatEmission + uModelAmb * matAmbDiff;

	for (int i = 0; i < 4; ++i)
	{
		vec3 L;
		float spot = 1.0;

		if (uLightPos[i].w == 0.0)
		{
			L = normalize(uLightPos[i].xyz);    // 방향광은 스포트 감쇠 없음
		}
		else
		{
			L = normalize(uLightPos[i].xyz - P);
			if (uSpotCut[i] < 180.0)
			{
				float sc = dot(-L, normalize(uSpotDir[i]));
				if (sc < cos(radians(uSpotCut[i])))
					spot = 0.0;
				else
					spot = pow(max(sc, 0.0001), uSpotExp[i]);
			}
		}

		vec4 contrib = uLightAmb[i] * matAmbDiff;

		float ndl = dot(N, L);
		if (ndl > 0.0)
		{
			contrib += ndl * uLightDiff[i] * matAmbDiff;
			vec3 H = normalize(L + eyeDir);
			float ndh = max(dot(N, H), 0.0);
			if (ndh > 0.0)
				contrib += pow(ndh, uShininess) * uLightSpec[i] * uMatSpec;
		}

		// 감쇠 계수는 (1, 0, 0) 이라 항상 1.0
		c += spot * contrib;
	}

	c.a = matAmbDiff.a;
	vColor = clamp(c, 0.0, 1.0);
}
`;

const FS_SRC = `
precision mediump float;
varying vec4 vColor;
varying vec2 vTexCoord;
uniform sampler2D uTex;
void main()
{
	gl_FragColor = vColor * texture2D(uTex, vTexCoord);  // GL_MODULATE
}
`;

const A_POS = 0, A_NORMAL = 1, A_TEXCOORD = 2, A_COLOR = 3;

class Renderer {
	constructor(gl) {
		this.gl = gl;
		const p = gl.createProgram();
		gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, VS_SRC));
		gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, FS_SRC));
		gl.bindAttribLocation(p, A_POS, 'aPos');
		gl.bindAttribLocation(p, A_NORMAL, 'aNormal');
		gl.bindAttribLocation(p, A_TEXCOORD, 'aTexCoord');
		gl.bindAttribLocation(p, A_COLOR, 'aColor');
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS))
			throw new Error('program link: ' + gl.getProgramInfoLog(p));
		gl.useProgram(p);
		this.prog = p;

		this.u = {};
		const names = ['uMV','uProj','uNormalMat','uModelAmb','uMatSpec','uMatEmission',
			'uShininess','uTex'];
		for (const n of names) this.u[n] = gl.getUniformLocation(p, n);
		for (const n of ['uLightPos','uSpotDir','uSpotExp','uSpotCut','uLightAmb','uLightDiff','uLightSpec'])
			this.u[n] = gl.getUniformLocation(p, n + '[0]');
		gl.uniform1i(this.u.uTex, 0);

		this.mv = new MatrixStack();
		this.proj = matIdentity();
		this.mvDirty = true;
	}

	setProjection(m) {
		this.proj = m;
		this.gl.uniformMatrix4fv(this.u.uProj, false, m);
	}

	// glColor3f / glNormal3f / glTexCoord2f 대응 (버퍼가 없을 때 쓰이는 상수 어트리뷰트)
	color(r, g, b, a = 1.0) { this.gl.vertexAttrib4f(A_COLOR, r, g, b, a); }
	normal(x, y, z) { this.gl.vertexAttrib3f(A_NORMAL, x, y, z); }
	texCoord(s, t) { this.gl.vertexAttrib2f(A_TEXCOORD, s, t); }
	bindTexture(tex) { this.gl.bindTexture(this.gl.TEXTURE_2D, tex); }

	setLights(lightEye, spots) {
		const gl = this.gl;
		const pos = new Float32Array(16), dir = new Float32Array(12);
		const exp = new Float32Array(4), cut = new Float32Array(4);
		const amb = new Float32Array(16), diff = new Float32Array(16), spec = new Float32Array(16);
		for (let i = 0; i < 4; ++i) {
			pos.set(lightEye[i].pos, i*4);
			dir.set(lightEye[i].dir, i*3);
			// 꺼진 광원은 기여를 0 으로
			const on = spots[i].on;
			exp[i] = spots[i].spotExp;
			cut[i] = spots[i].spotCutoff;
			amb.set(on ? spots[i].amb : [0,0,0,1], i*4);
			diff.set(on ? spots[i].diff : [0,0,0,1], i*4);
			spec.set(on ? spots[i].spec : [0,0,0,1], i*4);
		}
		gl.uniform4fv(this.u.uLightPos, pos);
		gl.uniform3fv(this.u.uSpotDir, dir);
		gl.uniform1fv(this.u.uSpotExp, exp);
		gl.uniform1fv(this.u.uSpotCut, cut);
		gl.uniform4fv(this.u.uLightAmb, amb);
		gl.uniform4fv(this.u.uLightDiff, diff);
		gl.uniform4fv(this.u.uLightSpec, spec);
	}

	setMaterial(modelAmb, spec, emission, shininess) {
		const gl = this.gl;
		gl.uniform4fv(this.u.uModelAmb, new Float32Array(modelAmb));
		gl.uniform4fv(this.u.uMatSpec, new Float32Array(spec));
		gl.uniform4fv(this.u.uMatEmission, new Float32Array(emission));
		gl.uniform1f(this.u.uShininess, shininess);
	}

	applyMatrix() {
		const gl = this.gl;
		gl.uniformMatrix4fv(this.u.uMV, false, this.mv.top);
		gl.uniformMatrix3fv(this.u.uNormalMat, false, matUpper3(this.mv.top));
	}

	// mesh: { pos, normal, tex, color, index } (없는 것은 상수 어트리뷰트 사용)
	draw(mesh, mode, first, count) {
		const gl = this.gl;
		this.applyMatrix();

		const bind = (buf, loc, size) => {
			if (buf) {
				gl.enableVertexAttribArray(loc);
				gl.bindBuffer(gl.ARRAY_BUFFER, buf);
				gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
			} else {
				gl.disableVertexAttribArray(loc);
			}
		};
		bind(mesh.pos, A_POS, 3);
		bind(mesh.normal, A_NORMAL, 3);
		bind(mesh.tex, A_TEXCOORD, 2);
		bind(mesh.color, A_COLOR, 4);

		if (mesh.index) {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
			gl.drawElements(mode, count, gl.UNSIGNED_SHORT, first * 2);
		} else {
			gl.drawArrays(mode, first, count);
		}
	}
}
