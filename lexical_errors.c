#include <stdio.h>

itn main() { // Lexical Error: 'itn' is a typo for 'int' (Fuzzy matching)
    float value = 10.5;
    
    prntf("Value: %f\n", value); // Lexical Error: 'prntf' is a typo for 'printf'
    
    retun 0; // Lexical Error: 'retun' is a typo for 'return'
}
