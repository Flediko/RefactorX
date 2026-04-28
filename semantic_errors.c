#include <stdio.h>

int calculateArea(int width, int height) {
    return width * height;
}

int main() {
    // Semantic error 1: Type mismatch (Assigning string pointer to integer)
    int value = "This is a string";
    
    // Semantic error 2: Undeclared variable usage
    total_sum = 100;
    
    // Semantic error 3: Invalid function argument types
    int area = calculateArea("width", 50);
    
    // Semantic error 4: Break statement outside of loop or switch
    break;
    
    return 0;
}
