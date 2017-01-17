# asm-yaepl
An educational programming language combining the simplicity of assembler with the power/safety of Javascript.

# Design goals
- Focus on keeping syntax out of the way of the concepts
- Non-OO, focus on basic "thinking like a programmer" rather than more complex ideas about objects and inheritance
- Concepts in which many languages differ in implementation (like pass-by-value vs. pass-by-reference) should be default mimic C and Javascript but should be configurable in the compiler/interpreter.
- Should roughly translate to C and Javascript

# Toolset goals
- A REPL that runs in a webpage

# Hello, World!
Writes "Hello, World!" followed by the length of "Hello, World!"
```
write-line "Hello, World!" //Write "Hello, World!" to the console
str-len "Hello, World!" -> $len //Store the length of "Hello, World!" as $len
int-to-str $len -> $len //Convert $len to a string before writing it
write-line $len //Write $len to the console
```

# Functions
Consider ``str-len`` from above (assuming strings are terminated by a ``\0`` character):

```
@str-len $str:
    move 0 $len

    #loop
    array-el $str $len -> $currChar
    not-eq $currChar '\0' -> $continue
    add $len 1 -> $len
    jump-if $continue #loop
    
    return ($len - 1)
```
