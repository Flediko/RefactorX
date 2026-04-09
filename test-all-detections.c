// ============================================
// TEST CODE: Triggers ALL analyzer detections
// ============================================

#include <stdio.h>
#include <stdlib.h>

// 1. KEYWORD TYPO (Damerau-Levenshtein fuzzy matching)
itn globalVar;           // "itn" → should be "int"
voiid helperFunc();      // "voiid" → should be "void"

// 2. UNUSED FUNCTION (defined but never called)
int unusedFunction(int a) {
    return a * 2;
}

// 3. EMPTY FUNCTION BODY
void emptyFunc() {
}

// 4. MISSING RETURN in non-void function
int noReturnFunc(int x) {
    int result = x + 1;
}

// 5. INVALID PARAMETER type
void badParams(x, y) {
}

// 6. FUNCTION CALLED BUT NOT DEFINED
// undefinedFunc() is called in main but never defined

int main() {
    // 7. UNINITIALIZED VARIABLE
    int x;
    printf("%d", x);    // x used without initialization

    // 8. UNUSED VARIABLE
    int neverUsed;

    // 9. MISSING SEMICOLONS
    int y = 10
    float z = 3.14

    // 10. MISMATCHED BRACKETS
    int arr[5;           // missing ]

    // 11. MISMATCHED PARENTHESES
    if (x > 0 {          // missing )

    // 12. MISMATCHED BRACES — extra } at end of file

    // 13. ASSIGNMENT IN CONDITION (= instead of ==)
    if (x = 5) {
        printf("oops");
    }

    // 14. REDUNDANT EXPRESSION (x - x = 0, x / x = 1)
    int redundant = x - x;
    int alsoRedundant = x / x;

    // 15. DIVISION BY ZERO
    int divZero = y / 0;

    // 16. SELF ASSIGNMENT
    y = y;

    // 17. CONSTANT CONDITION
    if (1) {
        printf("always true");
    }
    if (0) {
        printf("always false");
    }

    // 18. UNREACHABLE CODE (after return)
    if (x > 100) {
        return 0;
        printf("unreachable");   // dead code
    }

    // 19. INFINITE LOOP (while(1) without break)
    while(1) {
        printf("infinite");
    }

    // 20. INFINITE LOOP (for(;;))
    for(;;) {
        printf("forever");
    }

    // 21. INFINITE LOOP (variable never modified)
    int counter = 5;
    while(counter > 0) {
        printf("%d", counter);
        // counter is never decremented
    }

    // 22. EMPTY IF/WHILE/FOR BODIES
    if (x > 0) {
    }
    while (x < 10);
    for (int i = 0; i < 5; i++);

    // 23. PRINTF without format string
    printf(x);

    // 24. PRINTF argument mismatch
    printf("%d %f", x);          // 2 specifiers, 1 argument

    // 25. SCANF missing & operator
    int input;
    scanf("%d", input);          // should be &input

    // 26. ARRAY OUT OF BOUNDS (constant)
    int numbers[5];
    numbers[10] = 42;            // index 10, size 5

    // 27. ARRAY OUT OF BOUNDS (loop-based)
    for (int i = 0; i <= 5; i++) {
        numbers[i] = i;          // i goes up to 5, valid 0-4
    }

    // 28. MALFORMED FOR LOOP (wrong semicolons)
    for (int i = 0, i < 5, i++) {   // commas instead of semicolons? 
        // This triggers malformed syntax
    }

    // 29. MEMORY LEAK — malloc without free
    int *ptr = (int*)malloc(sizeof(int));
    *ptr = 42;
    // never freed!

    // 30. RESOURCE LEAK — fopen without fclose
    FILE *fp = fopen("test.txt", "r");
    // never closed!

    // 31. DOUBLE FREE
    char *buf = (char*)malloc(100);
    free(buf);
    free(buf);                   // double free!

    // 32. USE AFTER FREE
    int *data = (int*)malloc(sizeof(int));
    free(data);
    printf("%d", *data);         // use after free!

    // 33. NULL POINTER DEREFERENCE
    int *nullPtr = NULL;
    *nullPtr = 10;               // dereferencing NULL

    // 34. TYPE TRUNCATION (float to int)
    float pi = 3.14;
    int truncated;
    truncated = pi;              // truncates decimal

    // 35. TYPE OVERFLOW (int to char)
    int bigVal = 300;
    char smallChar;
    smallChar = bigVal;          // overflow: 300 > 127

    // 36. INTEGER DIVISION PRECISION LOSS
    int a = 7;
    int b = 2;
    float result = a / b;       // int/int = 3, not 3.5

    // 37. DEEP NESTING (>4 levels)
    if (x) {
        if (y) {
            if (a) {
                if (b) {
                    if (counter) {             // 5 levels deep!
                        printf("too deep");
                    }
                }
            }
        }
    }

    // 38. MAGIC NUMBERS
    int timeout = 86400;         // what is 86400?
    int bufSize = 4096;          // what is 4096?

    // 39. UNDEFINED FUNCTION CALL
    undefinedFunc(x, y);

    // =========================================
    // ROUND 2: New Detection Categories
    // =========================================

    // 40. BUFFER OVERFLOW — gets() (no bounds checking)
    char name[20];
    gets(name);                  // unsafe! use fgets()

    // 41. BUFFER OVERFLOW — strcpy() (no size limit)
    char dest[10];
    strcpy(dest, "this is way too long for dest");

    // 42. BUFFER OVERFLOW — strcat() (no remaining check)
    strcat(dest, " more text");

    // 43. BUFFER OVERFLOW — sprintf() (no bounds)
    sprintf(dest, "%s %d", name, 42);

    // 44. BUFFER OVERFLOW — scanf %s (no width limit)
    scanf("%s", name);

    // 45. FORMAT STRING VULNERABILITY
    char *userInput = "hello %x %x %n";
    printf(userInput);           // SECURITY: printf(variable)!

    // 46. LARGE STACK ALLOCATION (>8KB)
    double hugeArray[100000];    // ~800KB on the stack!

    // 47. NAMING CONVENTION — single-letter variable
    int q = 42;                  // 'q' is not a loop var
    float f = 1.5;               // 'f' is not a loop var

    // 48. WASTEFUL TYPE — type larger than needed
    float count = 5;             // float holding whole number → use int
    double size = 100;           // double holding whole number → use int
    long smallLong = 42;         // long but value fits in char
    int tinyVal = 3;             // int but value fits in char
    short miniVal = 10;          // short but value fits in char

    return 0;
}

// 48. HIGH CYCLOMATIC COMPLEXITY (>10)
int complexFunction(int a, int b, int c, int d) {
    if (a > 0) {
        if (b > 0) {
            if (c > 0 && d > 0) {
                return 1;
            } else if (c < 0) {
                return 2;
            }
        } else if (b < 0) {
            for (int i = 0; i < a; i++) {
                if (i % 2 == 0) {
                    switch(d) {
                        case 1: return 3;
                        case 2: return 4;
                        case 3: return 5;
                        default: break;
                    }
                }
            }
        }
    } else if (a < 0 || b < 0) {
        while (c > 0) {
            c--;
            if (d > 0) return 6;
        }
    }
    return 0;
}
// Missing closing brace intentionally removed to test brace mismatch
