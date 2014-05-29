// moment-timezone.js
// version : 0.0.6
// author : Tim Wood
// license : MIT
// github.com/moment/moment-timezone

(function () {
	"use strict";

	var VERSION = "0.0.6";

	function onload(moment) {
		var zones = {},
			links = {};

		if (moment.tz !== undefined) {
			// Do not load moment-timezone a second time.
			return moment;
		}

		function charCodeToInt(charCode) {
			if (charCode > 96) {
				return charCode - 87;
			} else if (charCode > 64) {
				return charCode - 29;
			}
			return charCode - 48;
		}

		function unpackBase60(string) {
			var i = 0,
				parts = string.split('.'),
				whole = parts[0],
				fractional = parts[1] || '',
				multiplier = 1,
				num,
				out = 0,
				sign = 1;

			// handle negative numbers
			if (string.charCodeAt(0) === 45) {
				i = 1;
				sign = -1;
			}

			// handle digits before the decimal
			for (i; i < whole.length; i++) {
				num = charCodeToInt(whole.charCodeAt(i));
				out = 60 * out + num;
			}

			// handle digits after the decimal
			for (i = 0; i < fractional.length; i++) {
				multiplier = multiplier / 60;
				num = charCodeToInt(fractional.charCodeAt(i));
				out += num * multiplier;
			}

			return out * sign;
		}

		function arrayToInt (array) {
			for (var i = 0; i < array.length; i++) {
				array[i] = unpackBase60(array[i]);
			}
		}

		function intToUntil (array) {
			for (var i = 0; i < array.length; i++) {
				array[i] = (array[i - 1] || 0) + (array[i] * 60000); // minutes to milliseconds
			}

			array.push(Infinity);
		}

		function mapIndices (source, indices) {
			var out = [], i;

			for (i = 0; i < indices.length; i++) {
				out[i] = source[indices[i]];
			}

			return out;
		}

		function unpack (string) {
			var data = string.split('|'),
				offsets = data[2].split(' '),
				indices = data[3].split(''),
				untils  = data[4].split(' ');

			arrayToInt(offsets);
			arrayToInt(indices);
			arrayToInt(untils);

			intToUntil(untils);

			return {
				name    : data[0],
				abbrs   : mapIndices(data[1].split(' '), indices),
				offsets : mapIndices(offsets, indices),
				untils  : untils
			};
		}

		function Zone (packedString) {
			var unpacked = unpack(packedString);
			this.name    = unpacked.name;
			this.abbrs   = unpacked.abbrs;
			this.untils  = unpacked.untils;
			this.offsets = unpacked.offsets;
		}

		Zone.prototype = {
			_index : function (timestamp) {
				var target = +timestamp,
					untils = this.untils,
					i;

				for (i = 0; i < untils.length; i++) {
					if (target < untils[i]) {
						return i;
					}
				}
			},

			abbr : function (mom) {
				return this.abbrs[this._index(mom)];
			},

			offset : function (mom) {
				return this.offsets[this._index(mom)];
			}
		};

		/************************************
			Global Methods
		************************************/

		function normalizeName (name) {
			return (name || '').toLowerCase().replace(/\//g, '_');
		}

		function add (packed) {
			var i, zoneString, name;

			if (typeof packed === "string") {
				packed = [packed];
			}

			for (i = 0; i < packed.length; i++) {
				zoneString = packed[i];
				name = normalizeName(zoneString.split('|')[0]);

				zones[name] = new Zone(zoneString);
			}
		}

		function link (data) {
			var i, link;
			for (i = 0; i < data.length; i++) {
				link = data[i].split('|');
				links[normalizeName(link[0])] = normalizeName(link[1]);
			}
		}

		function getZone (name) {
			name = normalizeName(name);

			if (zones[name]) {
				return zones[name];
			}

			if (links[name] && zones[links[name]]) {
				return zones[links[name]];
			}

			return null;
		}

		// overwrite moment.updateOffset
		moment.updateOffset = function (mom, keepTime) {
			var offset;
			if (mom._z) {
				offset = mom._z.offset(mom);
				if (Math.abs(offset) < 16) {
					offset = offset / 60;
				}
				mom.zone(offset, keepTime);
			}
		};

		var fn = moment.fn;

		fn.tz = function (name) {
			if (name) {
				this._z = getZone(name);
				if (this._z) {
					moment.updateOffset(this);
				}
				return this;
			}
			if (this._z) { return this._z.name; }
		};

		function abbrWrap (old) {
			return function () {
				if (this._z) { return this._z.abbr(this); }
				return old.call(this);
			};
		}

		fn.zoneName = abbrWrap(fn.zoneName);
		fn.zoneAbbr = abbrWrap(fn.zoneAbbr);

		// Make sure moment's clone includes the newly added properties
		moment.momentProperties._z = null;

		function tz () {
			var args = [], i, len = arguments.length - 1;
			for (i = 0; i < len; i++) {
				args[i] = arguments[i];
			}
			var m = moment.apply(null, args);
			var preTzOffset = m.zone();
			m.tz(arguments[len]);
			return m.add('minutes', m.zone() - preTzOffset);
		}

		moment.tz = tz;

		tz.version = VERSION;

		tz._zones = zones;

		tz.add = add;
		tz.link = link;
		tz.zone = getZone;

		tz.unpack = unpack;
		tz.unpackBase60 = unpackBase60;

		tz.Zone = Zone;

		tz.zoneExists = function (name) {
			return !!getZone(name);
		};

		return moment;
	}

	if (typeof define === "function" && define.amd) {
		define("moment-timezone", ["moment"], onload);
	} else if (typeof module !== 'undefined') {
		module.exports = onload(require('moment'));
	} else if (typeof window !== "undefined" && window.moment) {
		onload(window.moment);
	}
}).apply(this);
