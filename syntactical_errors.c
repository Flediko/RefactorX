int main() {
    // Syntax Error 1: Missing closing parenthesis
    if (1 < 2 { 
        return 0;
    }
    
    // Syntax Error 2: Missing semicolon
    return 0
    
    // Syntax Error 3: Mismatched brace
    while (1 < 2) {
        if (1 < 2) {
            return 0;
        }
    
    return 0;
}
