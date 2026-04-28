#include <stdio.h>

int main() {
    // Lexical error 1: Identifier cannot start with a digit
    int 1number = 10; 
    
    // Lexical error 2: Invalid characters in source code
    int x = 5 @ 3; 
    
    // Lexical error 3: Unterminated string literal
    printf("This string never ends...
    
    return 0;
}
