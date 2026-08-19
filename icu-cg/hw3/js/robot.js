// robot.js - port of src/robot.{h,cpp}

var GameLogic = GameLogic || {};

(function (ns) {
	'use strict';

	var Vertex = LinearAlgebra.Vertex;

	// file-static in robot.cpp, so shared by every robot
	var ai_move_to = 0;
	var ai_turn_to = 0;
	var ai_frame = 0;

	var user_light_left = 1;
	var user_light_right = 1;

	function Robot(id) {
		var f = ns.g_PartFactory;

		this.id = id;
		this.head = f.MakePart(ns.PART_TYPE_HEAD, ns.PART_SIDE_CENTER);
		this.body = f.MakePart(ns.PART_TYPE_TORSO, ns.PART_SIDE_CENTER);
		this.arm0 = f.MakePart(ns.PART_TYPE_ARM, ns.PART_SIDE_LEFT);
		this.arm1 = f.MakePart(ns.PART_TYPE_ARM, ns.PART_SIDE_RIGHT);
		this.leg0 = f.MakePart(ns.PART_TYPE_LEG, ns.PART_SIDE_LEFT);
		this.leg1 = f.MakePart(ns.PART_TYPE_LEG, ns.PART_SIDE_RIGHT);

		this.head.SetXyz(0.0, 1.2, 0.0);
		this.arm0.SetXyz(1.2, 1.0, 0.0);
		this.arm1.SetXyz(-1.2, 1.0, 0.0);
		this.leg0.SetXyz(0.6, -0.2, 0.0);
		this.leg1.SetXyz(-0.6, -0.2, 0.0);

		this.arm0.SetRot(0.0, 1.0, 0.0, 0.0);
		this.arm1.SetRot(0.0, 1.0, 0.0, 0.0);
		this.leg0.SetRot(0.0, 1.0, 0.0, 0.0);
		this.leg1.SetRot(0.0, 1.0, 0.0, 0.0);

		this.body.AddSubPart(this.head);
		this.body.AddSubPart(this.arm0);
		this.body.AddSubPart(this.arm1);
		this.body.AddSubPart(this.leg0);
		this.body.AddSubPart(this.leg1);

		this.v_xyz = new Vertex(0.0, 0.0, 0.0);
		this.v_rot = new Vertex(0.0, 1.0, 0.0);

		this.rot_angle = 0.0;
		this.vel_move = 0.0;
		this.vel_turn = 0.0;

		this.alcohol = false;
		this.arm_aim = [0, 0];
	}

	Robot.prototype.Move = function (velocity) { this.vel_move = velocity; };
	Robot.prototype.Turn = function (velocity) { this.vel_turn = velocity; };

	Robot.prototype.SetXyz = function (x, y, z) {
		this.v_xyz.p[0] = x; this.v_xyz.p[1] = y; this.v_xyz.p[2] = z;
	};

	Robot.prototype.Draw = function () {
		DrawManager.Translate(this.v_xyz);
		DrawManager.Rotate(this.rot_angle, this.v_rot);

		GLC.pushMatrix();
		DrawManager.state.robot_id = this.id;
		this.body.Draw();
		GLC.popMatrix();
		DrawManager.state.robot_id = 0;
	};

	Robot.prototype.DrinkAlcohol = function () {
		this.alcohol = !this.alcohol;
		DrawManager.state.alcohol = this.alcohol;
	};

	Robot.prototype.PerFrame = function () {
		// Process Rotation
		this.rot_angle += this.vel_turn;

		if (this.rot_angle < 0.0) this.rot_angle += 360.0;
		else if (this.rot_angle >= 360.0) this.rot_angle -= 360.0;

		// move when the feet are on the ground
		if (this.leg0.rot_angle <= 15.0 && this.leg0.rot_angle >= -15.0) {
			var x_next = this.v_xyz.p[0] + (this.vel_move * Math.sin(this.rot_angle / 180.0 * Math.PI));
			var z_next = this.v_xyz.p[2] + (this.vel_move * Math.cos(this.rot_angle / 180.0 * Math.PI));

			var collision = CollisionManager.CheckAndSet(this.id, x_next, z_next);

			if (collision === 2 || collision === 1) {
				this.v_xyz.p[0] = x_next;
				this.v_xyz.p[2] = z_next;
			} else {
				if (this.id === 2) ai_move_to = -ai_move_to;
			}

			// close to something: blink the lanterns like a warning light
			if (collision === 0 || collision === 1) {
				if (this.id === 1) {
					user_light_left = 0;
					user_light_right = 0;

					if (Math.floor(ai_frame / 10) % 2 === 0) {
						GLC.enableLight(2);
						GLC.disableLight(3);
					} else {
						GLC.enableLight(3);
						GLC.disableLight(2);
					}
				}
			} else {
				if (this.id === 1) {
					user_light_left = 1;
					user_light_right = 1;

					GLC.enableLight(3);
					GLC.enableLight(2);
				}
			}
		}

		if (this.alcohol) {
			if (this.leg0.rot_angle > 1.0) {
				this.body.Command(ns.PART_CMD_TILT_LEFT);
			} else if (this.leg1.rot_angle > 1.0) {
				this.body.Command(ns.PART_CMD_TILT_RIGHT);
			}
		}

		if (this.vel_move > 0.01) {
			this.body.Command(ns.PART_CMD_MOVE_FORWARD);
		} else if (this.vel_move < -0.01) {
			this.body.Command(ns.PART_CMD_MOVE_BACKWARD);
		} else {
			this.body.Command(ns.PART_CMD_MOVE_DEFAULT);
		}

		if (this.vel_turn > 0.01) {
			this.body.Command(ns.PART_CMD_TURN_LEFT);
		} else if (this.vel_turn < -0.01) {
			this.body.Command(ns.PART_CMD_TURN_RIGHT);
		}

		this.vel_turn = 0.0;
		this.vel_move = 0.0;

		this.body.Move();

		if (this.arm_aim[0]) this.arm0.Command(ns.PART_CMD_AIM);
		if (this.arm_aim[1]) this.arm1.Command(ns.PART_CMD_AIM);
	};

	// the second robot wanders around on its own, permanently drunk
	Robot.prototype.MoveSelf = function () {
		this.alcohol = true;

		if (ai_frame % 120 === 0) {
			switch (Math.floor(ai_frame / 120) % 5) {
				case 0: ai_turn_to = 2.0; ai_move_to = 0.2; break;
				case 1: ai_turn_to = 0.0; ai_move_to = 0.2; break;
				case 2: ai_turn_to = -2.0; ai_move_to = 0.2; break;
				case 3: ai_turn_to = 0.0; ai_move_to = -0.2; break;
				case 4: ai_turn_to = 2.0; ai_move_to = -0.2; break;
			}
		}

		this.Move(ai_move_to);
		this.Turn(ai_turn_to);

		ai_frame++;
	};

	ns.Robot = Robot;
})(GameLogic);
