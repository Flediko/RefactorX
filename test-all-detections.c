#include <stdio.h>

itn main() {
    // SEMANTIC: Uninitialized variable
    int x; 
    int y = 10;
    
    // LEXICAL: 'it' now correctly maps to 'if'
    // SEMANTIC: Assignment '=' instead of comparison '=='
    it (y = 5) {
        // SEMANTIC: Redundant algebraic operation (+ 0)
        x = y + 0; 
    }
    
    // LEXICAL: 'prntf' maps to 'printf'
    // SYNTACTICAL: Missing closing parenthesis and semicolon
    prntf("Result: %d\n", x
    
    // SEMANTIC: Self-assignment has no effect
    y = y; 
    
    // SEMANTIC: Division by zero protection
    int error = 100 / 0; 
    
    // LEXICAL: 'retun' maps to 'return'
    // SYNTACTICAL: Missing semicolon
    retun 0
}
