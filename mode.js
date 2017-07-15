/* Example definition of a simple mode that understands a subset of
 * JavaScript:
 */

keywords = [ 'write-out' ]
CodeMirror.defineMode("yaepl", function (){
    handleStr = function (stream, chr) {
        stream.next()
        match = new RegExp("[^" + chr + "\\\\]")
        stream.eatWhile(match)
        while (stream.peek() == "\\") {
            stream.next()
            stream.next()
            eaten = stream.eatWhile(match)
        }
        stream.next()
    };
    return {
        startState: function() { return { s_qt: false, d_qt: false} },
        token: function(stream, state) {
            if (stream.peek() == "'") {
                handleStr(stream, "'")
                return "string";
            }
            if (stream.peek() == "\"") {
                handleStr(stream, "\"")
                return "string";
            }
            stream.next()
            return;
        }
    };
});
