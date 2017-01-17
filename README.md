# asm-yaepl
An educational programming language combining the simplicity of assembler with the power/safety of Javascript.

[Test it here](https://matthewsot.github.io/asm-yaepl/test.html)

# Design goals
- Focus on keeping syntax out of the way of the concepts
- Non-OO, focus on basic "thinking like a programmer" rather than more complex ideas about objects and inheritance
- Concepts in which many languages differ in implementation (like pass-by-value vs. pass-by-reference) should be default mimic C and Javascript but should be configurable in the compiler/interpreter.
- Should roughly translate to C and Javascript

# Toolset goals
- A REPL that runs in a webpage

# Hello, World! (Bonus!)
Writes "Hello, World!" followed by the length of "Hello, World!"
```
write-line "Hello, World!" //Write "Hello, World!" to the console

str-len "Hello, World!" -> $len //Store the length of "Hello, World!" as $len
int-to-str $len -> $len //Convert $len to a string before writing it
write-line $len //Write $len to the console
```

# Functions
Consider a simple ``index-of`` function:

```
@index-of $arr $search:
    copy 0 -> $i
    len $arr -> $arr_len

    #loop
    array-el $arr $i -> $currEl
    not-eq $currEl $search -> $continue
    add $i 1 -> $i
    lt $i $arr_len -> $still_legal
    and $still_legal $continue -> $continue
    jump-if $continue #loop
    
    add $i -1 -> $i
    
    return $i
@end

index-of "Hi!" "i" -> $index
write-line $index //2
```

# Built-in functions reference:
```
//Value functions
copy $a
len $a

//IO functions
write-line $str

//Numerical functions
add $a $b

//String functions
str-combine $str1 $str2 //Alias for add (in Javascript)
str-len $str //Alias for len (in Javascript)

//Array functions
array-len $arr //Alias for len (in Javascript)
array-el $arr $index
array-push $arr $item
array-pop $arr

//Comparison functions
eq $a $b
not-eq $a $b
lt $a $b
lt-eq $a $b
gt $a $b
gt-eq $a $b
or $a $b
and $a $b

//Conversion functions
num-to-str $num
str-to-num $str

//Control functions
jump-if $condition #label
```
