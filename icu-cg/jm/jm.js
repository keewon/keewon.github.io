// jm.js - jm.cpp 이식. GLUT/OpenGL -> WebGL
const KEY_ESC = 27;
const DICE_X = 0.0, DICE_Y = 1.0, DICE_Z = 0.0;

const NUM_TEXTURES = 18;
const NUM_HEXAGONS = 2;
const ROOT_3 = 1.73;

// 전역 상태
let g_selected_hexagon = 0;                 // 0 : 아래, 1 : 위
let g_selected_face = [0, 0];
let g_spin = [0.0, 0.0];
let g_spincount = [0, 0];

let g_currentmusic = 0;
let g_tick = 0;
let g_zoomin_count = 0;

let g_eye_x = 1.0, g_eye_y = 3.3, g_eye_z = 22.1;
let g_center_x = 1.7, g_center_y = 0.7;

const texture = new Array(NUM_TEXTURES).fill(null);

const g_filenames = [
	'image/b_1.jpg', 'image/b_2.jpg', 'image/b_3.jpg',
	'image/b_4.jpg', 'image/b_5.jpg', 'image/b_6.jpg',

	'image/h_1.jpg', 'image/h_2.jpg', 'image/h_3.jpg',
	'image/h_4.jpg', 'image/h_5.jpg', 'image/h_6.jpg',

	'image/s_1.jpg', 'image/s_2.jpg', 'image/s_3.jpg',
	'image/s_4.jpg', 'image/s_5.jpg', 'image/s_6.jpg',
];

const g_musicfile = [   // 여섯 면마다 다른 곡
	'test1.mp3',
	'test2.mp3',
	'test1.mp3',
	'test2.mp3',
	'test1.mp3',
	'test2.mp3',
];

let gl = null;
let R = null;
let canvas = null;

let floorMesh = null;    // 101 개의 TRIANGLE_STRIP
let hexMesh = null;      // 6 면 x 4 정점
let triMesh = null;      // 선택 표시 삼각형

// ---------------------------------------------------------------------------
// 텍스처
// ---------------------------------------------------------------------------

function loadImage(url) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => { console.log("can't open " + url); resolve(null); };
		img.src = url;
	});
}

async function LoadGLTextures() {
	let status = false;
	const images = await Promise.all(g_filenames.map(loadImage));

	// BMP 는 아래 줄부터 저장돼 OpenGL 의 t 축과 방향이 같다.
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	for (let i = 0; i < NUM_TEXTURES; ++i) {
		if (images[i]) {
			status = true;
			texture[i] = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture[i]);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, images[i]);
			console.log('image ' + g_filenames[i] + ' loaded');
		} else {
			console.log('failed to load image ' + g_filenames[i]);
		}
	}
	return status;
}

// ---------------------------------------------------------------------------
// 도형
// ---------------------------------------------------------------------------

function makeBuffer(data) {
	const b = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, b);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
	return b;
}

// DrawSixFace 의 여섯 면
const FACES = [
	{ n: [0.0, 0.0, 1.0],           v: [[-1,-1,ROOT_3], [1,-1,ROOT_3], [1,1,ROOT_3], [-1,1,ROOT_3]] },
	{ n: [1.5, 0.0, ROOT_3/2],      v: [[1,-1,ROOT_3], [2,-1,0], [2,1,0], [1,1,ROOT_3]] },
	{ n: [1.5, 0.0, -ROOT_3/2],     v: [[2,-1,0], [1,-1,-ROOT_3], [1,1,-ROOT_3], [2,1,0]] },
	{ n: [0.0, 0.0, -1.0],          v: [[1,-1,-ROOT_3], [-1,-1,-ROOT_3], [-1,1,-ROOT_3], [1,1,-ROOT_3]] },
	{ n: [-1.5, 0.0, -ROOT_3/2],    v: [[-1,-1,-ROOT_3], [-2,-1,0], [-2,1,0], [-1,1,-ROOT_3]] },
	// 원본 그대로 (여섯번째 면의 법선 부호는 jm.cpp 와 동일하게 둔다)
	{ n: [1.5, 0.0, ROOT_3/2],      v: [[-2,-1,0], [-1,-1,ROOT_3], [-1,1,ROOT_3], [-2,1,0]] },
];
const FACE_TEX = [[0,0], [1,0], [1,1], [0,1]];

function InitHexagon() {
	const pos = [], nrm = [], tex = [];
	for (const f of FACES) {
		for (let k = 0; k < 4; ++k) {
			pos.push(f.v[k][0], f.v[k][1], f.v[k][2]);
			nrm.push(f.n[0], f.n[1], f.n[2]);
			tex.push(FACE_TEX[k][0], FACE_TEX[k][1]);
		}
	}
	hexMesh = {
		pos: makeBuffer(new Float32Array(pos)),
		normal: makeBuffer(new Float32Array(nrm)),
		tex: makeBuffer(new Float32Array(tex)),
	};
}

function DrawSixFace(texOffset) {
	for (let i = 0; i < 6; ++i) {
		R.bindTexture(texture[texOffset + i]);
		R.draw(hexMesh, gl.TRIANGLE_FAN, i * 4, 4);
	}
	// 원본의 glNormal/glTexCoord 상태는 마지막 면의 값으로 남아서
	// 뒤에 그리는 삼각형과 깃발에 그대로 쓰인다.
	R.normal(1.5, 0.0, ROOT_3/2);
	R.texCoord(0.0, 1.0);
}

function InitFloor() {
	// srand(0) 이후의 MSVC rand() 수열을 그대로 재현해 같은 법선을 만든다.
	const rng = new MsvcRand(0);
	const pos = [], nrm = [];
	for (let i = -50; i <= 50; ++i) {
		for (let j = -50; j <= 50; ++j) {
			let s = (rng.rand() % 2) ? -1.0 : 1.0;
			nrm.push(s * (rng.rand() / RAND_MAX), 1.0, 0.0);
			pos.push((i+1) * 0.2, 0.0, j * 0.2);

			s = (rng.rand() % 2) ? -1.0 : 1.0;
			nrm.push(s * (rng.rand() / RAND_MAX), 1.0, 0.0);
			pos.push(i * 0.2, 0.0, j * 0.2);
		}
	}
	floorMesh = {
		pos: makeBuffer(new Float32Array(pos)),
		normal: makeBuffer(new Float32Array(nrm)),
		stripVerts: 101 * 2,
		strips: 101,
	};
}

function Floor() {
	R.color(1.0, 1.0, 1.0);
	for (let i = 0; i < floorMesh.strips; ++i)
		R.draw(floorMesh, gl.TRIANGLE_STRIP, i * floorMesh.stripVerts, floorMesh.stripVerts);
}

function InitTriangle() {
	triMesh = {
		pos: makeBuffer(new Float32Array([
			0.0, 0.0, 0.0,
			1.0, 0.5, 0.0,
			1.0, -0.5, 0.0,
		])),
		color: makeBuffer(new Float32Array([
			1.0, 0.5, 0.5, 1.0,
			0.5, 1.0, 0.5, 1.0,
			0.5, 0.5, 1.0, 1.0,
		])),
	};
}

// ---------------------------------------------------------------------------
// 초기화 / 화면
// ---------------------------------------------------------------------------

async function InitOpenGL() {
	if (!await LoadGLTextures())
		return false;

	// glEnable(GL_TEXTURE_2D) 는 셰이더가 항상 텍스처를 곱하는 것으로 대신한다.
	gl.clearColor(0.0, 0.0, 0.0, 0.5);
	gl.clearDepth(1.0);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.DEPTH_TEST);

	InitLightsGL();
	return true;
}

function InitLightsGL() {
	R.setMaterial(modelAmb, matSpec, matEmission, matShininess);
	R.setLights(lightEye, spots);
}

function Reshape(width, height) {
	if (height === 0) height = 1;
	gl.viewport(0, 0, width, height);
	R.setProjection(matPerspective(22.5, width / height, 1.0, 800.0));
}

function Display() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	R.mv.loadIdentity();
	R.mv.load(matLookAt(
		g_eye_x, g_eye_y, g_eye_z,          // eye
		g_center_x, g_center_y, -3.0,       // center
		0.0, 1.0, 0.0));                    // up

	// SetSpecificLight(0);
	SetSpecificLight(1, R.mv.top);
	SetSpecificLight(2, R.mv.top);   // 빨강
	SetSpecificLight(3, R.mv.top);   // 초록
	R.setLights(lightEye, spots);

	R.mv.push();
	Floor();
	R.mv.pop();

	R.mv.push();
	R.mv.translate(DICE_X, DICE_Y, DICE_Z);

	// 육각기둥 2 개
	for (let i = 0; i < NUM_HEXAGONS; ++i) {
		R.mv.push();
			R.mv.translate(0.0, i * 1.0, 0.0);
			R.mv.rotate(g_spin[i], 0.0, 1.0, 0.0);
			R.mv.push();
				R.mv.scale(0.5, 0.5, 0.5);
				DrawSixFace(i * 6);
			R.mv.pop();
		R.mv.pop();
	}
	R.mv.pop();

	// 선택된 육각기둥을 가리키는 삼각형
	R.mv.push();
		R.mv.translate(1.1, 0.5 + 0.8 * (1 + g_selected_hexagon), 1.0);
		R.mv.scale(0.2, 0.2, 0.2);
		R.draw(triMesh, gl.TRIANGLES, 0, 3);
	R.mv.pop();

	// Flag
	R.mv.push();
		R.mv.translate(2.3, 2.0, 2.0);
		R.mv.scale(0.2, 0.2, 0.2);
		DrawFlag(gl, R, texture[12 + g_selected_face[0]], g_selected_face[0]);
	R.mv.pop();
}

// ---------------------------------------------------------------------------
// 입력
// ---------------------------------------------------------------------------

function MyKeyboard(key) {
	switch (key) {
	case ' ':
		g_spincount[0] -= (6 * (7 + Math.floor(Math.random() * 10)));
		g_spincount[1] += (6 * (7 + Math.floor(Math.random() * 10)));
		break;

	case 'Escape':
		// exit(0) 대신 음악만 정지한다.
		MusicStop();
		break;
	}
}

function Arrowkey(a_key) {
	switch (a_key) {
	case 'ArrowUp':
		g_selected_hexagon = 1;
		break;
	case 'ArrowDown':
		g_selected_hexagon = 0;
		break;
	case 'ArrowLeft':
		if (0 <= g_selected_hexagon && g_selected_hexagon < NUM_HEXAGONS)
			g_spincount[g_selected_hexagon] += (-6);
		break;
	case 'ArrowRight':
		if (0 <= g_selected_hexagon && g_selected_hexagon < NUM_HEXAGONS)
			g_spincount[g_selected_hexagon] += 6;
		break;
	}
}

// ---------------------------------------------------------------------------
// 타이머
// ---------------------------------------------------------------------------

function TimerLight() {
	g_tick++;
	RotateSpecificLight(2, 5.0);
	RotateSpecificLight(3, -5.0);

	for (let i = 0; i < 2; ++i) {
		if (g_spincount[i] > 0) {
			g_spin[i] -= 10.0;
			g_spincount[i]--;
		} else if (g_spincount[i] < 0) {
			g_spin[i] += 10.0;
			g_spincount[i]++;
		}

		if (g_spincount[i] === 0) {
			while (g_spin[i] < 0.0) g_spin[i] += 360.0;
			while (g_spin[i] >= 360.0) g_spin[i] -= 360.0;

			g_selected_face[i] = (6 - Math.trunc(g_spin[i] / 60.0 + 0.1) % 6) % 6;
		}
	}

	if (g_spincount[1] === 0 && g_currentmusic !== g_selected_face[1]) {
		g_currentmusic = g_selected_face[1];
		MusicPlay(g_musicfile[g_currentmusic]);
	}
}

function TimerZoomIn() {
	g_zoomin_count++;
	if (g_zoomin_count < 30)
		g_eye_z -= 0.5;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function resizeCanvas() {
	const dpr = window.devicePixelRatio || 1;
	const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
	const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
	}
	Reshape(canvas.width, canvas.height);
}

async function main() {
	canvas = document.getElementById('glcanvas');
	gl = canvas.getContext('webgl', { antialias: true, depth: true });
	if (!gl) {
		document.getElementById('hint').textContent = 'WebGL 을 사용할 수 없습니다.';
		document.getElementById('hint').style.display = 'block';
		return;
	}

	R = new Renderer(gl);
	R.color(1.0, 1.0, 1.0);     // OpenGL 기본 current color
	R.normal(0.0, 0.0, 1.0);    // OpenGL 기본 current normal
	R.texCoord(0.0, 0.0);

	InitFloor();
	InitHexagon();
	InitTriangle();

	if (!await InitOpenGL()) return;
	Init_fmod();
	InitFlag(gl);

	MusicPlay(g_musicfile[g_selected_face[g_selected_hexagon]]);

	resizeCanvas();
	window.addEventListener('resize', resizeCanvas);

	window.addEventListener('keydown', (e) => {
		MusicResume();
		if (e.key.startsWith('Arrow')) {
			Arrowkey(e.key);
			e.preventDefault();
		} else {
			MyKeyboard(e.key);
			if (e.key === ' ') e.preventDefault();
		}
	});
	canvas.addEventListener('pointerdown', () => { MusicResume(); canvas.focus(); });

	// glutTimerFunc(100, ...) 두 개를 100ms 주기로 돌린다.
	let lastTimer = performance.now();

	function Process(now) {
		while (now - lastTimer >= 100) {
			lastTimer += 100;
			TimerLight();
			TimerZoomIn();
		}
		Display();
		MusicUpdate();
		requestAnimationFrame(Process);
	}
	requestAnimationFrame(Process);
}

window.addEventListener('load', main);
