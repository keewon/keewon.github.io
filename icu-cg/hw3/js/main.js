// main.js - port of src/main.cpp
//
// SDL window + event loop becomes a canvas + DOM events, the 60 fps
// SDL_Delay loop becomes requestAnimationFrame with a fixed 60 Hz step so the
// robot walks at the same speed on a 144 Hz monitor.

(function () {
	'use strict';

	var APP_NAME = 'HW3 - 20042081 Seo, Kee-won';
	var SCREEN_W = 640;
	var SCREEN_H = 480;
	var TICK_INTERVAL = 1000 / 60; // 60 frames per second

	var canvas = null;
	var gp_Robot = null;
	var gp_Robot2 = null;

	var wireframe = 0;
	var light = 0;
	var lightingEnabled = true;
	var menu = 0;
	var eye_distance = 10.0;
	var paused = false;

	var keys = {};        // SDL_GetKeyState equivalent
	var mouseDown = false;

	// ---- log ------------------------------------------------------------

	function Log() {
		if (window.console && console.log) {
			console.log.apply(console, arguments);
		}
	}

	// ---- init -----------------------------------------------------------

	function ReshapeGL(width, height) {
		if (height === 0) height = 1;

		GLC.viewport(0, 0, width, height);
		GLC.matrixMode(GLC.PROJECTION);
		GLC.loadIdentity();
		GLC.perspective(45.0, width / height, 1.0, 100.0);
		GLC.matrixMode(GLC.MODELVIEW);
		GLC.loadIdentity();
	}

	function InitGL() {
		GLC.clearColor(0.0, 0.0, 0.0, 0.5);
		GLC.enable('depthTest');
		GLC.disable('blend');

		GLC.enable('lighting');
		GLC.enable('normalize');
		Light.InitLights();

		GLC.enable('texture2d');
		return true;
	}

	function Initialize(images) {
		menu = 0;

		DrawManager.Initialize(images.face);
		Menu.Initialize(images.menu);
		GameLogic.LoadGeometry();

		gp_Robot = new GameLogic.Robot(1);
		gp_Robot2 = new GameLogic.Robot(2);

		gp_Robot.SetXyz(0.0, 1.5, 0.0);
		gp_Robot2.SetXyz(-5.0, 1.5, -5.0);

		CollisionManager.CheckAndSet(1, 0.0, 0.0);
		CollisionManager.CheckAndSet(2, -5.0, -5.0);

		return true;
	}

	// ---- input ----------------------------------------------------------

	// Key names chosen so the original single-letter bindings still work.
	function ProcessKeyDown(key) {
		switch (key) {
			case 'Escape':
			case 'q':
				TerminateApplication();
				break;

			case 'a':
				gp_Robot.DrinkAlcohol();
				break;

			case 'w':
				wireframe = !wireframe;
				break;

			case 'e':
				// as in main.cpp: the first press is a no-op, the second one
				// switches lighting off. (There it also fell through into 'm'.)
				light = !light;
				lightingEnabled = !!light;
				if (light) GLC.enable('lighting');
				else GLC.disable('lighting');
				break;

			case 'm':
				menu = !menu;
				break;

			case 'z':
				gp_Robot.arm_aim[0] = gp_Robot.arm_aim[0] ? 0 : 1;
				break;
			case 'x':
				gp_Robot.arm_aim[1] = gp_Robot.arm_aim[1] ? 0 : 1;
				break;

			case 'p':
				paused = !paused;
				break;

			default:
				break;
		}
		UpdateHud();
	}

	function ProcessKeyPress() {
		if (keys['f'] || keys['ArrowUp']) {
			gp_Robot.Move(0.1);
		} else if (keys['b'] || keys['ArrowDown']) {
			gp_Robot.Move(-0.1);
		}

		if (keys['l'] || keys['ArrowLeft']) {
			gp_Robot.Turn(2.0);
		} else if (keys['r'] || keys['ArrowRight']) {
			gp_Robot.Turn(-2.0);
		}

		if (keys['d']) {
			eye_distance += 0.2;
		} else if (keys['s']) {
			eye_distance -= 0.2;
		}
	}

	function TerminateApplication() {
		paused = true;
		var over = document.getElementById('quit');
		if (over) over.style.display = 'flex';
	}

	// ---- frame ----------------------------------------------------------

	function Update() {
		if (menu) Menu.PerFrame();
		gp_Robot.PerFrame();
		gp_Robot2.MoveSelf();
		gp_Robot2.PerFrame();
	}

	var eye = [0.0, 0.0, 0.0];
	var center = [-2.0, -0.5, -50.0];
	var up = [0.0, 1.0, 0.0];

	function Draw() {
		eye[0] = 0.2 * eye_distance;
		eye[1] = 0.8 * eye_distance;
		eye[2] = 2.0 * eye_distance;

		GLC.clear();

		GLC.matrixMode(GLC.MODELVIEW);
		GLC.loadIdentity();
		GLC.lookAt(eye[0], eye[1], eye[2], center[0], center[1], center[2],
			up[0], up[1], up[2]);

		GLC.setWireframe(!!wireframe);

		Light.SetSpecificLight(0);

		// draw two walls, floor
		DrawManager.DrawRoom();

		// draw robot
		GLC.pushMatrix();
		gp_Robot.Draw();
		Light.SetSpecificLight(1);
		GLC.popMatrix();

		GLC.pushMatrix();
		GLC.popMatrix();
		gp_Robot2.Draw();

		// draw menu
		if (menu) {
			GLC.disable('lighting');
			Menu.Draw();
			if (lightingEnabled) GLC.enable('lighting');
		}
	}

	// ---- hud ------------------------------------------------------------

	function UpdateHud() {
		var el = document.getElementById('status');
		if (!el) return;
		el.textContent =
			'wireframe ' + (wireframe ? 'on' : 'off') +
			'  |  lighting ' + (lightingEnabled ? 'on' : 'off') +
			'  |  drunk ' + (gp_Robot && gp_Robot.alcohol ? 'on' : 'off') +
			'  |  menu ' + (menu ? 'on' : 'off') +
			(paused ? '  |  paused' : '');
	}

	// ---- main -----------------------------------------------------------

	function loadImage(src) {
		return new Promise(function (resolve, reject) {
			var img = new Image();
			img.onload = function () { resolve(img); };
			img.onerror = function () { reject(new Error('cannot load image')); };
			img.src = src;
		});
	}

	function fail(msg) {
		var el = document.getElementById('error');
		if (el) {
			el.textContent = msg;
			el.style.display = 'block';
		}
		Log(msg);
	}

	function resizeCanvas() {
		var dpr = window.devicePixelRatio || 1;
		var w = Math.round(canvas.clientWidth * dpr);
		var h = Math.round(canvas.clientHeight * dpr);
		if (w === 0 || h === 0) return;
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
			ReshapeGL(w, h); // SDL_VIDEORESIZE
		}
	}

	// canvas pixel -> the 640x480 space the menu rectangles live in
	function mousePos(ev) {
		var box = canvas.getBoundingClientRect();
		return {
			x: (ev.clientX - box.left) * SCREEN_W / box.width,
			y: (ev.clientY - box.top) * SCREEN_H / box.height
		};
	}

	function bindEvents() {
		window.addEventListener('keydown', function (ev) {
			if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
			var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
			if (!keys[k]) ProcessKeyDown(k);
			keys[k] = true;
			if (k.indexOf('Arrow') === 0 || k === ' ') ev.preventDefault();
		});

		window.addEventListener('keyup', function (ev) {
			var k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
			keys[k] = false;
		});

		window.addEventListener('blur', function () { keys = {}; });

		canvas.addEventListener('mousedown', function (ev) {
			mouseDown = true;
			if (menu) {
				var p = mousePos(ev);
				Menu.CheckMouseDown(p.x, p.y);
			}
		});

		window.addEventListener('mouseup', function () {
			if (mouseDown && menu) Menu.CheckMouseUp();
			mouseDown = false;
		});

		// touch: tap the menu panel
		canvas.addEventListener('touchstart', function (ev) {
			if (!menu || !ev.touches.length) return;
			var p = mousePos(ev.touches[0]);
			Menu.CheckMouseDown(p.x, p.y);
			ev.preventDefault();
		}, { passive: false });

		canvas.addEventListener('touchend', function () {
			if (menu) Menu.CheckMouseUp();
		});

		window.addEventListener('resize', resizeCanvas);

		// on-screen buttons, so the thing is usable without a keyboard
		var pad = document.getElementById('pad');
		if (pad) {
			pad.addEventListener('mousedown', padDown);
			pad.addEventListener('mouseup', padUp);
			pad.addEventListener('mouseleave', padUp);
			pad.addEventListener('touchstart', function (ev) { padDown(ev); ev.preventDefault(); }, { passive: false });
			pad.addEventListener('touchend', padUp);
		}
	}

	var padKey = null;

	function padDown(ev) {
		var t = ev.target.closest ? ev.target.closest('[data-key]') : null;
		if (!t) return;
		var k = t.getAttribute('data-key');
		if (t.getAttribute('data-hold') === '1') {
			padKey = k;
			keys[k] = true;
		} else {
			ProcessKeyDown(k);
		}
	}

	function padUp() {
		if (padKey) { keys[padKey] = false; padKey = null; }
	}

	var lastTime = 0;
	var accumulator = 0;

	function frame(now) {
		requestAnimationFrame(frame);

		if (!lastTime) lastTime = now;
		var dt = now - lastTime;
		lastTime = now;
		if (dt > 250) dt = 250; // came back from a background tab

		if (!paused) {
			accumulator += dt;
			var steps = 0;
			while (accumulator >= TICK_INTERVAL && steps < 4) {
				ProcessKeyPress();
				Update();
				accumulator -= TICK_INTERVAL;
				steps++;
			}
			if (steps === 0 && accumulator > TICK_INTERVAL * 4) accumulator = 0;
		}

		Draw();
	}

	function main() {
		canvas = document.getElementById('screen');
		document.title = APP_NAME;

		if (!GLC.init(canvas)) {
			fail('WebGL is not available in this browser.');
			return;
		}

		Promise.all([loadImage(Assets.face), loadImage(Assets.menu)])
			.then(function (imgs) {
				resizeCanvas();
				InitGL();
				Initialize({ face: imgs[0], menu: imgs[1] });
				bindEvents();
				UpdateHud();
				requestAnimationFrame(frame);
			})
			.catch(function (e) {
				fail('Failed to start: ' + e.message);
			});
	}

	window.addEventListener('load', main);
})();
