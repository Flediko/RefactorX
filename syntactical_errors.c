#include <stdio.h>

int main() {
    // Syntactical error 1: Missing semicolon
    int a = 10
    
    // Syntactical error 2: Missing closing parenthesis
    if (a > 5 {
        printf("Greater!");
    }
    
    // Syntactical error 3: Unbalanced/mismatched braces
    while (a > 0) 
        a--;
    }
    
    return 0;
}
