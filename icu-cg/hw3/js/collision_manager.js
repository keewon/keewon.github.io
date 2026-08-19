// collision_manager.js - port of src/collision_manager.cpp
//
// Bounding box against the walls, plain distance against the other robot.
// Return value: 0 = blocked, 1 = moved but close to something, 2 = free.

var CollisionManager = (function () {
	'use strict';

	var robot = [
		{ x: -100.0, y: -100.0 },
		{ x: 0.0, y: 0.0 },
		{ x: 0.0, y: 0.0 }
	];

	function CheckAndSet(id, x, y) {
		var dx = 0.0, dy = 0.0;
		var result = 0;

		// check collision with wall
		if (!(-8.5 <= x && x <= 9.5 && -8.5 <= y && y <= 9.5)) {
			return 0;
		} else if (!(-7.0 <= x && x <= 8.0 && -7.0 <= y && y <= 8.0)) {
			result = 1;
		}

		if (id === 1) {
			dx = robot[2].x - x;
			dy = robot[2].y - y;
		} else if (id === 2) {
			dx = robot[1].x - x;
			dy = robot[1].y - y;
		}

		if (dx * dx + dy * dy < 3.0) {
			return 0;
		}

		if (id === 1) {
			robot[1].x = x;
			robot[1].y = y;
		} else if (id === 2) {
			robot[2].x = x;
			robot[2].y = y;
		}

		if (result === 1 || dx * dx + dy * dy < 6.0) {
			return 1;
		}
		return 2;
	}

	return { CheckAndSet: CheckAndSet };
})();
