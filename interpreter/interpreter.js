function Yaepl(opts) {
    this.options = opts;
    this.flags = {
        inFunc = false
    };
    this.scopes = [ {} ];
    this.currScopeIndex = 0;
    this.currFunc = null;
    this.fullText = [];
}
Yaepl.prototype.globalScope = {
    "add": function (a, b) { return a + b; }
};
Yaepl.prototype.interpretLine(line) {
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
    var params = line.split(" ")[1].split("->")[0].trim().split(" ");
    for (var p = 0; p < params.length; p++) {
        params[0] = this.scopes[this.currScopeIndex][params[0]];
    }
    var storeIn = line.split("->");
    if (storeIn.length > 1) {
        storeIn = storeIn[1].trim();
    } else {
        storeIn = null
    }
    if (this.globalScope[op] != undefined) {
        var ret = this.globalScope[op].apply(this, params);
        if (storeIn != null) {
            this.scopes[this.currScopeIndex][storeIn] = ret;
        }
    }
};
