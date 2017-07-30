/* Example definition of a simple mode that understands a subset of
 * JavaScript:
 */

keywords = [ '->' ]
CodeMirror.defineMode("yaepl", function (){
    handleStr = function (stream, chr) {
        stream.next();
        match = new RegExp("[^" + chr + "\\\\]");
        stream.eatWhile(match);
        while (stream.peek() == "\\") {
            stream.next();
            stream.next();
            eaten = stream.eatWhile(match);
        }
        stream.next();
        return "string";
    };
    return {
        startState: function() { return { s_qt: false, d_qt: false} },
        token: function(stream, state) {
            console.log(stream.current())
            if (stream.peek() == "/") {
                stream.next();
                if (stream.next() == "/") {
                    stream.eatWhile(/./);
                    return "comment";
                }
                else {
                    stream.backUp(2);
                }
            }
            if (stream.peek() == "'" || stream.peek() == "\"") {
                return handleStr(stream, stream.peek());
            }
            if (stream.sol()) {
                stream.eatWhile(/\s/);
                stream.eatWhile(/[^\s]/);
                return "keyword function name";
            }
            stream.eatWhile(/[^\s]/);
            if (keywords.indexOf(stream.current()) != -1) {
                return "keyword";
            }
            stream.next();
        }
    };
});
