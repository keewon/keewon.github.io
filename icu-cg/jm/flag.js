// flag.js - flag.cpp 이식. 흔들리는 깃발.
const FLAG_N = 45;
const points = new Float32Array(FLAG_N * FLAG_N * 3);  // points[x][y][0..2]
let wiggle_count = 0;

let xrot = 0.0, yrot = 0.0, zrot = 0.0;

let flagMesh = null;
let flagPosDirty = true;

function P(x, y, c) { return (x * FLAG_N + y) * 3 + c; }

function InitFlag(gl) {
	for (let x = 0; x < FLAG_N; x++) {
		for (let y = 0; y < FLAG_N; y++) {
			points[P(x,y,0)] = (x / 5.0) - 4.5;
			points[P(x,y,1)] = (y / 5.0) - 4.5;
			points[P(x,y,2)] = Math.sin((((x / 5.0) * 40.0) / 360.0) * 3.141592654 * 2.0) - y * 0.05;
		}
	}

	// 원본은 사각형마다 texcoord 를 x/44, y/44 로 주므로 격자 정점끼리 공유할 수 있다.
	const tex = new Float32Array(FLAG_N * FLAG_N * 2);
	for (let x = 0; x < FLAG_N; x++) {
		for (let y = 0; y < FLAG_N; y++) {
			tex[(x * FLAG_N + y) * 2 + 0] = x / 44.0;
			tex[(x * FLAG_N + y) * 2 + 1] = y / 44.0;
		}
	}

	const idx = new Uint16Array(44 * 44 * 6);
	let k = 0;
	for (let x = 0; x < 44; x++) {
		for (let y = 0; y < 44; y++) {
			const a = x * FLAG_N + y;
			const b = x * FLAG_N + (y + 1);
			const c = (x + 1) * FLAG_N + (y + 1);
			const d = (x + 1) * FLAG_N + y;
			idx[k++] = a; idx[k++] = b; idx[k++] = c;
			idx[k++] = a; idx[k++] = c; idx[k++] = d;
		}
	}

	const posBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
	gl.bufferData(gl.ARRAY_BUFFER, points, gl.DYNAMIC_DRAW);

	const texBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
	gl.bufferData(gl.ARRAY_BUFFER, tex, gl.STATIC_DRAW);

	const idxBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

	flagMesh = { pos: posBuf, tex: texBuf, index: idxBuf, count: idx.length };
	flagPosDirty = false;
}

function DrawFlag(gl, R, texture, color_num) {
	switch (color_num) {
	case 0: R.color(1.0, 1.0, 0.5); break;
	case 1: R.color(1.0, 0.5, 1.0); break;
	case 2: R.color(0.5, 1.0, 1.0); break;
	case 3: R.color(1.0, 0.5, 0.5); break;
	case 4: R.color(0.5, 1.0, 0.5); break;
	case 5: R.color(0.5, 0.5, 1.0); break;
	}

	R.mv.translate(0.0, 0.0, 0.0);
	R.mv.rotate(xrot, 1.0, 0.0, 0.0);
	R.mv.rotate(yrot, 0.0, 1.0, 0.0);
	R.mv.rotate(zrot, 0.0, 0.0, 1.0);

	R.bindTexture(texture);

	if (flagPosDirty) {
		gl.bindBuffer(gl.ARRAY_BUFFER, flagMesh.pos);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, points);
		flagPosDirty = false;
	}

	R.draw(flagMesh, gl.TRIANGLES, 0, flagMesh.count);

	// 원본은 정점마다 glTexCoord2f 를 호출하므로 마지막 값(x=43, y=43 의 float_xb,
	// float_y)이 다음 도형까지 남는다. 바닥이 이 좌표로 깃발 텍스처를 찍게 된다.
	R.texCoord(1.0, 43.0 / 44.0);

	if (wiggle_count === 2) {
		for (let y = 0; y < FLAG_N; y++) {
			const hold = points[P(0, y, 2)];
			for (let x = 0; x < 44; x++)
				points[P(x, y, 2)] = points[P(x + 1, y, 2)];
			points[P(44, y, 2)] = hold;
		}
		wiggle_count = 0;
		flagPosDirty = true;
	}
	wiggle_count++;
}
