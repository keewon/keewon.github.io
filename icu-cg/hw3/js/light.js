// light.js - port of src/light.{h,cpp}
//
//   light 0 : global light, directional (w = 0), from 10/6/8 towards -1/-1/-1
//   light 1 : ceiling spot above the player robot
//   light 2 : red lantern held in the left forearm
//   light 3 : green lantern held in the right forearm

var Light = (function () {
	'use strict';

	var TWO_PI = 2 * Math.PI;
	var NUM_LIGHTS = 4;

	var modelAmb = [0.5, 0.5, 0.5, 1.0];
	var matAmb = [0.6, 0.6, 0.6, 1.0];
	var matDiff = [0.8, 0.8, 0.8, 1.0];
	var matSpec = [0.6, 0.6, 0.6, 1.0];
	var matEmission = [0.0, 0.0, 0.0, 1.0];

	var spots = [
		// global light
		{
			amb: [0.1, 0.1, 0.1, 1.0],
			diff: [0.3, 0.3, 0.3, 1.0],
			spec: [0.1, 0.1, 0.1, 1.0],
			pos: [10.0, 6.0, 8.0, 0.0],
			spotDir: [-1.0, -1.0, -1.0],
			spotExp: 20.0,
			spotCutoff: 60.0,
			atten: [1.0, 0.0, 0.0],
			trans: [0.0, 1.25, 0.0],
			rot: [0.0, 0.0, 0.0],
			swing: [0.0, 0.0, 0.0],
			arc: [0.0, 0.0, 0.0],
			arcIncr: [TWO_PI / 70.0, 0.0, TWO_PI / 140.0],
			r: 255, g: 255, b: 255, on: true
		},
		{
			amb: [0.2, 0.2, 0.2, 1.0],
			diff: [0.8, 0.8, 0.8, 1.0],
			spec: [0.4, 0.4, 0.4, 1.0],
			pos: [0.0, 10.0, 0.0, 1.0],
			spotDir: [0.0, -1.0, 0.0],
			spotExp: 20.0,
			spotCutoff: 60.0,
			atten: [1.0, 0.0, 0.0],
			trans: [0.0, 1.25, 0.0],
			rot: [0.0, 0.0, 0.0],
			swing: [0.0, 0.0, 0.0],
			arc: [0.0, 0.0, 0.0],
			arcIncr: [TWO_PI / 70.0, 0.0, TWO_PI / 140.0],
			r: 255, g: 255, b: 255, on: true
		},
		// left
		{
			amb: [0.2, 0.0, 0.0, 1.0],
			diff: [0.8, 0.0, 0.0, 1.0],
			spec: [0.4, 0.0, 0.0, 1.0],
			pos: [0.0, 0.0, 0.0, 1.0],
			spotDir: [0.1, -1.0, 0.0],
			spotExp: 20.0,
			spotCutoff: 20.0,
			atten: [1.0, 0.0, 0.0],
			trans: [0.0, 0.0, 0.0],
			rot: [0.0, 0.0, 0.0],
			swing: [0.0, 0.0, 0.0],
			arc: [0.0, 0.0, 0.0],
			arcIncr: [TWO_PI / 70.0, 0.0, TWO_PI / 140.0],
			r: 255, g: 255, b: 255, on: true
		},
		// right
		{
			amb: [0.0, 0.2, 0.0, 1.0],
			diff: [0.0, 0.8, 0.0, 1.0],
			spec: [0.0, 0.4, 0.0, 1.0],
			pos: [0.0, 0.0, 0.0, 1.0],
			spotDir: [-0.1, -1.0, 0.0],
			spotExp: 20.0,
			spotCutoff: 20.0,
			atten: [1.0, 0.0, 0.0],
			trans: [0.0, 0.0, 0.0],
			rot: [0.0, 0.0, 0.0],
			swing: [0.0, 0.0, 0.0],
			arc: [0.0, 0.0, 0.0],
			arcIncr: [TWO_PI / 70.0, 0.0, TWO_PI / 140.0],
			r: 255, g: 255, b: 255, on: true
		}
	];

	function InitLights() {
		GLC.lightModelAmbient(modelAmb);
		// GL_LIGHT_MODEL_LOCAL_VIEWER = true, GL_LIGHT_MODEL_TWO_SIDE = false
		// are both baked into the shader.

		GLC.materialAmbient(matAmb);
		GLC.materialDiffuse(matDiff);
		GLC.materialSpecular(matSpec);
		GLC.materialEmission(matEmission);
		GLC.materialShininess(10.0);
		GLC.enable('colorMaterial'); // GL_FRONT, GL_AMBIENT_AND_DIFFUSE

		for (var k = 0; k < NUM_LIGHTS; ++k) {
			var light = spots[k];

			if (light.on) GLC.enableLight(k);
			else GLC.disableLight(k);

			GLC.lightAmbient(k, light.amb);
			GLC.lightDiffuse(k, light.diff);
			GLC.lightSpecular(k, light.spec);

			GLC.lightSpotExponent(k, light.spotExp);
			GLC.lightSpotCutoff(k, light.spotCutoff);
			GLC.lightAttenuation(k, light.atten[0], light.atten[1], light.atten[2]);
		}
	}

	// Position and spot direction are snapshot in eye space here, so where this
	// is called from decides what the light is attached to.
	function SetSpecificLight(k) {
		var light = spots[k];

		GLC.pushMatrix();
		GLC.translatef(light.trans[0], light.trans[1], light.trans[2]);

		GLC.rotatef(light.rot[0], 1, 0, 0);
		GLC.rotatef(light.rot[1], 0, 1, 0);
		GLC.rotatef(light.rot[2], 0, 0, 1);

		GLC.lightPosition(k, light.pos);
		GLC.lightSpotDirection(k, light.spotDir);
		GLC.popMatrix();
	}

	function DrawSpecificLight(k) {
		var light = spots[k];

		GLC.color4fv(light.diff);

		GLC.pushMatrix();
		GLC.translatef(light.trans[0], light.trans[1], light.trans[2]);

		GLC.rotatef(light.rot[0], 1, 0, 0);
		GLC.rotatef(light.rot[1], 0, 1, 0);
		GLC.rotatef(light.rot[2], 0, 0, 1);

		GLC.begin(GLC.GL_LINES);
		GLC.vertex3f(light.pos[0], light.pos[1], light.pos[2]);
		GLC.vertex3f(light.spotDir[0], light.spotDir[1], light.spotDir[2]);
		GLC.end();
		GLC.popMatrix();
	}

	function SynchLights(light_no, onoff, light_property_array) {
		light_no = light_no - 1;

		if (!(0 <= light_no && light_no < NUM_LIGHTS)) {
			return;
		}

		var light = spots[light_no];

		if (onoff) {
			light.on = true;
			GLC.enableLight(light_no);
		} else {
			light.on = false;
			GLC.disableLight(light_no);
		}

		light.r = light_property_array[0];
		light.g = light_property_array[1];
		light.b = light_property_array[2];

		var factor = (light_no === 0) ? [0.4, 0.6, 0.1] : [0.2, 0.8, 0.4];

		light.amb[0] = light.r / 255.0 * factor[0];
		light.amb[1] = light.g / 255.0 * factor[0];
		light.amb[2] = light.b / 255.0 * factor[0];

		light.diff[0] = light.r / 255.0 * factor[1];
		light.diff[1] = light.g / 255.0 * factor[1];
		light.diff[2] = light.b / 255.0 * factor[1];

		light.spec[0] = light.r / 255.0 * factor[2];
		light.spec[1] = light.g / 255.0 * factor[2];
		light.spec[2] = light.b / 255.0 * factor[2];

		light.spotCutoff = light_property_array[3];

		// As in light.cpp, the new colours stay in the struct and are never
		// handed to GL, so only the on/off switch above has a visible effect.
		// (HW3_20042081.txt: "control colors : not implemented" - and the
		// simple menu has no colour buttons to begin with. Pushing them would
		// also blow out light 0, because these factors do not reproduce its
		// initial ambient/diffuse.)
	}

	function GetLightValue() {
		return { light_max: NUM_LIGHTS, light: spots };
	}

	return {
		NUM_LIGHTS: NUM_LIGHTS,
		InitLights: InitLights,
		SetSpecificLight: SetSpecificLight,
		DrawSpecificLight: DrawSpecificLight,
		SynchLights: SynchLights,
		GetLightValue: GetLightValue
	};
})();
