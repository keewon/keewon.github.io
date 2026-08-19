// menu.js - port of src/menu.{h,cpp}
//
// The original blitted menu.bmp straight onto the screen surface with
// SDL_OPENGLBLIT, a mode that only ever existed in SDL 1.2. Here the same
// sprite sheet is drawn as textured quads in an orthographic pass over the
// scene; every rectangle and all of the button logic is unchanged.

var Menu = (function () {
	'use strict';

	var SIMPLE_MENU = 1;

	var SRC = 0;
	var DST = 1;

	var N_WIDTH = 10;
	var N_HEIGHT = 20;

	var MAX_BUTTONS = SIMPLE_MENU ? 4 : 12;
	var MAX_DISP_NO = SIMPLE_MENU ? 1 : 5;

	var SCREEN_W = 640;
	var SCREEN_H = 480;

	function Button() {
		this.tx = 0; this.ty = 0; this.bx = 0; this.by = 0;
		this.id = 0; this.state = 0; this.shape = 0;
	}
	Button.prototype.SetValue = function (tx, ty, bx, by) {
		this.tx = tx; this.ty = ty; this.bx = bx; this.by = by;
	};

	var BTN_OFF = 0, BTN_ON = 1;
	var BTN_SHAPE_OFF = 0, BTN_SHAPE_ON = 1, BTN_SHAPE_UP = 2, BTN_SHAPE_DN = 3;

	var btns = [];
	var rect = [];   // rect[i][SRC|DST] = {x, y, w, h}
	for (var r = 0; r < 19; ++r) rect.push([{ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 0, h: 0 }]);

	var disp_on = true;

	var disp_number = [1, 0, 0, 0, 0];
	var disp_number_min = [1, 0, 0, 0, 0];
	var disp_number_max = SIMPLE_MENU ? [2, 255, 255, 255, 90] : [4, 255, 255, 255, 90];
	var disp_number_small = [0, 0, 0, 0, 0];

	var disp_number_rect = [
		{ x: 118, y: 8, w: N_WIDTH, h: N_HEIGHT },
		{ x: 29, y: 83, w: N_WIDTH, h: N_HEIGHT },
		{ x: 100, y: 83, w: N_WIDTH, h: N_HEIGHT },
		{ x: 167, y: 83, w: N_WIDTH, h: N_HEIGHT },
		{ x: 95, y: 122, w: N_WIDTH, h: N_HEIGHT }
	];

	var menu_tex = null;
	var menu_w = 231;
	var menu_h = 256;

	function Initialize(menuImage) {
		var i;

		if (!menuImage) {
			console.log('Cannot load menu.bmp');
			return;
		}
		menu_w = menuImage.width;
		menu_h = menuImage.height;
		// SDL_SetColorKey(magenta) is already baked into the PNG's alpha
		menu_tex = GLC.createTexture(menuImage, false, true, false);

		for (i = 0; i < 10; ++i) {
			rect[i][SRC].x = i * 22 + 6;
			rect[i][SRC].y = 174;
			rect[i][SRC].w = N_WIDTH;
			rect[i][SRC].h = N_HEIGHT;
		}

		// Menu Panel
		var panelH = SIMPLE_MENU ? 80 : 155;
		rect[10][SRC].x = 0;
		rect[10][SRC].y = 0;
		rect[10][SRC].w = menu_w;
		rect[10][SRC].h = panelH;

		rect[10][DST].x = SCREEN_W - 230;
		rect[10][DST].y = 0;
		rect[10][DST].w = menu_w;
		rect[10][DST].h = panelH;

		// yellow on
		rect[11][SRC] = { x: 0, y: 207, w: 59, h: 24 };
		rect[11][DST] = { x: rect[10][DST].x + 12, y: rect[10][DST].y + 43, w: 59, h: 24 };

		// gray on
		rect[12][SRC] = { x: 0, y: 231, w: 59, h: 24 };
		rect[12][DST] = { x: rect[10][DST].x + 12, y: rect[10][DST].y + 43, w: 59, h: 24 };

		// yellow off
		rect[13][SRC] = { x: 59, y: 231, w: 59, h: 24 };
		rect[13][DST] = { x: rect[10][DST].x + 71, y: rect[10][DST].y + 43, w: 59, h: 24 };

		// gray off
		rect[14][SRC] = { x: 59, y: 207, w: 59, h: 24 };
		rect[14][DST] = { x: rect[10][DST].x + 71, y: rect[10][DST].y + 43, w: 59, h: 24 };

		// red up
		rect[15][SRC] = { x: 160, y: 207, w: 177 - 160 + 1, h: 217 - 207 + 1 };
		rect[15][DST] = { x: 0, y: 0, w: rect[15][SRC].w, h: rect[15][SRC].h };
		// gray up
		rect[16][SRC] = { x: 178, y: 207, w: 195 - 178 + 1, h: 217 - 207 + 1 };
		rect[16][DST] = { x: 0, y: 0, w: rect[15][SRC].w, h: rect[15][SRC].h };
		// red down
		rect[17][SRC] = { x: 178, y: 218, w: 177 - 160 + 1, h: 217 - 207 + 1 };
		rect[17][DST] = { x: 0, y: 0, w: rect[15][SRC].w, h: rect[15][SRC].h };
		// gray down
		rect[18][SRC] = { x: 160, y: 218, w: 177 - 160 + 1, h: 229 - 218 + 1 };
		rect[18][DST] = { x: 0, y: 0, w: rect[15][SRC].w, h: rect[15][SRC].h };

		for (i = 0; i < MAX_BUTTONS; ++i) {
			btns[i] = new Button();
			btns[i].id = i;
			btns[i].shape = BTN_SHAPE_UP + i % 2;
			btns[i].state = BTN_OFF;
		}
		btns[0].shape = BTN_SHAPE_ON;
		btns[1].shape = BTN_SHAPE_OFF;

		btns[0].SetValue(13, 44, 70, 65);
		btns[1].SetValue(72, 44, 129, 65);
		btns[2].SetValue(152, 8, 167, 17);
		btns[3].SetValue(152, 19, 167, 28);
		if (!SIMPLE_MENU) {
			btns[4].SetValue(64, 83, 79, 92);
			btns[5].SetValue(64, 94, 79, 103);
			btns[6].SetValue(132, 83, 147, 92);
			btns[7].SetValue(132, 94, 147, 103);
			btns[8].SetValue(197, 83, 212, 92);
			btns[9].SetValue(197, 94, 212, 103);
			btns[10].SetValue(132, 122, 147, 131);
			btns[11].SetValue(132, 133, 147, 142);
		}

		if (disp_on) {
			btns[0].state = BTN_ON;
			btns[1].state = BTN_OFF;
		} else {
			btns[0].state = BTN_OFF;
			btns[1].state = BTN_ON;
		}

		disp_number[0] = 1;

		var lv = Light.GetLightValue();
		if (lv.light_max > 0) {
			disp_on = lv.light[0].on;
			disp_number[1] = lv.light[0].r;
			disp_number[2] = lv.light[0].g;
			disp_number[3] = lv.light[0].b;
			disp_number[4] = Math.floor(lv.light[0].spotCutoff);
		}
	}

	function Destroy() {
	}

	function MenuActionDown(id) {
		var d = Math.floor(id / 2) - 1;

		switch (id) {
			case 0:
			case 1:
				if (disp_on && id === 1) {
					btns[0].state = BTN_OFF;
					btns[1].state = BTN_ON;
					disp_on = !disp_on;
				} else if (!disp_on && id === 0) {
					btns[0].state = BTN_ON;
					btns[1].state = BTN_OFF;
					disp_on = !disp_on;
				}
				break;

			case 2:
			case 3:
				// light synch
				{
					var lv = Light.GetLightValue();
					var i = disp_number[0];

					if (0 <= i && i < lv.light_max) {
						disp_on = lv.light[i].on;
						disp_number[1] = lv.light[i].r;
						disp_number[2] = lv.light[i].g;
						disp_number[3] = lv.light[i].b;
						disp_number[4] = Math.floor(lv.light[i].spotCutoff);
					} else {
						disp_on = false;
					}

					if (disp_on) {
						btns[0].state = BTN_OFF;
						btns[1].state = BTN_ON;
					} else {
						btns[0].state = BTN_ON;
						btns[1].state = BTN_OFF;
					}
				}
			/* falls through - deliberate, as in menu.cpp */
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
				if (id % 2 === 0) {
					disp_number[d]++;
					disp_number_small[d] = 0;
				} else {
					disp_number[d]--;
					disp_number_small[d] = 6;
				}

				if (disp_number[d] < disp_number_min[d]) {
					disp_number[d] = disp_number_max[d];
				} else if (disp_number[d] > disp_number_max[d]) {
					disp_number[d] = disp_number_min[d];
				}

				btns[id].state = BTN_ON;
				break;
		}
	}

	function CheckMouseDown(mx1, my1) {
		var mx = mx1 - rect[10][DST].x;
		var my = my1 - rect[10][DST].y;

		for (var i = 0; i < MAX_BUTTONS; ++i) {
			if (btns[i].tx <= mx && mx <= btns[i].bx &&
				btns[i].ty <= my && my <= btns[i].by) {
				MenuActionDown(btns[i].id);
				return true;
			}
		}
		return false;
	}

	function CheckMouseUp() {
		for (var i = 2; i < MAX_BUTTONS; ++i) {
			btns[i].state = BTN_OFF;
		}
		return false;
	}

	function PerFrame() {
		// auto-repeat while an up/down button is held
		for (var i = 4; i < MAX_BUTTONS; ++i) {
			var d = Math.floor(i / 2) - 1;

			if (btns[i].state === BTN_ON) {
				if (i % 2 === 0) disp_number_small[d]++;
				else disp_number_small[d]--;

				if (disp_number_small[d] > 6) {
					disp_number[d]++;
					disp_number_small[d] = 0;
				}
				if (disp_number_small[d] < 0) {
					disp_number[d]--;
					disp_number_small[d] = 6;
				}

				if (disp_number[d] < disp_number_min[d]) {
					disp_number[d] = disp_number_max[d];
				} else if (disp_number[d] > disp_number_max[d]) {
					disp_number[d] = disp_number_min[d];
				}
			}
		}

		Light.SynchLights(disp_number[0], disp_on, disp_number.slice(1));
	}

	// one sprite = one textured quad in screen space
	function Blit(src, dst) {
		var u0 = src.x / menu_w;
		var u1 = (src.x + src.w) / menu_w;
		var v0 = src.y / menu_h;
		var v1 = (src.y + src.h) / menu_h;

		var x0 = dst.x, y0 = dst.y;
		var x1 = dst.x + src.w, y1 = dst.y + src.h;

		GLC.begin(GLC.GL_QUADS);
		GLC.color3f(1.0, 1.0, 1.0);
		GLC.texCoord2f(u0, v1); GLC.vertex3f(x0, y1, 0.0);
		GLC.texCoord2f(u1, v1); GLC.vertex3f(x1, y1, 0.0);
		GLC.texCoord2f(u1, v0); GLC.vertex3f(x1, y0, 0.0);
		GLC.texCoord2f(u0, v0); GLC.vertex3f(x0, y0, 0.0);
		GLC.end();
	}

	function Draw() {
		if (!menu_tex) return;

		// 2D overlay pass
		GLC.matrixMode(GLC.PROJECTION);
		GLC.pushMatrix();
		GLC.loadIdentity();
		GLC.ortho(0, SCREEN_W, SCREEN_H, 0, -1, 1);
		GLC.matrixMode(GLC.MODELVIEW);
		GLC.pushMatrix();
		GLC.loadIdentity();

		GLC.setWireframe(false); // main.Draw() sets it again next frame
		GLC.enable('blend');
		GLC.disable('depthTest');
		GLC.bindTexture(menu_tex);

		// Menu panel
		Blit(rect[10][SRC], rect[10][DST]);

		var i;
		for (i = 0; i < MAX_BUTTONS; ++i) {
			var btn_r = { x: 0, y: 0, w: 0, h: 0 };
			var sprite_no = 11;

			switch (btns[i].shape) {
				case BTN_SHAPE_ON:
					sprite_no = 11;
					btn_r.x = rect[11][DST].x;
					btn_r.y = rect[11][DST].y;
					break;
				case BTN_SHAPE_OFF:
					sprite_no = 13;
					btn_r.x = rect[13][DST].x;
					btn_r.y = rect[13][DST].y;
					break;
				case BTN_SHAPE_UP:
					sprite_no = 15;
					btn_r.x = btns[i].tx + (rect[10][DST].x - 1);
					btn_r.y = btns[i].ty + (rect[10][DST].y - 1);
					break;
				case BTN_SHAPE_DN:
					sprite_no = 17;
					btn_r.x = btns[i].tx + (rect[10][DST].x - 1);
					btn_r.y = btns[i].ty + (rect[10][DST].y - 1);
					break;
			}

			if (btns[i].state === BTN_OFF) sprite_no++;

			Blit(rect[sprite_no][SRC], btn_r);
		}

		// numbers
		for (i = 0; i < MAX_DISP_NO; ++i) {
			var d = disp_number[i];
			var ten_square = [100, 10, 1];

			for (var j = 0; j < 3; ++j) {
				var pos = {
					x: rect[10][DST].x - 1 + disp_number_rect[i].x + j * N_WIDTH,
					y: rect[10][DST].y - 1 + disp_number_rect[i].y
				};
				Blit(rect[Math.floor(d / ten_square[j]) % 10][SRC], pos);
			}
		}

		GLC.bindTexture(null);
		GLC.disable('blend');
		GLC.enable('depthTest');

		GLC.popMatrix();
		GLC.matrixMode(GLC.PROJECTION);
		GLC.popMatrix();
		GLC.matrixMode(GLC.MODELVIEW);
	}

	return {
		SCREEN_W: SCREEN_W,
		SCREEN_H: SCREEN_H,
		Initialize: Initialize,
		Destroy: Destroy,
		CheckMouseDown: CheckMouseDown,
		CheckMouseUp: CheckMouseUp,
		PerFrame: PerFrame,
		Draw: Draw
	};
})();
