function Yaepl(opts) {
    this.options = opts;
    this.options.log = this.options.log || console.log;
    this.flags = {
        inFunc: false
    };
    this.scopes = [ {} ];
    this.currScopeIndex = 0;
    this.currFunc = null;
    this.fullText = [];
}
Yaepl.prototype.globalScope = {
    "add": function (a, b) { return a + b; },
    "copy": function (a) { return a; },
    "write-line": function (a) { this.options.log(a); },
    "num-to-str": function (a) { return a.toString(); },
    "str-to-num": function (a) { return parseFloat(a); },
    "str-len": function (a) { return a.length; },
    "array-len": function (a) { return a.length; },
    "array-el": function (a, b) { return a[b]; },
    "array-push": function (a, b) { a.push(b); },
    "array-pop": function (a) { return a.pop(); },
    "eq": function (a, b) { return (a == b); },
    "not-eq": function (a, b) { return (a != b); },
    "lt": function (a, b) { return (a < b); },
    "lt-eq": function (a, b) { return (a <= b); },
    "gt": function (a, b) { return (a > b); },
    "gt-eq": function (a, b) { return (a >= b); },
    "jump-if": function (a, b) {
        if (a) {
            var label = this.scopes[this.currScopeIndex][b];
        }
    }
};
Yaepl.prototype.splitParams = function (params) {
    var split_params = [];
    var curr_param = "";
    var in_dbl_quotes = false;
    var in_single_quotes = false;
    var escaped = false;
    for (var i = 0; i < params.length; i++) {
        var chr = params[i];
        curr_param += chr;
        if (escaped) {
            escaped = false;
            continue;
        }
        if (chr == "\\") {
            escaped = true;
            true;
        }
        if (in_dbl_quotes && chr == '"') {
            in_dbl_quotes = false;
            split_params.push(curr_param);
            curr_param = "";
            continue;
        }
        if (in_single_quotes && chr == "'") {
            in_single_quotes = false;
            split_params.push(curr_param);
            curr_param = "";
            continue;
        }
        if (!in_single_quotes && !in_dbl_quotes && chr == '"') {
            in_dbl_quotes = true;
            continue;
        }
        if (!in_single_quotes && !in_dbl_quotes && chr == "'") {
            in_single_quotes = true;
            continue;
        }
        if (!in_single_quotes && !in_dbl_quotes && chr == " ") {
            split_params.push(curr_param.trim());
            curr_param = "";
        }
    }
    if (curr_param.trim().length > 0) {
        split_params.push(curr_param.trim());
    }
    return split_params;
};
Yaepl.prototype.interpretLine = function (line) {
    this.fullText.push(line);
    line = line.trim();
    if (line.startsWith("@") && line.indexOf("@end") == -1) {
        this.flags.inFunc = true;
        var name = line.split(" ")[0];
        var params = line.split(name)[1].trim().split(":")[0];
        if (params != "") {
            params = params.split(" ");
        } else {
            params = [ ];
        }
        this.currFunc = {
            name: name,
            params: params,
            contents: [ ],
            type: "function"
        };
        return;
    }
    if (this.flags.inFunc && line.indexOf("@end") > -1) {
        this.flags.inFunc = false;
        this.scopes[this.currScopeIndex][this.currFunc.name] = this.currFunc;
        return;
    }
    if (this.flags.inFunc) {
        this.currFunc.contents.push(line);
        return;
    }
    if (line.startsWith("#")) {
        this.scopes[this.currScopeIndex][line.split(":")[0]] = {
            name: line.split(":")[0],
            targetIndex: this.fullText.length - 1 + 1, //Set the jump target to the line after the label
            type: "label"
        };
        return;
    }
    var op = line.split(" ")[0];
    var params = this.splitParams(line.substring(op.length).split("->")[0].trim());
    for (var p = 0; p < params.length; p++) {
        if (params[p].startsWith("$") || params[p].startsWith("#")) {
            params[p] = this.scopes[this.currScopeIndex][params[p]];
        } else {
            params[p] = eval(params[p]);
        }
    }
    var storeIn = line.split("->");
    if (storeIn.length > 1) {
        storeIn = storeIn[1].trim();
    } else {
        storeIn = null;
    }
    if (this.globalScope[op] != undefined) {
        var ret = this.globalScope[op].apply(this, params);
        if (storeIn != null) {
            this.scopes[this.currScopeIndex][storeIn] = ret;
        }
    }
};
