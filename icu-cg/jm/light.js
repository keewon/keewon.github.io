// light.js - light.cpp 이식. 스포트라이트 4개.
const M_PI = 3.141592654;
const TWO_PI = 2 * M_PI;

const modelAmb = [0.5, 0.5, 0.5, 1.0];
const matAmb   = [0.6, 0.6, 0.6, 1.0];
const matDiff  = [0.8, 0.8, 0.8, 1.0];
const matSpec  = [0.6, 0.6, 0.6, 1.0];
const matEmission = [0.0, 0.0, 0.0, 1.0];
const matShininess = 10.0;

const NUM_LIGHTS = 4;

const spots = [
	// global light - jm.cpp 에서 SetSpecificLight(0) 를 부르지 않으므로
	// 위치는 OpenGL 기본값(0,0,1,0), 즉 시점에서 나오는 방향광으로 남는다.
	{
		amb: [0.1, 0.1, 0.1, 1.0],
		diff: [0.5, 0.5, 0.5, 1.0],
		spec: [0.1, 0.1, 0.1, 1.0],
		pos: [10.0, 6.0, 8.0, 0.0],
		spotDir: [0.0, -1.0, 0.0],
		spotExp: 20.0, spotCutoff: 60.0,
		atten: [1.0, 0.0, 0.0],
		trans: [0.0, 1.25, 0.0],
		rot: [0.0, 0.0, 0.0],
		on: true, rotate_state: 0.0, rotate_direction: 1,
	},
	{
		amb: [0.2, 0.2, 0.2, 1.0],
		diff: [0.8, 0.8, 0.8, 1.0],
		spec: [0.4, 0.4, 0.4, 1.0],
		pos: [-2.0, 2.0, 5.0, 1.0],
		spotDir: [0.0, 0.0, -1.0],
		spotExp: 20.0, spotCutoff: 60.0,
		atten: [1.0, 0.0, 0.0],
		trans: [-2.0, 2.0, 5.0],
		rot: [0.0, 0.0, 0.0],
		on: true, rotate_state: 0.0, rotate_direction: 1,
	},
	// left (red)
	{
		amb: [0.2, 0.0, 0.0, 1.0],
		diff: [0.8, 0.0, 0.0, 1.0],
		spec: [0.4, 0.0, 0.0, 1.0],
		pos: [0.0, 0.0, 0.0, 1.0],
		spotDir: [0.0, -1.0, 0.0],
		spotExp: 20.0, spotCutoff: 7.0,
		atten: [1.0, 0.0, 0.0],
		trans: [-1.0, 3.0, 6.0],
		rot: [0.0, 0.0, 0.0],
		on: true, rotate_state: 0.0, rotate_direction: 1,
	},
	// right (green)
	{
		amb: [0.0, 0.2, 0.0, 1.0],
		diff: [0.0, 0.8, 0.0, 1.0],
		spec: [0.0, 0.4, 0.0, 1.0],
		pos: [0.0, 0.0, 0.0, 1.0],
		spotDir: [0.0, -1.0, 0.0],
		spotExp: 20.0, spotCutoff: 7.0,
		atten: [1.0, 0.0, 0.0],
		trans: [1.0, 3.0, 6.0],
		rot: [0.0, 0.0, 0.0],
		on: true, rotate_state: 0.0, rotate_direction: 1,
	},
];

// 셰이더로 보낼 시점(eye) 좌표계 광원 상태.
// OpenGL 은 glLightfv(GL_POSITION) 호출 시점의 모델뷰 행렬로 위치를 변환하므로 똑같이 한다.
const lightEye = [
	{ pos: [0, 0, 1, 0], dir: [0, 0, -1] },  // light 0 : 설정된 적 없는 기본값
	{ pos: [0, 0, 0, 1], dir: [0, 0, -1] },
	{ pos: [0, 0, 0, 1], dir: [0, -1, 0] },
	{ pos: [0, 0, 0, 1], dir: [0, -1, 0] },
];

function SetSpecificLight(k, modelview) {
	const light = spots[k];
	let m = matMul(modelview, matTranslate(light.trans[0], light.trans[1], light.trans[2]));
	m = matMul(m, matRotate(light.rot[0], 1, 0, 0));
	m = matMul(m, matRotate(light.rot[1], 0, 1, 0));
	m = matMul(m, matRotate(light.rot[2], 0, 0, 1));

	lightEye[k].pos = matMulVec(m, light.pos);
	const d = matUpper3(m);
	const s = light.spotDir;
	lightEye[k].dir = [
		d[0]*s[0] + d[3]*s[1] + d[6]*s[2],
		d[1]*s[0] + d[4]*s[1] + d[7]*s[2],
		d[2]*s[0] + d[5]*s[1] + d[8]*s[2],
	];
}

function RotateSpecificLight(k, angle) {
	const light = spots[k];

	if (k === 2) {
		if (light.rotate_state > 290.0) light.rotate_state = 290.0;
		else if (light.rotate_state < 260.0) light.rotate_state = 260.0;
	} else if (k === 3) {
		if (light.rotate_state > 270.0) light.rotate_state = 270.0;
		else if (light.rotate_state < 250.0) light.rotate_state = 250.0;
	}

	light.rotate_state += (light.rotate_direction * angle);

	if (k === 2) {
		if (light.rotate_state > 290.0 || light.rotate_state < 260.0)
			light.rotate_direction *= -1;
	} else if (k === 3) {
		if (light.rotate_state > 270.0 || light.rotate_state < 250.0)
			light.rotate_direction *= -1;
	}

	if (light.rotate_state >= 360.0) light.rotate_state -= 360.0;
	else if (light.rotate_state < 0.0) light.rotate_state += 360.0;

	light.spotDir[0] = 2.5 * Math.cos((light.rotate_state / 360.0) * M_PI * 2.0);
	light.spotDir[2] = 2.5 * Math.sin((light.rotate_state / 360.0) * M_PI * 2.0);
}
