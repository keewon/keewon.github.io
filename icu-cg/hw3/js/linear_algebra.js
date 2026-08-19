// linear_algebra.js - port of src/linear_algebra.{h,cpp}

var LinearAlgebra = (function () {
	'use strict';

	function Vertex(a, b, c) {
		this.p = [a || 0.0, b || 0.0, c || 0.0];
	}

	function Triangle(a, b, c) {
		this.v = [a || new Vertex(), b || new Vertex(), c || new Vertex()];
	}

	return { Vertex: Vertex, Triangle: Triangle };
})();
