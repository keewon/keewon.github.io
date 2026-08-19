// part_factory.js - port of src/part_factory.{h,cpp}

var GameLogic = GameLogic || {};

(function (ns) {
	'use strict';

	var g_partNames = [
		'NONE', 'HEAD', 'TORSO', 'BREAST', 'ARM', 'UP_ARM', 'FOREARM',
		'LEG', 'THIGH', 'CALF', 'FOOT', 'HIP'
	];

	// Both stay empty: every part is drawn as a scaled cube by draw_manager,
	// the triangle-soup path was never filled in.
	var g_partNumTriangles = [];
	var g_partTriangles = [];

	function LoadGeometry() {
		for (var i = 0; i < ns.PART_TYPE_END; ++i) {
			g_partNumTriangles[i] = 0;
			g_partTriangles[i] = null;
		}
	}

	// FIXME (from the original): assume that every part has only one sub part.
	function GetSubPartType(parent) {
		switch (parent) {
			case ns.PART_TYPE_ARM: return ns.PART_TYPE_FORE_ARM;
			case ns.PART_TYPE_LEG: return ns.PART_TYPE_CALF;
			case ns.PART_TYPE_CALF: return ns.PART_TYPE_FOOT;
			default: break;
		}
		return ns.PART_TYPE_NONE;
	}

	function PartFactory() {
		this.partList = [];
	}

	PartFactory.prototype.MakePart = function (partType, partSide) {
		if (partType <= ns.PART_TYPE_NONE || partType >= ns.PART_TYPE_END) return null;

		var p = new ns.Part(
			partType,
			g_partNames[partType],
			g_partNumTriangles[partType] || 0,
			g_partTriangles[partType],
			partSide
		);

		this.partList.push(p);

		var subPartType = GetSubPartType(partType);
		if (subPartType !== ns.PART_TYPE_NONE) {
			p.AddSubPart(this.MakePart(subPartType, partSide));
		}

		return p;
	};

	ns.PartFactory = PartFactory;
	ns.g_PartFactory = new PartFactory();
	ns.LoadGeometry = LoadGeometry;
})(GameLogic);
