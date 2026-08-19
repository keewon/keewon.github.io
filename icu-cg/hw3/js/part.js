// part.js - port of src/part.{h,cpp}
//
// One node of the robot's part hierarchy. A part owns its local translation,
// a rotation around an offset axis point, and a list of sub parts that inherit
// its matrix.

var GameLogic = GameLogic || {};

(function (ns) {
	'use strict';

	var Vertex = LinearAlgebra.Vertex;

	// PartType
	ns.PART_TYPE_NONE = 0;
	ns.PART_TYPE_HEAD = 1;
	ns.PART_TYPE_TORSO = 2;
	ns.PART_TYPE_BREAST = 3;
	ns.PART_TYPE_ARM = 4;
	ns.PART_TYPE_UPPER_ARM = 5;
	ns.PART_TYPE_FORE_ARM = 6;
	ns.PART_TYPE_LEG = 7;
	ns.PART_TYPE_THIGH = 8;
	ns.PART_TYPE_CALF = 9;
	ns.PART_TYPE_FOOT = 10;
	ns.PART_TYPE_HIP = 11;
	ns.PART_TYPE_END = 12;

	// PartCmd
	ns.PART_CMD_MOVE_DEFAULT = 0;
	ns.PART_CMD_MOVE_FORWARD = 1;
	ns.PART_CMD_MOVE_BACKWARD = 2;
	ns.PART_CMD_TURN_LEFT = 3;
	ns.PART_CMD_TURN_RIGHT = 4;
	ns.PART_CMD_TILT_LEFT = 5;
	ns.PART_CMD_TILT_RIGHT = 6;
	ns.PART_CMD_AIM = 7;

	// PartSide
	ns.PART_SIDE_CENTER = 0;
	ns.PART_SIDE_LEFT = 1;
	ns.PART_SIDE_RIGHT = 2;

	var SWING_UNIT_ARM = 5.0;
	var SWING_UNIT_LEG = 2.0;
	var SWING_MAX_ARM = 50.0;
	var SWING_MAX_LEG = 20.0;

	function Part(partType, name1, numTriangles, triangles, partSide) {
		this.partType = partType;
		this.name = String(name1).substring(0, 31);
		this.numTriangles = numTriangles;
		this.triangles = triangles;
		this.partSide = partSide;
		this.subPartList = [];

		this.v_xyz = new Vertex();
		this.v_rot = new Vertex();
		this.v_rot_axis = new Vertex();

		this.rot_angle = 0.0;
		this.rot_velocity = 0.0;
		this.partCmd = ns.PART_CMD_MOVE_DEFAULT;

		switch (partType) {
			case ns.PART_TYPE_ARM:
				this.SetRotAxis(0.0, 0.6, 0.0);
				break;
			case ns.PART_TYPE_FORE_ARM:
				this.SetXyz(0.0, -2.0, 0.0);
				this.SetRot(0.0, 1.0, 0.0, 0.0);
				this.SetRotAxis(0.0, -0.9, 0.0);
				break;
			case ns.PART_TYPE_CALF:
				this.SetRotAxis(0.0, 2.0, 0.0);
				break;
			default:
				this.SetRotAxis(0.0, 0.0, 0.0);
				break;
		}
	}

	Part.prototype.AddSubPart = function (p) {
		if (!p) return;

		this.subPartList.push(p);

		switch (p.GetPartType()) {
			case ns.PART_TYPE_FORE_ARM:
				p.SetXyz(0.0, -1.2, 0.0);
				break;
			case ns.PART_TYPE_CALF:
				p.SetXyz(0.0, -0.80, 0.0);
				break;
			case ns.PART_TYPE_FOOT:
				p.SetXyz(0.0, -0.35, 0.0);
				break;
			default:
				break;
		}
	};

	Part.prototype.Draw = function () {
		GLC.translatef(this.v_rot_axis.p[0], this.v_rot_axis.p[1], this.v_rot_axis.p[2]);
		DrawManager.Rotate(this.rot_angle, this.v_rot);
		GLC.translatef(-this.v_rot_axis.p[0], -this.v_rot_axis.p[1], -this.v_rot_axis.p[2]);
		DrawManager.Translate(this.v_xyz);

		if (this.numTriangles === 0) {
			GLC.pushMatrix();
			DrawManager.DrawPart(this.partType, this.partSide);
			GLC.popMatrix();
		} else {
			// Never taken: LoadGeometry() zeroes every triangle count, the
			// robot is built entirely from the cubes in draw_manager.
			GLC.begin(GLC.GL_TRIANGLES);
			for (var i = 0; i < this.numTriangles; ++i) {
				GLC.vertex3fv(this.triangles[i].v[0].p);
				GLC.vertex3fv(this.triangles[i].v[1].p);
				GLC.vertex3fv(this.triangles[i].v[2].p);
			}
			GLC.end();
		}

		for (var k = 0; k < this.subPartList.length; ++k) {
			GLC.pushMatrix();
			this.subPartList[k].Draw();
			GLC.popMatrix();
		}
	};

	Part.prototype.Command = function (command) {
		this.partCmd = command;

		switch (this.partCmd) {
			case ns.PART_CMD_MOVE_DEFAULT:
				this.rot_velocity = 0.0;
				if (this.partType === ns.PART_TYPE_FORE_ARM) this.SetRot(0.0, 1.0, 0.0, 0.0);
				if (this.partType === ns.PART_TYPE_TORSO) this.SetRot(0.0, 1.0, 0.0, 0.0);
				break;

			case ns.PART_CMD_MOVE_FORWARD:
				if (this.rot_velocity < 0.001 && this.rot_velocity > -0.001) {
					if ((this.partSide === ns.PART_SIDE_LEFT && this.partType === ns.PART_TYPE_ARM) ||
						(this.partSide === ns.PART_SIDE_RIGHT && this.partType === ns.PART_TYPE_LEG)) {
						this.rot_velocity = -1.0;
					} else {
						this.rot_velocity = 1.0;
					}
				}

				if (this.partType === ns.PART_TYPE_FORE_ARM) {
					if (this.rot_angle < -90.0) this.rot_angle = -90.0;
					else this.rot_angle -= 10.0;

					this.v_rot.p[0] = 1.0;
					this.v_rot.p[1] = 0.0;
					this.v_rot.p[2] = 0.0;
				}
				break;

			case ns.PART_CMD_MOVE_BACKWARD:
				if (this.rot_velocity < 0.001 && this.rot_velocity > -0.001) {
					if (this.partSide === ns.PART_SIDE_LEFT) this.rot_velocity = 1.0;
					else this.rot_velocity = -1.0;
				}
				if (this.partType === ns.PART_TYPE_FORE_ARM) {
					if (this.rot_angle < -30.0) this.rot_angle = -30.0;
					else this.rot_angle -= 10.0;

					this.v_rot.p[0] = 1.0;
					this.v_rot.p[1] = 0.0;
					this.v_rot.p[2] = 0.0;
				}
				break;

			case ns.PART_CMD_TILT_LEFT:
				if (this.partType === ns.PART_TYPE_TORSO) this.SetRot(15.0, 0.0, 1.0, -1.0);
				break;

			case ns.PART_CMD_TILT_RIGHT:
				if (this.partType === ns.PART_TYPE_TORSO) this.SetRot(15.0, 0.0, -1.0, 1.0);
				break;

			case ns.PART_CMD_AIM:
				if (this.partType === ns.PART_TYPE_ARM) this.SetRot(-85.0, 30.0, 0.0, 0.0);
				else if (this.partType === ns.PART_TYPE_FORE_ARM) this.SetRot(0.0, 0.0, 0.0, 0.0);
				break;

			default:
				break;
		}

		for (var i = 0; i < this.subPartList.length; ++i) {
			this.subPartList[i].Command(command);
		}
	};

	Part.prototype.GetPartType = function () { return this.partType; };

	Part.prototype.Move = function () {
		var swing_unit = 0.0;
		var swing_max = 0.0;

		if (this.partType === ns.PART_TYPE_ARM) {
			swing_unit = SWING_UNIT_ARM;
			swing_max = SWING_MAX_ARM;
		} else if (this.partType === ns.PART_TYPE_LEG || this.partType === ns.PART_TYPE_CALF) {
			swing_unit = SWING_UNIT_LEG;
			swing_max = SWING_MAX_LEG;
		}

		switch (this.partType) {
			case ns.PART_TYPE_ARM:
			case ns.PART_TYPE_LEG:
				if (this.rot_velocity > 0.01) {
					this.rot_angle += swing_unit;
					if (this.rot_angle >= swing_max) {
						this.rot_angle = swing_max;
						this.rot_velocity = -1.0;
					}
				} else if (this.rot_velocity < -0.01) {
					this.rot_angle -= swing_unit;
					if (this.rot_angle <= -swing_max) {
						this.rot_angle = -swing_max;
						this.rot_velocity = +1.0;
					}
				} else {
					// swing back to the rest pose
					if (this.rot_angle > 0.01) this.rot_angle -= (swing_unit / 2);
					else if (this.rot_angle < -0.01) this.rot_angle += (swing_unit / 2);

					if (-swing_unit / 2 <= this.rot_angle && this.rot_angle <= swing_unit / 2) {
						this.rot_angle = 0.0;
						this.rot_velocity = 0.0;
					}
				}
				break;

			default:
				break;
		}

		for (var i = 0; i < this.subPartList.length; ++i) {
			this.subPartList[i].Move();
		}
	};

	Part.prototype.SetXyz = function (x, y, z) {
		this.v_xyz.p[0] = x;
		this.v_xyz.p[1] = y;
		this.v_xyz.p[2] = z;
	};

	Part.prototype.SetRotAxis = function (x, y, z) {
		this.v_rot_axis.p[0] = x;
		this.v_rot_axis.p[1] = y;
		this.v_rot_axis.p[2] = z;
	};

	Part.prototype.SetRot = function (angle, x, y, z) {
		this.v_rot.p[0] = x;
		this.v_rot.p[1] = y;
		this.v_rot.p[2] = z;
		this.rot_angle = angle;
	};

	ns.Part = Part;
})(GameLogic);
