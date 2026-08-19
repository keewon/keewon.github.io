// draw_manager.js - port of src/draw_manager.{h,cpp}
//
// Everything is built from one unit cube, scaled per body part, plus the
// floor / two walls of the room.

var DrawManager = (function () {
	'use strict';

	var g_TexturesArray = [null];
	var state = {
		alcohol: false,
		robot_id: 0
	};

	function Initialize(faceImage) {
		// tga.cpp did this with gluBuild2DMipmaps on yuria.tga
		if (faceImage) g_TexturesArray[0] = GLC.createTexture(faceImage, true, true);
	}

	function Destroy() {
	}

	function Translate(v) {
		GLC.translatef(v.p[0], v.p[1], v.p[2]);
	}

	function Rotate(angle, v) {
		GLC.rotatef(angle, v.p[0], v.p[1], v.p[2]);
	}

	function DrawHead() {
		// Front Face - the textured one. In draw_manager.cpp the
		// glBindTexture call was commented out, so the face texture never
		// actually showed up; bound here so it does. Split into its own
		// begin/end because the other five faces are untextured.
		GLC.bindTexture(g_TexturesArray[0]);
		GLC.begin(GLC.GL_QUADS);
		if (state.alcohol && state.robot_id === 1) {
			GLC.color3f(0.5, 0.0, 0.0);
		} else {
			GLC.color3f(1.0, 1.0, 1.0);
		}
		GLC.normal3f(0.0, 0.0, 1.0);
		GLC.texCoord2f(0.0, 0.0); GLC.vertex3f(-1.0, -1.0, 1.0);
		GLC.texCoord2f(1.0, 0.0); GLC.vertex3f(1.0, -1.0, 1.0);
		GLC.texCoord2f(1.0, 1.0); GLC.vertex3f(1.0, 1.0, 1.0);
		GLC.texCoord2f(0.0, 1.0); GLC.vertex3f(-1.0, 1.0, 1.0);
		GLC.end();
		GLC.bindTexture(null);

		GLC.begin(GLC.GL_QUADS);
		if (state.alcohol && state.robot_id === 1) {
			GLC.color3f(0.5, 0.0, 0.0);
		} else {
			GLC.color3f(1.0, 0.0, 0.0);
		}
		// Back Face
		GLC.normal3f(0.0, 0.0, -1.0);
		GLC.vertex3f(-1.0, -1.0, -1.0);
		GLC.vertex3f(-1.0, 1.0, -1.0);
		GLC.vertex3f(1.0, 1.0, -1.0);
		GLC.vertex3f(1.0, -1.0, -1.0);
		// Top Face
		GLC.normal3f(0.0, 1.0, 0.0);
		GLC.vertex3f(-1.0, 1.0, -1.0);
		GLC.vertex3f(-1.0, 1.0, 1.0);
		GLC.vertex3f(1.0, 1.0, 1.0);
		GLC.vertex3f(1.0, 1.0, -1.0);
		// Bottom Face
		GLC.normal3f(0.0, -1.0, 0.0);
		GLC.vertex3f(-1.0, -1.0, -1.0);
		GLC.vertex3f(1.0, -1.0, -1.0);
		GLC.vertex3f(1.0, -1.0, 1.0);
		GLC.vertex3f(-1.0, -1.0, 1.0);
		// Right face
		GLC.normal3f(1.0, 0.0, 0.0);
		GLC.vertex3f(1.0, -1.0, -1.0);
		GLC.vertex3f(1.0, 1.0, -1.0);
		GLC.vertex3f(1.0, 1.0, 1.0);
		GLC.vertex3f(1.0, -1.0, 1.0);
		// Left Face
		GLC.normal3f(-1.0, 0.0, 0.0);
		GLC.vertex3f(-1.0, -1.0, -1.0);
		GLC.vertex3f(-1.0, -1.0, 1.0);
		GLC.vertex3f(-1.0, 1.0, 1.0);
		GLC.vertex3f(-1.0, 1.0, -1.0);
		GLC.end();
	}

	function DrawCube() {
		GLC.begin(GLC.GL_QUADS);
		// Front Face
		GLC.normal3f(0.0, 0.0, 1.0);
		GLC.vertex3f(-1.0, -1.0, 1.0);
		GLC.vertex3f(1.0, -1.0, 1.0);
		GLC.vertex3f(1.0, 1.0, 1.0);
		GLC.vertex3f(-1.0, 1.0, 1.0);
		// Back Face
		GLC.normal3f(0.0, 0.0, -1.0);
		GLC.vertex3f(-1.0, -1.0, -1.0);
		GLC.vertex3f(-1.0, 1.0, -1.0);
		GLC.vertex3f(1.0, 1.0, -1.0);
		GLC.vertex3f(1.0, -1.0, -1.0);
		// Top Face
		GLC.normal3f(0.0, 1.0, 0.0);
		GLC.vertex3f(-1.0, 1.0, -1.0);
		GLC.vertex3f(-1.0, 1.0, 1.0);
		GLC.vertex3f(1.0, 1.0, 1.0);
		GLC.vertex3f(1.0, 1.0, -1.0);
		// Bottom Face
		GLC.normal3f(0.0, -1.0, 0.0);
		GLC.vertex3f(-1.0, -1.0, -1.0);
		GLC.vertex3f(1.0, -1.0, -1.0);
		GLC.vertex3f(1.0, -1.0, 1.0);
		GLC.vertex3f(-1.0, -1.0, 1.0);
		// Right face
		GLC.normal3f(1.0, 0.0, 0.0);
		GLC.vertex3f(1.0, -1.0, -1.0);
		GLC.vertex3f(1.0, 1.0, -1.0);
		GLC.vertex3f(1.0, 1.0, 1.0);
		GLC.vertex3f(1.0, -1.0, 1.0);
		// Left Face
		GLC.normal3f(-1.0, 0.0, 0.0);
		GLC.vertex3f(-1.0, -1.0, -1.0);
		GLC.vertex3f(-1.0, -1.0, 1.0);
		GLC.vertex3f(-1.0, 1.0, 1.0);
		GLC.vertex3f(-1.0, 1.0, -1.0);
		GLC.end();
	}

	function DrawPart(part, side) {
		var G = GameLogic;

		switch (part) {
			case G.PART_TYPE_HEAD:
				GLC.pushMatrix();
				GLC.scalef(0.5, 0.4, 0.5);
				if (state.alcohol && state.robot_id === 1) {
					GLC.color3f(0.5, 0.0, 0.0);
				} else {
					GLC.color3f(1.0, 0.0, 0.0);
				}
				DrawHead();
				GLC.popMatrix();
				break;

			case G.PART_TYPE_TORSO:
				if (state.robot_id === 1) GLC.color3f(0.0, 1.0, 0.0);
				else GLC.color3f(0.0, 1.0, 1.0);
				GLC.scalef(1.0, 0.5, 0.6);
				GLC.translatef(0.0, 0.5, 0.0);
				DrawCube();
				break;

			case G.PART_TYPE_ARM:
				GLC.color3f(0.0, 0.5, 1.0);
				GLC.scalef(0.2, 0.3, 0.2);
				GLC.translatef(0.0, -2.0, 0.0);
				DrawCube();
				break;

			case G.PART_TYPE_LEG:
				GLC.color3f(0.2, 0.3, 1.0);
				GLC.scalef(0.35, 0.3, 0.5);
				GLC.translatef(0.0, -1.0, 0.0);
				DrawCube();
				break;

			case G.PART_TYPE_CALF:
				GLC.color3f(1.0, 0.0, 0.0);
				GLC.scalef(0.4, 0.3, 0.4);
				DrawCube();
				break;

			case G.PART_TYPE_FOOT:
				GLC.color3f(0.0, 1.0, 0.0);
				GLC.scalef(0.42, 0.1, 0.6);
				DrawCube();
				break;

			case G.PART_TYPE_FORE_ARM:
				GLC.color3f(1.0, 1.0, 0.0);
				GLC.scalef(0.18, 0.5, 0.18);
				GLC.translatef(0.0, -0.3, 0.0);
				DrawCube();
				// the lanterns ride along with the player robot's forearms
				if (side === G.PART_SIDE_LEFT && state.robot_id === 1) {
					Light.SetSpecificLight(2);
					Light.DrawSpecificLight(2);
				} else if (state.robot_id === 1) {
					Light.SetSpecificLight(3);
					Light.DrawSpecificLight(3);
				}
				break;

			default:
				break;
		}
	}

	function DrawRoom() {
		var i, j;

		// floor
		for (i = -20; i <= 20; ++i) {
			GLC.begin(GLC.GL_QUAD_STRIP);
			GLC.color3f(1.0, 1.0, 1.0);
			GLC.normal3f(0.0, 1.0, 0.0);

			for (j = -20; j <= 20; ++j) {
				GLC.vertex3f((i + 1) * 0.5, 0.0, j * 0.5);
				GLC.vertex3f(i * 0.5, 0.0, j * 0.5);
			}
			GLC.end();
		}

		// grid lines on the floor
		for (i = -10; i <= 10; ++i) {
			GLC.begin(GLC.GL_LINES);
			GLC.color3f(0.1, 0.1, 0.1);
			GLC.vertex3f(i * 1.0, 0.01, -10.0);
			GLC.vertex3f(i * 1.0, 0.01, 10.0);
			GLC.end();

			GLC.begin(GLC.GL_LINES);
			GLC.color3f(0.1, 0.1, 0.1);
			GLC.vertex3f(-10.0, 0.01, i * 1.0);
			GLC.vertex3f(10.0, 0.01, i * 1.0);
			GLC.end();
		}

		// wall 1
		for (i = 0; i <= 20; ++i) {
			GLC.begin(GLC.GL_QUAD_STRIP);
			GLC.color3f(1.0, 0.9, 1.0);
			GLC.normal3f(1.0, 0.0, 0.0);

			for (j = -20; j <= 20; ++j) {
				GLC.vertex3f(-10.0, i * 0.5, j * 0.5);
				GLC.vertex3f(-10.0, (i + 1) * 0.5, j * 0.5);
			}
			GLC.end();
		}

		// wall 2
		for (i = -20; i <= 20; ++i) {
			GLC.begin(GLC.GL_QUAD_STRIP);
			GLC.color3f(1.0, 1.0, 0.9);
			GLC.normal3f(0.0, 0.0, 1.0);

			for (j = 0; j <= 21; ++j) {
				GLC.vertex3f(i * 0.5, j * 0.5, -10.0);
				GLC.vertex3f((i + 1) * 0.5, j * 0.5, -10.0);
			}
			GLC.end();
		}
	}

	return {
		state: state,
		Initialize: Initialize,
		Destroy: Destroy,
		Translate: Translate,
		Rotate: Rotate,
		DrawPart: DrawPart,
		DrawRoom: DrawRoom
	};
})();
