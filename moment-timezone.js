// moment-timezone.js
// version : 0.0.1
// author : Tim Wood
// license : MIT
// github.com/timrwood/moment-timezone

(function () {

    var momentTZ,

        rules = [],
        zoneRules = [],
        zones = {};

    /************************************
        Rules
    ************************************/

    function Rule (_name, _from, _to, _type, _in, _on, _at, _save, _letters) {
        this._name    = _name;
        this._from    = _from;
        this._to      = _to;
        this._type    = _type;
        this._in      = _in;
        this._on      = _on;
        this._at      = _at;
        this._save    = _save;
        this._letters = _letters;
    }

    Rule.prototype = {

    };

    /************************************
        ZoneRules
    ************************************/

    function ZoneRule (_name, _offset, _rule, _format, _until) {
        this._name = _name;
    }

    ZoneRule.prototype = {

    };

    /************************************
        Zones
    ************************************/

    function Zone (_name) {

    }

    Zone.prototype = {

    };

    /************************************
        Global Methods
    ************************************/

    function addRules (rulesArray) {
        var i;
        for (i = 0; i < rulesArray.length; i++) {
            addRule(rulesArray[i]);
        }
        console.log(rules);
    }

    function addRule (ruleString) {
        var p = ruleString.split(',');
        rules.push(new Rule(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9]) );
    }

    module.exports = {

    };

    var na = require('./data/js/northamerica');
    addRules(na.rules);

}).apply(this);
