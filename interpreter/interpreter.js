function Yaepl(opts) {
    this.options = opts;
    this.options.logHandle = this.options.outHandle || console.log;
    this.options.promptHandle = this.options.promptHandle || function (a, callback) { callback(window.prompt(a)); };
    this.flags = {
        inFunc: false
    };
    this.scopes = [ {} ];
    this.currScopeIndex = 0;
    this.currFunc = null;
    this.fullText = [];
}
Yaepl.prototype.callbackOps = [ "prompt-str" ];
Yaepl.prototype.globalScope = {
    "add": function (a, b) { return a + b; },
    "subtract": function (a, b) { return a - b; },
    "multiply": function (a, b) { return a * b; },
    "divide": function (a, b) { return a / b; },
    "str-combine": function (a, b) { return a + b; },
    "copy": function (a) { return a; },
    "write-str": function (a) { this.options.outHandle(a); },
    "prompt-str": function (a, callback) { this.options.promptHandle(a, callback); },
    "num-to-str": function (a) { return a.toString(); },
    "str-to-num": function (a) { return parseFloat(a); },
    "len": function (a) { return a.length; },
    "str-len": function (a) { return a.length; },
    "array-len": function (a) { return a.length; },
    "array-el": function (a, b) { return a[b]; },
    "array-set-el": function (a, b, i) { a[b] = i; },
    "array-push": function (a, b) { a.push(b); },
    "array-pop": function (a) { return a.pop(); },
    "eq": function (a, b) { return (a == b); },
    "not-eq": function (a, b) { return (a != b); },
    "not": function (a) { return !a; },
    "lt": function (a, b) { return (a < b); },
    "lt-eq": function (a, b) { return (a <= b); },
    "gt": function (a, b) { return (a > b); },
    "gt-eq": function (a, b) { return (a >= b); },
    "or": function (a, b) { return (a || b); },
    "and": function (a, b) { return (a && b); },
    "jump-bwd": function (b) {
        for (var i = b.targetIndex; i < this.fullText.length; i++) {
            this.interpretLine(this.fullText[i], false);
        }
    },
    "jump-bwd-if": function (a, b) {
        if (!a) return;
        this.globalScope["jump-bwd"].call(this, b);
    },
    "jump-fwd": function (l) {
        this.flags.jumpingFwd = true;
        this.jumpFwdUntil = l;
    },
    "jump-fwd-if": function (a, l) {
        if (!a) return;
        this.globalScope["jump-fwd"].call(this, l);
    },
    "jump": function (l) {
        var label_target = this.scopes[this.currScopeIndex][l];
        if (label_target == undefined) {
            this.globalScope["jump-fwd"].call(this, l);
            return;
        }
        this.globalScope["jump-bwd"].call(this, label_target);
    },
    "jump-if": function (a, l) {
        if (!a) return;
        this.globalScope["jump"].call(this, l);
    }
};
Yaepl.prototype.splitParams = function (params) {
    var split_params = params.split(" ");
    var split_params = [];
    var curr_param = "";
    var flags = { dbl_quotes: false, single_quotes: false, escaped: false };
    for (var i = 0; i < params.length; i++) {
        var chr = params[i];
        curr_param += chr;
        if (flags.escaped) {
            flags.escaped = false;
            continue;
        }
        flags.escaped = (chr == "\\");
        if (flags.escaped) {
            curr_param = curr_param.substring(0, curr_param.length - 1);
        }
        else if ((flags.dbl_quotes && chr == '"') || (flags.single_quotes && chr == "'")) {
            flags.dbl_quotes = false;
            flags.single_quotes = false;
            split_params.push(curr_param);
            curr_param = "";
        }
        else if (!flags.single_quotes && chr == '"') {
            flags.dbl_quotes = true;
        }
        else if (!flags.dbl_quotes && chr == "'") {
            flags.single_quotes = true;
        }
        else if (!flags.single_quotes && !flags.dbl_quotes && chr == " ") {
            split_params.push(curr_param.trim());
            curr_param = "";
        }
    }
    if (curr_param.trim().length > 0) {
        split_params.push(curr_param.trim());
    }
    return split_params;
};
Yaepl.prototype.interpretLine = function (line, callback, addToHistory) {
    line = line.replace(/\s/, " ");
    if (addToHistory !== false) this.fullText.push(line);
    var startComment = line.indexOf("//");
    if (startComment > -1) {
        line = line.substring(0, startComment);
    }
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
            name: name.substring(1),
            params: params,
            contents: [ ],
            type: "function"
        };
        return callback();
    }
    if (this.flags.inFunc && line.indexOf("@end") > -1) {
        this.flags.inFunc = false;
        this.scopes[this.currScopeIndex][this.currFunc.name] = this.currFunc;
        return callback();
    }
    if (this.flags.inFunc) {
        this.currFunc.contents.push(line);
        return callback();
    }
    if (line.startsWith("#")) {
        this.scopes[this.currScopeIndex][line.split(":")[0]] = {
            name: line.split(":")[0],
            targetIndex: this.fullText.length - 1 + 1, //Set the jump target to the line after the label
            type: "label"
        };
        if (this.flags.jumpingFwd && line.split(":")[0] == this.jumpFwdUntil) {
            this.flags.jumpingFwd = false;
            this.jumpFwdUntil = false;
        }
        return callback();
    }
    if (this.flags.jumpingFwd) {
        return callback();
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
    if ([ "jump-fwd", "jump-fwd-if", "jump", "jump-if" ].indexOf(op) > -1) {
        params[params.length - 1] = this.splitParams(line.substring(op.length).split("->")[0].trim())[params.length - 1];
    }
    var storeIn = line.split("->");
    if (storeIn.length > 1) {
        storeIn = storeIn[1].trim();
    } else {
        storeIn = null;
    }
    if (this.globalScope[op] != undefined && this.callbackOps.indexOf(op) == -1) {
        var ret = this.globalScope[op].apply(this, params);
        if (storeIn != null) {
            this.scopes[this.currScopeIndex][storeIn] = ret;
        }
        return callback();
    }
    if (this.globalScope[op] != undefined && this.callbackOps.indexOf(op) != -1) {
        params.push(function (callback, ret) {
            if (storeIn != null) {
                this.scopes[this.currScopeIndex][storeIn] = ret;
            }
            callback();
        }.bind(this, callback));
        var ret = this.globalScope[op].apply(this, params);
        return;
    }
    if (this.scopes[this.currScopeIndex][op] != undefined) {
        var item = this.scopes[this.currScopeIndex][op];
        var prevScopeIndex = this.currScopeIndex;
        var newScope = {};
        for (var i = 0; i < item.params.length; i++) {
            if (i < params.length) {
                newScope[item.params[i]] = params[i];
            } else { //Technically we could just do params.length and ignore this if (as they'd be undefined by default), but that feels wrong
                newScope[item.params[i]] = undefined;
            }
        }
        //In another scope
        this.scopes.push(newScope);
        this.currScopeIndex = this.scopes.length - 1;
        var ret = null;
        for (var i = 0; i < item.contents.length; i++) {
            ret = this.interpretLine(item.contents[i]);
        }
        this.scopes.splice(this.currScopeIndex, 1);
        this.currScopeIndex = prevScopeIndex;
        //Back to our scope
        if (storeIn != null) {
            this.scopes[this.currScopeIndex][storeIn] = ret;
        }
    }
    if (op == "return") {
        callback(params[0]);
        return params[0];
    }
};
