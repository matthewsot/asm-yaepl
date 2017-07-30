function Yaepl(opts) {
    this.options = opts;
    this.options.logHandle = this.options.outHandle || console.log;
    this.options.promptHandle = this.options.promptHandle || function (a, callback) { callback(window.prompt(a)); };
    this.flags = {
        inOp: false
    };
    this.scopes = [ {} ];
    this.currScopeIndex = 0;
    this.currFunc = null;
    this.fullText = [];
}

//These are ops defined on the global scope - you can call them from anywhere
Yaepl.prototype.globalScope = {
    "add": function (a, b) { return a + b; },
    "subtract": function (a, b) { return a - b; },
    "multiply": function (a, b) { return a * b; },
    "divide": function (a, b) { return a / b; },
    "rand-num": function (l, h) { return Math.floor(Math.random() * (h - l)) + l; },
    "str-combine": function (a, b) { return a + b; },
    "copy": function (a) { return a; },
    "write": function (a) { this.options.outHandle(a); },
    "prompt": function (a, callback) { this.options.promptHandle(a, callback); },
    "num-to-str": function (a) { return a.toString(); },
    "str-to-num": function (a) { return parseFloat(a); },
    "len": function (a) { return a.length; },
    "str-len": function (a) { return a.length; },
    "array-new": function () { return []; },
    "array-len": function (a) { return a.length; },
    "array-el": function (a, b) { return a[b]; },
    "array-set-el": function (a, b, i) { a[b] = i; },
    "array-push": function (a, b) { a.push(b); },
    "array-pop": function (a) { return a.pop(); },
    "eq": function (a, b) { return (a === b); },
    "not-eq": function (a, b) { return (a !== b); },
    "not": function (a) { return !a; },
    "lt": function (a, b) { return (a < b); },
    "lt-eq": function (a, b) { return (a <= b); },
    "gt": function (a, b) { return (a > b); },
    "gt-eq": function (a, b) { return (a >= b); },
    "or": function (a, b) { return (a || b); },
    "and": function (a, b) { return (a && b); },
    "jump-bwd": function (b) {
        for (var i = b.targetIndex; i < this.fullText.length; i++) {
            this.interpretLine(this.fullText[i], function () {}, false);
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

//These are the ops that use callbacks
Yaepl.prototype.callbackOps = [ "prompt" ];

//Splits a YAEPL parameter string into a list of different
//string YAPEL parameters. Does NOT evaluate them - they're
//all strings
Yaepl.prototype.splitParams = function (params) {
    var split_params = [];

    var curr_param = "";
    var flags = { quote: null, escaped: false };
    for (var i = 0; i < params.length; i++) {
        var chr = params[i];
        curr_param += chr;

        if (flags.escaped) {
            flags.escaped = false;
            continue;
        }

        flags.escaped = (chr == "\\");
        if (flags.escaped) {
            //curr_param = curr_param.substring(0, curr_param.length - 1);
        }
        else if (chr === flags.quote) {
            flags.quote = null;
        }
        else if (chr == "\"" || chr == "'") {
            flags.quote = chr;
        }
        else if (flags.quote === null && chr == " ") {
            split_params.push(curr_param.trim());
            curr_param = "";
        }
    }
    if (curr_param.trim().length > 0) {
        split_params.push(curr_param.trim());
    }
    return split_params;
};
//Converts parameter strings to their actual values
Yaepl.prototype.evaluateParams = function (op, line, params) {
    //The final param for a jump op is the label, we store that as a string
    //since it might not be in the scope yet (if it's a jump-fwd)
    var isJump = [ "jump-fwd", "jump-fwd-if", "jump", "jump-if" ].indexOf(op) > -1;
    var end = isJump ? 1 : 0;

    for (var p = 0; p < params.length - end; p++) {
        if (params[p].startsWith("'") || params[p].startsWith("\"") || !isNaN(parseInt(params[p])) || params[p] == "[]") {
            params[p] = eval(params[p]);
        }
        else {
            params[p] = this.scopes[this.currScopeIndex][params[p]];
        }
    }
    return params;
};

//Reads a single line and completely interprets it. Note that this
//may involved the evaluation of previous lines, if it includes a
//jump operation or a custom operation.
Yaepl.prototype.interpretLine = function (line, callback, addToHistory) {
    line = line.replace(/\s/, " ").trim();
    if (addToHistory !== false) {
        this.fullText.push(line);
    }

    if (line.indexOf("//") > -1) {
        line = line.substring(0, line.indexOf("//")).trim();
    }

    if (line.length == 0) {
        return callback();
    }

    //Handle the start of custom ops
    if (line.startsWith("@") && line.indexOf("@end") == -1) {
        this.flags.inOp = true;
        var name = line.split(" ")[0];

        //Break up the parameters of the functions
        //into a list
        var params = line.substring(name.length).trim().split(":")[0];
        params = (params == "") ? [] : params.split(" ");
        
        this.currFunc = {
            name: name.substring(1),
            params: params,
            contents: [ ],
            type: "function"
        };

        return callback();
    }
    //Handles the insides of custom ops
    if (this.flags.inOp) {
        this.currFunc.contents.push(line);
        return callback();
    }
    //Handles the end of custom ops
    if (this.flags.inOp && line.indexOf("@end") > -1) {
        this.flags.inOp = false;
        this.scopes[this.currScopeIndex][this.currFunc.name] = this.currFunc;
        return callback();
    }

    //Handle code labels
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
    //If we're waiting to reach a label don't do anything
    if (this.flags.jumpingFwd) {
        return callback();
    }

    //Now we deal with actual lines that evaluate
    var op = line.split(" ")[0];
    var params = this.splitParams(line.substring(op.length).split("->")[0].trim());
    params = this.evaluateParams(op, line, params);

    var storeIn = line.split("->");
    storeIn = (storeIn.length > 1) ? storeIn[1].trim() : null;

    //Global-scope operations
    if (this.globalScope[op] != undefined && this.callbackOps.indexOf(op) == -1) {
        var ret = this.globalScope[op].apply(this, params);
        if (storeIn != null) {
            this.scopes[this.currScopeIndex][storeIn] = ret;
        }
        return callback();
    }
    //Global-scope callback operations
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
    //Custom ops
    if (this.scopes[this.currScopeIndex][op] != undefined) {
        var item = this.scopes[this.currScopeIndex][op];
        var prevScopeIndex = this.currScopeIndex;

        //Build a new scope for the function to execute in
        //and add the arguments
        var newScope = {};
        for (var i = 0; i < item.params.length; i++) {
            newScope[item.params[i]] = (i < params.length) ? params[i] : undefined;
        }

        //In another scope, run the function line-by-line
        this.scopes.push(newScope);
        this.currScopeIndex = this.scopes.length - 1;
        var ret = null;
        for (var i = 0; i < item.contents.length; i++) {
            ret = this.interpretLine(item.contents[i]);
        }

        //Now remove the old scope
        this.scopes.splice(this.currScopeIndex, 1);
        this.currScopeIndex = prevScopeIndex;

        //Back to our scope
        if (storeIn != null) {
            this.scopes[this.currScopeIndex][storeIn] = ret;
        }
    }
    //Return op
    if (op == "return") {
        callback(params[0]);
        return params[0];
    }
};
