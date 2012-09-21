// moment-timezone.js
// version : 0.0.1
// author : Tim Wood
// license : MIT
// github.com/timrwood/moment-timezone

(function () {

	var moment = require('moment'),

		momentTZ,

		rules = {},
		ruleSets = {},
		zones = {},
		zoneSets = {};

	/************************************
		Rules
	************************************/

	/*
	 * Rule
	 *
	 * @param _name    The string identifier for the timezone name (eg. US, NYC, Mexico...)
	 * @param _from    The start year
	 * @param _to      The end year (if falsy, will use the start year)
	 * @param _in      The month to start on (zero indexed)
	 * @param _on      The day to start on. A colon separated tuple of a letter and a number
	 *                 eg. "l:1", "e:20", "f:1"
	 *                 "l" The last on this day of week (while num > 7, skip a week)
	 *                 "f" The first of this day of week (while num > 7, skip a week)
	 *                 "e" This exact date of the month
	 * @param _at      The number of minutes into the day that the change happens on
	 * @param _offset  The number of minutes to add to the offset. Usually 60 or 0
	 * @param _letters The string to replace the Zone format string with
	 */
	function Rule (_name, _from, _to, _in, _on, _at, _offset, _letters) {
		this._name    = _name;
		this._from    = +_from;
		this._to      = +_to;
		this._month   = +_in;

		this._dayVal  = +_on;
		if (_on.indexOf(':') > -1) {
			_on = _on.split(':');
			this._dowVal = +_on[0];
			this._dayVal = +_on[1];
			this._dateForYear = Rule.prototype._dateForYearFirst;
		} else if (this._dayVal < 1) {
			this._dayVal = -this._dayVal;
			this._dateForYear = Rule.prototype._dateForYearLast;
		}

		this._time    = +_at;
		this._offset  = +_offset;
		this._letters = _letters;
	}

	Rule.prototype = {
		contains : function (mom) {
			var year = mom.year(),
				month = mom.month();
			// if the year is out of range, it did not apply
			if (year < this._from || year > this._to) {
				return false;
			}
			// if the moment is earlier than the start date...
			if (mom < this._momentForYear(year)) {
				// if the rule applied last year, it applies all of this year too
				if (year > this._from) {
					return true;
				}
				// the moment is too early for this year
				return false;
			}
			return true;
		},

		letters : function () {
			return this._letters;
		},

		_momentForYear : function (year) {
			return moment([year, this._month, this._dateForYear(year)]);
		},

		// this method overwrites _dateForYear if it uses the first day of week method
		_dateForYearFirst : function (year) {
			var day = this._dayVal,
				dow = this._dowVal,
				firstDayOfWeek = moment([year, this._month, 1]).day(),
				output = this._dowVal + 1 - firstDayOfWeek;

			while (output < day) {
				output += 7;
			}

			return output;
		},

		// this method overwrites _dateForYear if it uses the last day of week method
		_dateForYearLast : function (year) {
			var day = this._dayVal,
				dow = day % 7,
				lastDowOfMonth = moment([year, this._month + 1, 0]).day(),
				daysInMonth = moment([year, this._month, 1]).daysInMonth(),
				output = daysInMonth + (dow - (lastDowOfMonth - 1)) - (~~(day / 7) * 7);

			if (dow >= lastDowOfMonth) {
				output -= 7;
			}
			return output;
		},

		_dateForYear : function (year) {
			return this._dayVal;
		}
	};

	/************************************
		Rule Sets
	************************************/

	function RuleSet (_name) {
		this._name = _name;
		this._rules = [];
	}

	RuleSet.prototype = {
		_pickRule : function (startRule, endRule, mom) {
			var tmp,
				start, end,
				year = mom.year();

			if (!endRule) {
				return startRule;
			}

			start = startRule._momentForYear(year);
			end = endRule._momentForYear(year);

			if (start > end) {
				tmp = start;
				start = end;
				end = tmp;
			}

			if (mom < start || mom >= end) {
				return endRule;
			}
			return startRule;
		},

		add : function (rule) {
			this._rules.push(rule);
		},

		rule : function (mom) {
			var i, startRule, endRule;
			for (i = 0; i < this._rules.length; i++) {
				if (this._rules[i].contains(mom)) {
					if (startRule) {
						endRule = this._rules[i];
					} else {
						startRule = this._rules[i];
					}
				}
			}

			return this._pickRule(startRule, endRule, mom);
		}
	};

	/************************************
		Zone
	************************************/

	function Zone (_name, _offset, _ruleSet, _format, _until) {
		this._name = _name;
		this._offset = +_offset;

		this._ruleSet = getRuleSet(_ruleSet);

		this._format = _format;
		this._until = +_until || 9999;
	}

	Zone.prototype = {
		contains : function (mom) {
			if (mom.year() <= this._until) {
				return true;
			}
			return false;
		},

		ruleSet : function () {
			return this._ruleSet;
		}
	};

	/************************************
		Zone Set
	************************************/

	function sortZones (a, b) {
		var diff = moment(a._until) - moment(b._until);
		if (diff > 0) {
			return 1;
		}
		if (diff < 0) {
			return -1;
		}
		return 0;
	}

	function ZoneSet (_name) {
		this._name = _name;
		this._zones = [];
	}

	ZoneSet.prototype = {
		_zone : function (mom) {
			var i, zone;
			for (i = 0; i < this._zones.length; i++) {
				if (this._zones[i].contains(mom)) {
					return this._zones[i];
				}
			}
		},

		rule : function (mom) {
			return this._zone(mom)._ruleSet.rule(mom);
		},

		add : function (zone) {
			this._zones.push(zone);
			this._zones.sort(sortZones);
		},

		name : function () {
			return this._name;
		},

		format : function (mom) {
			var zone = this._zone(mom),
				rule = zone._ruleSet.rule(mom);
			return zone._format.replace("%s", rule.letters());
		},

		offset : function (mom) {
			var zone = this._zone(mom),
				rule = zone._ruleSet.rule(mom);
			return zone._offset + rule._offset;
		}
	};

	/************************************
		Global Methods
	************************************/

	function addRules (rulesArray) {
		var i;
		for (i = 0; i < rulesArray.length; i++) {
			addRule(rulesArray[i]);
		}
	}

	function addRule (ruleString) {
		// don't duplicate rules
		if (rules[ruleString]) {
			return rules[ruleString];
		}

		var p = ruleString.split(','),
			name = p[0],
			rule = new Rule(name, p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);

		// cache the rule so we don't add it again
		rules[ruleString] = rule;

		// add to the ruleset
		getRuleSet(name).add(rule);

		return rule;
	}

	function addZone (zoneString) {
		// don't duplicate zones
		if (zones[zoneString]) {
			return zones[zoneString];
		}

		var p = zoneString.split(','),
			name = p[0],
			zone = new Zone(name, p[1], p[2], p[3], p[4]);

		// cache the zone so we don't add it again
		zones[zoneString] = zone;

		// add to the zoneset
		getZoneSet(name).add(zone);

		return zone;
	}

	function getRuleSet (name) {
		if (!ruleSets[name]) {
			ruleSets[name] = new RuleSet(name);
		}
		return ruleSets[name];
	}

	function getZoneSet (name) {
		if (!zoneSets[name]) {
			zoneSets[name] = new ZoneSet(name);
		}
		return zoneSets[name];
	}

	module.exports = {
		addRule : addRule,
		addRules : addRules,
		getRuleSet : getRuleSet,
		addZone : addZone,
		getZoneSet : getZoneSet
	};

}).apply(this);
