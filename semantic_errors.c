#include <stdio.h>
#include <stdlib.h>

int main() {
    int data_array[5];
    data_array[10] = 100; // Semantic Error: Array index out of bounds
    
    int denominator = 0;
    int result = 10 / denominator; // Semantic Error: Division by zero (if detected)
    
    // Note: The analyzer detects literal division by zero more easily:
    int direct_error = 10 / 0; 
    
    int* buffer_ptr = (int*)malloc(sizeof(int) * 5);
    // Semantic Error: Memory leak (malloc without free)
    
    printf("%d\n", undefined_variable_name); // Semantic Error: Use of undeclared variable
    
    return 0;
}
