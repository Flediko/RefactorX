/*
 * PART 1: LEXICAL ANALYSIS, SYNTAX ANALYSIS, SYMBOL TABLE & CONTROL FLOW
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ALGORITHMS USED IN THIS FILE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Stack-Based Bracket/Brace/Parenthesis Matching
 *    - Uses a LIFO stack to push opening delimiters and pop on closing
 *    - Detects unmatched [], (), {} pairs
 *    - Time: O(n), Space: O(n) worst case
 *    ALTERNATES:
 *    • Counter-Based Matching — simpler but can't pinpoint which bracket is unmatched
 *    • Recursive Descent Parser — more accurate, parses full C grammar
 *    • LR/LALR Parser (Yacc/Bison) — industry standard, handles full grammar
 *    • PEG (Parsing Expression Grammar) — unambiguous, used by tree-sitter
 *    • Earley Parser — handles ambiguous grammars, O(n³) worst case
 * 
 * 2. Regex Pattern Matching for Syntax Errors
 *    - Applies regex patterns per line to detect missing semicolons
 *    - Exception patterns prevent false positives (comments, preprocessor, control structures)
 *    ALTERNATES:
 *    • Tokenizer/Lexer (Flex) — proper token stream instead of line-by-line regex
 *    • Abstract Syntax Tree (AST) — full parse tree enables precise detection
 *    • Shunting-Yard Algorithm (Dijkstra) — for expression parsing
 * 
 * 3. String Literal Tracking (Finite State Machine)
 *    - Toggles inString/inChar flags to skip delimiters inside string/char literals
 *    - Prevents false positives from characters inside "strings"
 *    ALTERNATES:
 *    • Full Lexer with Token Categories — proper tokenization handles all literal types
 *    • State Machine with Escape Handling — more robust for escaped quotes
 * 
 * 4. Malformed Control Structure Detection
 *    - Regex patterns detect wrong delimiters in conditions (} instead of ))
 *    - Validates for-loop semicolon count (must be exactly 2)
 *    ALTERNATES:
 *    • LL(k) Parser — top-down parser with lookahead for structure validation
 *    • Grammar-Based Validation — formal grammar rules catch all malformed constructs
 * 
 * 5. Hash Map Symbol Table (Map) + Two-Pass Function Detection
 *    - O(1) lookup for variables, arrays, functions
 *    ALTERNATES:
 *    • Scoped/Nested Symbol Table — handles variable shadowing
 *    • SSA Form — each variable assigned once, enables optimizations
 *    • Use-Def / Def-Use Chains — precise data flow tracking
 * 
 * 6. Three-Pass Variable Analysis
 *    - Pass 1: declaration scan; Pass 2: usage-before-assignment; Pass 3: unused detection
 *    ALTERNATES:
 *    • Data Flow Analysis (Reaching Definitions) — more precise
 *    • Abstract Interpretation — proves absence of runtime errors
 *    • Symbolic Execution — explores all execution paths
 * 
 * 7. Linear Scan with State Flag (Unreachable Code)
 *    - Sets "after return" flag, resets at closing brace
 *    ALTERNATES:
 *    • Control Flow Graph (CFG) — directed graph of basic blocks
 *    • Dominator Tree (Lengauer-Tarjan) — precise reachability
 * 
 * 8. Pattern-Based Infinite Loop Detection + Loop Body Analysis
 *    - Catches while(1), for(;;), contradictory loops
 *    - Scans body for break/return and variable modification
 *    ALTERNATES:
 *    • Strongly Connected Components (Tarjan) — finds all loops in CFG
 *    • Termination Analysis (Ranking Functions) — proves termination
 *    • Halting Problem (Turing, 1936) — undecidable in general
 * 
 * 9. Format Specifier Parsing (printf/scanf)
 *    - Counts %d, %f, %s etc., compares against argument count
 *    ALTERNATES:
 *    • Type-Checked Format Strings — GCC -Wformat approach
 *    • Taint Analysis — tracks untrusted data flow
 * 
 * 10. Array Bounds Analysis (Constant + Loop-Based)
 *     - Checks constant indices and for-loop bounds vs array size
 *     ALTERNATES:
 *     • Constraint-Based Analysis — SMT solvers verify bounds
 *     • Abstract Interpretation with Interval Domain
 * ═══════════════════════════════════════════════════════════════════
 * 
 * COMPILER PHASES IN THIS FILE:
 * - Phase 2: Syntax Analysis (Grammar checking)
 * - Phase 3: Symbol Table Management
 * - Phase 4: Semantic Analysis (functions, variables, printf/scanf, arrays)
 * - Phase 5: Control Flow Analysis (unreachable code, infinite loops, empty bodies)
 * - Class definition with constructor and entry points
 */

class CAnalyzer {
    constructor() {
        this.bugs = [];

        // Phase 3: Symbol Table Management
        this.variables = new Map();
        this.arrays = new Map();
        this.functions = new Map();
        this.functionCalls = new Set();

        this.lines = [];
        this.originalCode = '';
        this.refactoredCode = '';
        this.currentFunction = null;

        // Phase 6: Optimization stats
        this.stats = {
            constantsFolded: 0,       // How many constant expressions computed
            deadCodeRemoved: 0,       // Lines of unreachable code removed
            expressionsSimplified: 0, // Redundant operations simplified
            conditionsFixed: 0,       // Wrong conditions corrected
            unusedRemoved: 0,         // Unused variables/functions removed
            functionsAdded: 0,        // Missing function calls added
            variablesRenamed: 0       // Variables renamed for clarity
        };

        // For code generation - variable renaming
        this.variableRenameMap = new Map();
        this.variableCounter = { int: 0, float: 0, char: 0, double: 0, default: 0 };
        this.undefinedFunctions = new Set();
        this.unusedVariables = new Set();
        this.uninitializedVariables = new Map();
        this.unusedFunctions = new Set();
        this.keywordTypoFixes = new Map(); // Tracks typo -> correction mappings found
    }

    // Analyze Code - detect bugs only
    analyzeOnly(code) {
        this.bugs = [];
        this.variables = new Map();
        this.arrays = new Map();
        this.functions = new Map();
        this.functionCalls = new Set();
        this.undefinedFunctions = new Set();
        this.unusedVariables = new Set();
        this.uninitializedVariables = new Map();
        this.unusedFunctions = new Set();
        this.lines = code.split('\n');
        this.originalCode = code;

        // Phase 1: Lexical Analysis - Fuzzy Keyword Matching (run first to flag typos)
        this.detectKeywordTypos();

        // Phase 2: Syntax Analysis
        this.detectMissingSemicolons();
        this.detectMismatchedBrackets();
        this.detectMismatchedParentheses();
        this.detectMismatchedBraces();
        this.detectMalformedControlStructures();

        // Phase 1, 3, 4: Lexical, Symbol Table, Semantic
        this.detectFunctions();
        this.detectFunctionErrors();
        this.detectAssignmentInCondition();
        this.detectVariableIssues();

        // Phase 5: Control Flow Analysis
        this.detectUnreachableCode();
        this.detectInfiniteLoops();
        this.detectEmptyBodies();

        // Phase 4: Additional Semantic Checks
        this.detectRedundantExpressions();
        this.detectDivisionByZero();
        this.detectConstantConditions();
        this.detectSelfAssignment();
        this.detectPrintfScanfErrors();
        this.detectArrayOutOfBounds();
        this.detectUnusedFunctions();
        this.detectMissingReturn();

        // Advanced Analysis
        this.detectMemoryLeaks();
        this.detectCodeSmells();
        this.detectPointerIssues();
        this.detectTypeIssues();
        this.detectBufferOverflow();
        this.detectFormatStringVuln();
        this.detectLargeStackAlloc();
        this.detectHighComplexity();
        this.detectNamingIssues();
        this.detectWastefulFloat();

        // Sort bugs by line number
        this.bugs.sort((a, b) => a.line - b.line);

        return { bugs: this.bugs };
    }

    // Change Code - detect bugs and generate refactored code
    analyzeAndRefactor(code) {
        this.bugs = [];
        this.variables = new Map();
        this.arrays = new Map();
        this.functions = new Map();
        this.functionCalls = new Set();
        this.undefinedFunctions = new Set();
        this.unusedVariables = new Set();
        this.uninitializedVariables = new Map();
        this.unusedFunctions = new Set();
        this.lines = code.split('\n');
        this.originalCode = code;
        this.refactoredCode = code;
        this.variableRenameMap = new Map();
        this.stats = {
            constantsFolded: 0, deadCodeRemoved: 0, expressionsSimplified: 0,
            conditionsFixed: 0, unusedRemoved: 0, functionsAdded: 0, variablesRenamed: 0
        };

        // Phase 1: Lexical Analysis - Fuzzy Keyword Matching (run first to flag typos)
        this.detectKeywordTypos();

        // Phases 1-5: Detection
        this.detectMissingSemicolons();
        this.detectMismatchedBrackets();
        this.detectMismatchedParentheses();
        this.detectMismatchedBraces();
        this.detectMalformedControlStructures();
        this.detectFunctions();
        this.detectFunctionErrors();
        this.detectAssignmentInCondition();
        this.detectVariableIssues();
        this.detectUnreachableCode();
        this.detectRedundantExpressions();
        this.detectDivisionByZero();
        this.detectInfiniteLoops();
        this.detectEmptyBodies();
        this.detectConstantConditions();
        this.detectSelfAssignment();
        this.detectPrintfScanfErrors();
        this.detectArrayOutOfBounds();
        this.detectUnusedFunctions();
        this.detectMissingReturn();

        // Advanced Analysis
        this.detectMemoryLeaks();
        this.detectCodeSmells();
        this.detectPointerIssues();
        this.detectTypeIssues();

        // Phase 6 & 7: Optimization and Code Generation
        this.generateRefactoredCode();

        this.bugs.sort((a, b) => a.line - b.line);

        return {
            bugs: this.bugs,
            refactoredCode: this.refactoredCode,
            stats: this.stats
        };
    }

    // Add bug to collection
    addBug(type, severity, line, message, suggestion = null, explanation = null) {
        const exists = this.bugs.some(b => b.line === line && b.type === type && b.message === message);
        if (!exists) {
            this.bugs.push({ type, severity, line, message, suggestion, explanation });
        }
    }

    // ============================================================
    // PHASE 2: SYNTAX ANALYSIS
    // Missing Semicolons, Mismatched Brackets/Parens/Braces,
    // Malformed Control Structures
    // ============================================================

    // Phase 2: Syntax Analysis - Missing Semicolons
    detectMissingSemicolons() {
        const needsSemicolon = [
            /^\s*(int|float|char|double|long|short|void)\s+\w+\s*(=\s*[^;{]+)?$/,  // Variable declaration
            /^\s*\w+\s*=\s*[^;{]+$/,  // Assignment
            /^\s*\w+\s*\([^)]*\)\s*$/,  // Function call without semicolon
            /^\s*(return)\s+[^;]+$/,  // Return statement
            /^\s*(break|continue)\s*$/,  // break/continue
            /^\s*\w+\s*(\+\+|--)\s*$/,  // Increment/decrement
            /^\s*(\+\+|--)\s*\w+\s*$/,  // Pre-increment/decrement
        ];

        const exceptions = [
            /^\s*\/\//,  // Comments
            /^\s*\/\*/,  // Multi-line comment start
            /^\s*\*/,    // Multi-line comment
            /^\s*#/,     // Preprocessor
            /^\s*$/,     // Empty line
            /\{\s*$/,    // Opening brace
            /^\s*\}/,    // Closing brace
            /^\s*(if|else|while|for|switch|do)\s*[\({]/,  // Control structures
            /^\s*else\s*$/,  // else keyword
            /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?$/,  // Function definition
        ];

        this.lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed === '') return;

            // Skip exceptions
            for (const exc of exceptions) {
                if (exc.test(trimmed)) return;
            }

            // Check if line needs semicolon but doesn't have one
            for (const pattern of needsSemicolon) {
                if (pattern.test(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
                    this.addBug(
                        'MissingSemicolon',
                        'error',
                        idx + 1,
                        `Missing semicolon at end of statement`,
                        `Add ';' at the end of line ${idx + 1}`,
                        `Every statement in C must end with a semicolon.`
                    );
                }
            }

            // Specific check: statement that looks complete but missing semicolon
            if (/^\s*(int|float|char|double)\s+\w+\s*=\s*[\w\d+\-*\/\s()]+$/.test(trimmed) && !trimmed.endsWith(';')) {
                this.addBug(
                    'MissingSemicolon',
                    'error',
                    idx + 1,
                    `Missing semicolon after variable initialization`,
                    `Add ';' at the end: ${trimmed};`,
                    `Variable declarations must end with semicolon.`
                );
            }

            // Check for return without semicolon
            if (/^\s*return\s+[\w\d+\-*\/\s()]+$/.test(trimmed) && !trimmed.endsWith(';')) {
                this.addBug(
                    'MissingSemicolon',
                    'error',
                    idx + 1,
                    `Missing semicolon after return statement`,
                    `Add ';' at the end`,
                    `Return statements must end with semicolon.`
                );
            }
        });
    }

    // Phase 2: Syntax Analysis - Mismatched Brackets []
    detectMismatchedBrackets() {
        let bracketStack = [];

        this.lines.forEach((line, idx) => {
            // Skip comments
            if (line.trim().startsWith('//')) return;

            for (let i = 0; i < line.length; i++) {
                if (line[i] === '[') {
                    bracketStack.push({ line: idx + 1, col: i + 1 });
                } else if (line[i] === ']') {
                    if (bracketStack.length === 0) {
                        this.addBug(
                            'MismatchedBracket',
                            'error',
                            idx + 1,
                            `Unexpected closing bracket ']' without matching '['`,
                            `Remove the extra ']' or add matching '['`,
                            `Every ']' must have a corresponding '['.`
                        );
                    } else {
                        bracketStack.pop();
                    }
                }
            }
        });

        // Check for unclosed brackets
        bracketStack.forEach(bracket => {
            this.addBug(
                'MismatchedBracket',
                'error',
                bracket.line,
                `Unclosed bracket '[' - missing ']'`,
                `Add matching ']' for the '[' on line ${bracket.line}`,
                `Every '[' must have a corresponding ']'.`
            );
        });
    }

    // Phase 2: Syntax Analysis - Mismatched Parentheses ()
    detectMismatchedParentheses() {
        let parenStack = [];
        let inString = false;
        let inChar = false;

        this.lines.forEach((line, idx) => {
            // Skip comments
            if (line.trim().startsWith('//')) return;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

                // Track string literals
                if (char === '"' && prevChar !== '\\') inString = !inString;
                if (char === "'" && prevChar !== '\\') inChar = !inChar;

                if (inString || inChar) continue;

                if (char === '(') {
                    parenStack.push({ line: idx + 1, col: i + 1 });
                } else if (char === ')') {
                    if (parenStack.length === 0) {
                        this.addBug(
                            'MismatchedParenthesis',
                            'error',
                            idx + 1,
                            `Unexpected closing parenthesis ')' without matching '('`,
                            `Remove the extra ')' or add matching '('`,
                            `Every ')' must have a corresponding '('.`
                        );
                    } else {
                        parenStack.pop();
                    }
                }
            }
        });

        parenStack.forEach(paren => {
            this.addBug(
                'MismatchedParenthesis',
                'error',
                paren.line,
                `Unclosed parenthesis '(' - missing ')'`,
                `Add matching ')' for the '(' on line ${paren.line}`,
                `Every '(' must have a corresponding ')'.`
            );
        });
    }

    // Phase 2: Syntax Analysis - Mismatched Braces {}
    detectMismatchedBraces() {
        let braceStack = [];
        let inString = false;

        this.lines.forEach((line, idx) => {
            // Skip comments
            if (line.trim().startsWith('//')) return;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

                if (char === '"' && prevChar !== '\\') inString = !inString;
                if (inString) continue;

                if (char === '{') {
                    braceStack.push({ line: idx + 1, col: i + 1 });
                } else if (char === '}') {
                    if (braceStack.length === 0) {
                        this.addBug(
                            'MismatchedBrace',
                            'error',
                            idx + 1,
                            `Unexpected closing brace '}' without matching '{'`,
                            `Remove the extra '}' or add matching '{'`,
                            `Every '}' must have a corresponding '{'.`
                        );
                    } else {
                        braceStack.pop();
                    }
                }
            }
        });

        braceStack.forEach(brace => {
            this.addBug(
                'MismatchedBrace',
                'error',
                brace.line,
                `Unclosed brace '{' - missing '}'`,
                `Add matching '}' for the '{' on line ${brace.line}`,
                `Every '{' must have a corresponding '}'.`
            );
        });
    }

    // Phase 2: Syntax Analysis - Malformed Control Structures
    detectMalformedControlStructures() {
        this.lines.forEach((line, idx) => {
            const trimmed = line.trim();

            // Detect } used instead of ) in conditions like (x > 0}
            if (/\([^()]*\}/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `'}' used instead of ')' to close condition/expression`,
                    `Replace '}' with ')' to close the parenthesis`,
                    `Parentheses () must be closed with ')' not '}'.`);
            }

            // Detect while/if/for with malformed parentheses (like "while(x}{")
            // Check for brace inside what should be a condition
            if (/\b(while|if|for)\s*\([^)]*\{/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Malformed control structure: '{' found inside condition parentheses`,
                    `Check for missing ')' before '{'`,
                    `Control structures like while(condition) must have proper parentheses before the body.`);
            }

            // Detect closing brace inside condition
            if (/\b(while|if|for)\s*\([^)]*\}/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Malformed control structure: '}' found instead of ')' in condition`,
                    `Change '}' to ')' to properly close the condition`,
                    `Conditions cannot contain braces. Use ')' to close.`);
            }

            // Detect while/if/for without opening parenthesis
            if (/\b(while|if)\s+[^(]\w/.test(trimmed) && !/\b(while|if)\s*\(/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Control structure missing '(' after keyword`,
                    `Add '(' after while/if keyword`,
                    `Syntax: while(condition) or if(condition).`);
            }

            // Detect for loop with wrong number of semicolons
            const forMatch = trimmed.match(/\bfor\s*\(([^)]*)\)/);
            if (forMatch) {
                const forContent = forMatch[1];
                const semicolonCount = (forContent.match(/;/g) || []).length;
                if (semicolonCount !== 2) {
                    this.addBug('MalformedSyntax', 'error', idx + 1,
                        `for loop must have exactly 2 semicolons, found ${semicolonCount}`,
                        `Use format: for(init; condition; update)`,
                        `for loops require: initialization; condition; update.`);
                }
            }

            // Detect switch without parentheses
            if (/\bswitch\s+[^(]/.test(trimmed) && !/\bswitch\s*\(/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `switch statement missing '(' after keyword`,
                    `Add '(' after switch keyword`,
                    `Syntax: switch(expression).`);
            }
        });
    }
}

// ============================================================
// PHASE 3: SYMBOL TABLE & SEMANTIC ANALYSIS
// Function Detection, Function Errors, Variable Issues,
// Assignment in Condition, Missing Return, Unused Functions
// ============================================================

CAnalyzer.prototype.detectFunctions = function() {
    const funcDefPattern = /\b(int|float|char|double|void|long|short)\s+(\w+)\s*\(([^)]*)\)\s*\{?/g;
    const funcCallPattern = /\b(\w+)\s*\(/g;
    const keywords = ['if', 'while', 'for', 'switch', 'return', 'int', 'float', 'char',
        'double', 'void', 'printf', 'scanf', 'sizeof', 'malloc', 'free', 'strlen'];

    this.lines.forEach((line, idx) => {
        funcDefPattern.lastIndex = 0;
        let match;
        while ((match = funcDefPattern.exec(line)) !== null) {
            const funcName = match[2];
            const params = match[3];
            if (!keywords.includes(funcName)) {
                this.functions.set(funcName, {
                    line: idx + 1, returnType: match[1], params: params,
                    hasBody: line.includes('{') || (idx + 1 < this.lines.length && this.lines[idx + 1].trim().startsWith('{'))
                });
            }
        }
    });

    this.lines.forEach((line, idx) => {
        const isFuncDef = /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?\s*(\/\/.*)?$/.test(line);
        if (isFuncDef) return;
        funcCallPattern.lastIndex = 0;
        let match;
        while ((match = funcCallPattern.exec(line)) !== null) {
            const funcName = match[1];
            if (!keywords.includes(funcName)) this.functionCalls.add(funcName);
        }
    });
};

CAnalyzer.prototype.detectFunctionErrors = function() {
    this.functionCalls.forEach(funcName => {
        if (!this.functions.has(funcName) && !this.isStandardFunction(funcName)) {
            this.undefinedFunctions.add(funcName);
            this.lines.forEach((line, idx) => {
                if (new RegExp(`\\b${funcName}\\s*\\(`).test(line)) {
                    this.addBug('UndefinedFunction', 'error', idx + 1,
                        `Function '${funcName}' is called but not defined`,
                        `Remove the call or define the function '${funcName}'`,
                        `Functions must be defined before they can be called.`);
                }
            });
        }
    });

    this.functions.forEach((info, funcName) => {
        if (!info.hasBody) {
            let hasBodyBelow = false;
            for (let i = info.line; i < Math.min(info.line + 2, this.lines.length); i++) {
                if (this.lines[i] && this.lines[i].includes('{')) { hasBodyBelow = true; break; }
            }
            if (!hasBodyBelow) {
                this.addBug('MissingFunctionBody', 'error', info.line,
                    `Function '${funcName}' is declared but has no body '{}'`,
                    `Add function body with '{' and '}' or add ';' for declaration`,
                    `Functions need a body to be defined.`);
            }
        }
        if (info.params && info.params.trim() !== '' && info.params.trim() !== 'void') {
            const params = info.params.split(',');
            params.forEach((param) => {
                const trimmedParam = param.trim();
                if (trimmedParam && !/^(int|float|char|double|void|long|short)\s+\w+/.test(trimmedParam) &&
                    !/^(int|float|char|double|void|long|short)\s*\*\s*\w+/.test(trimmedParam) &&
                    trimmedParam !== '...' && trimmedParam !== 'void') {
                    this.addBug('InvalidParameter', 'error', info.line,
                        `Invalid parameter '${trimmedParam}' in function '${funcName}'`,
                        `Parameters should be: type name (e.g., 'int x')`,
                        `Function parameters need both type and name.`);
                }
            });
        }
    });
};

CAnalyzer.prototype.isStandardFunction = function(name) {
    const standardFuncs = ['printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'strcmp',
        'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf',
        'getchar', 'putchar', 'gets', 'puts', 'exit', 'abs', 'sqrt',
        'pow', 'sin', 'cos', 'tan', 'log', 'exp', 'rand', 'srand', 'time',
        'memset', 'memcpy', 'memmove', 'atoi', 'atof', 'sizeof'];
    return standardFuncs.includes(name);
};

CAnalyzer.prototype.detectMissingReturn = function() {
    this.functions.forEach((info, funcName) => {
        if (info.returnType !== 'void' && funcName !== 'main') {
            let inFunction = false, braceCount = 0, hasReturn = false, functionEndLine = info.line;
            for (let i = info.line - 1; i < this.lines.length; i++) {
                const line = this.lines[i];
                if (line.includes('{')) { if (!inFunction) inFunction = true; braceCount++; }
                if (line.includes('}')) { braceCount--; if (braceCount === 0 && inFunction) { functionEndLine = i + 1; break; } }
                if (inFunction && /\breturn\b/.test(line)) hasReturn = true;
            }
            if (!hasReturn && inFunction) {
                this.addBug('MissingReturn', 'warning', functionEndLine,
                    `Function '${funcName}' has return type '${info.returnType}' but may not return a value`,
                    `Add 'return value;' before the closing '}'`,
                    `Non-void functions should return a value.`);
            }
        }
    });
};

CAnalyzer.prototype.detectUnusedFunctions = function() {
    const unusedFuncs = [];
    this.functions.forEach((info, funcName) => {
        if (funcName !== 'main' && !this.functionCalls.has(funcName)) {
            unusedFuncs.push(funcName);
            this.unusedFunctions.add(funcName);
            this.addBug('UnusedFunction', 'warning', info.line,
                `Function '${funcName}' is defined but never called`,
                `Add '${funcName}();' in main() or remove the function`,
                `Unused functions increase code size without providing value.`);
        }
    });
    if (unusedFuncs.length > 0) {
        this.addBug('UncalledFunctionsSummary', 'info', 1,
            `Uncalled functions: ${unusedFuncs.join(', ')}`,
            `Consider calling these functions in main() or remove them if not needed`,
            `These functions are defined but never used in the program.`);
    }
};

CAnalyzer.prototype.detectAssignmentInCondition = function() {
    const conditionPatterns = [/if\s*\(\s*([^)]+)\s*\)/g, /while\s*\(\s*([^)]+)\s*\)/g, /for\s*\([^;]*;\s*([^;]+)\s*;/g];
    this.lines.forEach((line, idx) => {
        for (const pattern of conditionPatterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
                const condition = match[1];
                if (/[^=!<>]=[^=]/.test(condition) && !/==|!=|<=|>=/.test(condition)) {
                    this.addBug('AssignmentInCondition', 'warning', idx + 1,
                        `Assignment '=' used instead of comparison '==' in condition`,
                        `Change '=' to '==' for comparison`,
                        `Using '=' performs assignment, not comparison.`);
                }
            }
        }
    });
};

CAnalyzer.prototype.detectVariableIssues = function() {
    const declPattern = /\b(int|float|char|double|long|short)\s+(\w+)\s*(=\s*[^;,]+)?[;,]/g;
    const declared = new Map();

    this.lines.forEach((line, idx) => {
        declPattern.lastIndex = 0;
        let match;
        while ((match = declPattern.exec(line)) !== null) {
            const varType = match[1], varName = match[2], hasInit = match[3] !== undefined;
            const keywords = ['int', 'float', 'char', 'double', 'void', 'if', 'while', 'for', 'return', 'main'];
            if (!keywords.includes(varName)) {
                declared.set(varName, { line: idx + 1, type: varType, initialized: hasInit });
                this.variables.set(varName, { type: varType, line: idx + 1 });
            }
        }
    });

    declared.forEach((info, varName) => {
        if (info.initialized) return;
        let isInitialized = false, usedBeforeInit = false, useLine = -1;
        for (let i = info.line; i < this.lines.length; i++) {
            const line = this.lines[i];
            const isAssignment = new RegExp(`(^|[;{}\\s])\\s*${varName}\\s*=[^=]`).test(line);
            const isUsed = new RegExp(`\\b${varName}\\b`).test(line);
            if (isAssignment) {
                const afterEquals = line.split('=')[1] || '';
                if (new RegExp(`\\b${varName}\\b`).test(afterEquals) && !isInitialized) {
                    usedBeforeInit = true; useLine = i + 1;
                }
                isInitialized = true;
            } else if (isUsed && !isInitialized) {
                usedBeforeInit = true; useLine = i + 1; break;
            }
        }
        if (usedBeforeInit && useLine !== -1) {
            this.uninitializedVariables.set(varName, { declLine: info.line, useLine: useLine, type: info.type });
            this.addBug('UninitializedVariable', 'error', useLine,
                `Variable '${varName}' is used without being initialized`,
                `Initialize '${varName}' to 0 at declaration (line ${info.line})`,
                `Using uninitialized variables causes undefined behavior - contains garbage value.`);
        }
    });

    declared.forEach((info, varName) => {
        let count = 0;
        this.lines.forEach(line => {
            const lineWithoutComment = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
            const matches = lineWithoutComment.match(new RegExp(`\\b${varName}\\b`, 'g'));
            if (matches) count += matches.length;
        });
        if (count <= 1) {
            this.unusedVariables.add(varName);
            this.addBug('UnusedVariable', 'warning', info.line,
                `Variable '${varName}' is declared but never used`,
                `Remove the unused variable or use it`,
                `Unused variables waste memory.`);
        }
    });
};

// ============================================================
// PHASE 5: CONTROL FLOW ANALYSIS
// Unreachable Code, Infinite Loops, Empty Bodies
// ============================================================

CAnalyzer.prototype.detectUnreachableCode = function() {
    let afterReturn = false;
    let braceDepth = 0;
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.includes('{')) braceDepth++;
        if (trimmed.includes('}')) { braceDepth--; afterReturn = false; }
        if (afterReturn && trimmed.length > 0 && trimmed !== '}' &&
            !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
            this.addBug('UnreachableCode', 'warning', idx + 1,
                `Unreachable code after return statement`,
                `Remove the unreachable code`,
                `Code after return will never execute.`);
            afterReturn = false;
        }
        if (/\breturn\b.*;/.test(trimmed)) afterReturn = true;
    });
};

CAnalyzer.prototype.detectInfiniteLoops = function() {
    this.lines.forEach((line, idx) => {
        if (/while\s*\(\s*(1|true)\s*\)/.test(line)) {
            let hasBreak = false;
            for (let i = idx + 1; i < Math.min(idx + 20, this.lines.length); i++) {
                if (/\bbreak\b|\breturn\b/.test(this.lines[i])) { hasBreak = true; break; }
                if (/^\s*}\s*$/.test(this.lines[i])) break;
            }
            if (!hasBreak) {
                this.addBug('InfiniteLoop', 'warning', idx + 1,
                    `Potential infinite loop (while(1) without break)`,
                    `Add a break condition or remove the loop`,
                    `Infinite loops can hang the program.`);
            }
        }

        if (/for\s*\(\s*;\s*;\s*\)/.test(line)) {
            this.addBug('InfiniteLoop', 'warning', idx + 1,
                `Infinite loop detected (for(;;))`,
                `Add loop conditions or remove the loop`,
                `Infinite loops can hang the program.`);
        }

        const forLoopMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(>=|>|<=|<)\s*(-?\d+)\s*;\s*(\w+)(\+\+|--|\s*\+=\s*\d+|\s*-=\s*\d+)/);
        if (forLoopMatch) {
            const [, initVar, initVal, condVar, condOp, condVal, incrVar, incrOp] = forLoopMatch;
            const initNum = parseInt(initVal), condNum = parseInt(condVal);
            if (initVar === condVar && condVar === incrVar) {
                let isInfinite = false, reason = '';
                if ((condOp === '>=' || condOp === '>') && (incrOp === '++' || incrOp.includes('+='))) {
                    if (initNum >= condNum) { isInfinite = true; reason = `'${initVar}' starts at ${initNum}, condition '${initVar} ${condOp} ${condNum}' is always true while incrementing`; }
                }
                if ((condOp === '<=' || condOp === '<') && (incrOp === '--' || incrOp.includes('-='))) {
                    if (initNum <= condNum) { isInfinite = true; reason = `'${initVar}' starts at ${initNum}, condition '${initVar} ${condOp} ${condNum}' while decrementing never terminates`; }
                }
                if (isInfinite) {
                    this.addBug('InfiniteLoop', 'warning', idx + 1,
                        `Infinite loop detected: ${reason}`,
                        `Fix the loop condition or change the increment/decrement`,
                        `The loop condition will never become false.`);
                }
            }
        }

        const whileVarMatch = line.match(/while\s*\(\s*(\w+)\s*\)/);
        if (whileVarMatch) {
            const loopVar = whileVarMatch[1];
            if (/^\d+$/.test(loopVar)) return;
            let hasDecrement = false, hasBreak = false, onlyIncrement = false;
            for (let i = idx + 1; i < Math.min(idx + 30, this.lines.length); i++) {
                const bodyLine = this.lines[i];
                if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                if (new RegExp(`${loopVar}\\s*--`).test(bodyLine) || new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*=\\s*0\\s*;`).test(bodyLine) || new RegExp(`${loopVar}\\s*=\\s*false\\s*;`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*-=`).test(bodyLine)) { hasDecrement = true; }
                if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) || new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) || new RegExp(`${loopVar}\\s*=\\s*${loopVar}\\s*\\+`).test(bodyLine)) { onlyIncrement = true; }
                if (/^\s*}\s*$/.test(bodyLine)) break;
            }
            if (onlyIncrement && !hasDecrement && !hasBreak) {
                this.addBug('InfiniteLoop', 'warning', idx + 1,
                    `Potential infinite loop: '${loopVar}' only increases, never becomes 0/false`,
                    `Add a decrement, break condition, or change the loop logic`,
                    `while(x) loops exit when x becomes 0/false. Incrementing moves away from termination.`);
            }
        }

        const whileCompMatch = line.match(/while\s*\(\s*(\w+)\s*(<=?|>=?|==|!=)\s*\d+\s*\)/);
        if (whileCompMatch) {
            const loopVar = whileCompMatch[1];
            let varModified = false, hasBreak = false;
            for (let i = idx + 1; i < Math.min(idx + 30, this.lines.length); i++) {
                const bodyLine = this.lines[i];
                if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) || new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*--`).test(bodyLine) || new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) || new RegExp(`${loopVar}\\s*-=`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*=`).test(bodyLine)) { varModified = true; }
                if (/^\s*}\s*$/.test(bodyLine)) break;
            }
            if (!varModified && !hasBreak) {
                this.addBug('InfiniteLoop', 'warning', idx + 1,
                    `Infinite loop: '${loopVar}' is never modified inside the loop`,
                    `Add '${loopVar}++' or '${loopVar}--' inside the loop body`,
                    `Loop variable must change for the condition to eventually become false.`);
            }
        }
    });
};

CAnalyzer.prototype.detectEmptyBodies = function() {
    const singleLinePatterns = [
        { regex: /if\s*\([^)]+\)\s*{\s*}/, type: 'if' },
        { regex: /if\s*\([^)]+\)\s*;/, type: 'if' },
        { regex: /else\s*{\s*}/, type: 'else' },
        { regex: /else\s*;/, type: 'else' },
        { regex: /while\s*\([^)]+\)\s*{\s*}/, type: 'while' },
        { regex: /while\s*\([^)]+\)\s*;/, type: 'while' },
        { regex: /for\s*\([^)]+\)\s*{\s*}/, type: 'for' },
        { regex: /for\s*\([^)]+\)\s*;/, type: 'for' },
    ];

    this.lines.forEach((line, idx) => {
        singleLinePatterns.forEach(({ regex, type }) => {
            if (regex.test(line)) {
                this.addBug('EmptyBody', 'warning', idx + 1,
                    `Empty ${type} body detected`,
                    `Add code to the body or remove the statement`,
                    `Empty control structures are usually unintentional.`);
            }
        });
    });

    for (let idx = 0; idx < this.lines.length; idx++) {
        const rawLine = this.lines[idx].trim();
        const line = rawLine.replace(/\/\/.*$/, '').trim();
        const nextRawLine = idx + 1 < this.lines.length ? this.lines[idx + 1].trim() : '';
        const nextLine = nextRawLine.replace(/\/\/.*$/, '').trim();
        const lineAfterNextRaw = idx + 2 < this.lines.length ? this.lines[idx + 2].trim() : '';
        const lineAfterNext = lineAfterNextRaw.replace(/\/\/.*$/, '').trim();

        if (/^(if\s*\([^)]+\)|else\s*if\s*\([^)]+\)|else|while\s*\([^)]+\)|for\s*\([^)]+\))\s*\{?$/.test(line)) {
            if (line.endsWith('{') && nextLine === '}') {
                const type = line.startsWith('if') ? 'if' : line.startsWith('else if') ? 'else if' :
                    line.startsWith('else') ? 'else' : line.startsWith('while') ? 'while' : 'for';
                this.addBug('EmptyBody', 'warning', idx + 1,
                    `Empty ${type} block detected (body has no statements)`,
                    `Add code to the body or remove the block`,
                    `Empty control structures are usually unintentional.`);
            } else if (!line.endsWith('{') && nextLine === '{' && lineAfterNext === '}') {
                const type = line.startsWith('if') ? 'if' : line.startsWith('else if') ? 'else if' :
                    line.startsWith('else') ? 'else' : line.startsWith('while') ? 'while' : 'for';
                this.addBug('EmptyBody', 'warning', idx + 1,
                    `Empty ${type} block detected (body has no statements)`,
                    `Add code to the body or remove the block`,
                    `Empty control structures are usually unintentional.`);
            }
        }
    }

    this.functions.forEach((info, funcName) => {
        const startLine = info.line - 1;
        let braceCount = 0, foundOpen = false, bodyLines = 0;
        for (let i = startLine; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (line.includes('{')) { foundOpen = true; braceCount++; }
            if (line.includes('}')) {
                braceCount--;
                if (braceCount === 0 && foundOpen) {
                    if (bodyLines === 0 || (bodyLines === 1 && i === startLine)) {
                        this.addBug('EmptyFunction', 'warning', info.line,
                            `Function '${funcName}' has an empty body`,
                            `Add code to the function or remove it`,
                            `Empty functions serve no purpose.`);
                    }
                    break;
                }
            }
            if (foundOpen && braceCount > 0) {
                const trimmed = line.trim();
                if (trimmed !== '' && trimmed !== '{' && trimmed !== '}' && !trimmed.startsWith('//')) bodyLines++;
            }
        }
    });
};

// ============================================================
// PRINTF/SCANF & ARRAY BOUNDS
// ============================================================

CAnalyzer.prototype.detectPrintfScanfErrors = function() {
    this.lines.forEach((line, idx) => {
        const printfPattern = /\bprintf\s*\(\s*([^")][ ^,)]*)\s*\)/g;
        let match;
        printfPattern.lastIndex = 0;
        while ((match = printfPattern.exec(line)) !== null) {
            const arg = match[1].trim();
            if (arg && !arg.startsWith('"') && !arg.startsWith("'") && !/^[A-Z_]+$/.test(arg)) {
                let formatSpec = '%d';
                if (this.variables.has(arg)) {
                    const varInfo = this.variables.get(arg);
                    switch (varInfo.type) {
                        case 'float': formatSpec = '%f'; break;
                        case 'double': formatSpec = '%lf'; break;
                        case 'char': formatSpec = '%c'; break;
                        case 'long': formatSpec = '%ld'; break;
                        default: formatSpec = '%d';
                    }
                }
                this.addBug('InvalidPrintf', 'error', idx + 1,
                    `printf() requires a format string, got variable '${arg}' directly`,
                    `Use printf("${formatSpec}", ${arg}); instead of printf(${arg});`,
                    `printf's first argument must be a format string like "%d" or "Hello".`);
            }
        }

        const printfFmtPattern = /\bprintf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\)/g;
        printfFmtPattern.lastIndex = 0;
        while ((match = printfFmtPattern.exec(line)) !== null) {
            const formatStr = match[1];
            const argsStr = match[2] || '';
            const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
            const specCount = fmtSpecs.length;
            const argList = argsStr.trim() === '' ? [] : argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
            const argCount = argList.length;

            if (specCount > 0 && argCount === 0) {
                this.addBug('PrintfArgMismatch', 'error', idx + 1,
                    `printf() has ${specCount} format specifier(s) (${fmtSpecs.join(', ')}) but no arguments provided`,
                    `Add the missing argument(s): printf("${formatStr}", ${fmtSpecs.map((s, i) => `var${i + 1}`).join(', ')});`,
                    `Each format specifier like %d or %f must have a matching argument. Missing arguments cause undefined behavior.`);
            } else if (specCount > argCount && argCount > 0) {
                this.addBug('PrintfArgMismatch', 'error', idx + 1,
                    `printf() has ${specCount} format specifier(s) but only ${argCount} argument(s)`,
                    `Add ${specCount - argCount} more argument(s) or remove extra format specifiers`,
                    `Each format specifier must have a matching argument. Missing arguments cause undefined behavior.`);
            } else if (argCount > specCount && specCount > 0) {
                this.addBug('PrintfArgMismatch', 'warning', idx + 1,
                    `printf() has ${specCount} format specifier(s) but ${argCount} argument(s) — ${argCount - specCount} extra argument(s) will be ignored`,
                    `Remove extra arguments or add format specifiers for them`,
                    `Extra arguments beyond the format specifiers are silently ignored.`);
            }
        }

        const scanfFmtPattern = /\bscanf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\)/g;
        scanfFmtPattern.lastIndex = 0;
        while ((match = scanfFmtPattern.exec(line)) !== null) {
            const formatStr = match[1];
            const argsStr = match[2] || '';
            const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
            const specCount = fmtSpecs.length;
            const argList = argsStr.trim() === '' ? [] : argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
            const argCount = argList.length;

            if (specCount > 0 && argCount === 0) {
                this.addBug('ScanfArgMismatch', 'error', idx + 1,
                    `scanf() has ${specCount} format specifier(s) (${fmtSpecs.join(', ')}) but no arguments provided`,
                    `Add the missing argument(s): scanf("${formatStr}", ${fmtSpecs.map((s, i) => `&var${i + 1}`).join(', ')});`,
                    `Each format specifier must have a matching argument. Missing arguments cause undefined behavior.`);
            } else if (specCount > argCount && argCount > 0) {
                this.addBug('ScanfArgMismatch', 'error', idx + 1,
                    `scanf() has ${specCount} format specifier(s) but only ${argCount} argument(s)`,
                    `Add ${specCount - argCount} more argument(s) or remove extra format specifiers`,
                    `Each format specifier must have a matching argument.`);
            } else if (argCount > specCount && specCount > 0) {
                this.addBug('ScanfArgMismatch', 'warning', idx + 1,
                    `scanf() has ${specCount} format specifier(s) but ${argCount} argument(s) — ${argCount - specCount} extra`,
                    `Remove extra arguments or add format specifiers`,
                    `Extra arguments beyond the format specifiers are ignored.`);
            }

            for (let i = 0; i < Math.min(specCount, argCount); i++) {
                const arg = argList[i];
                const spec = fmtSpecs[i];
                if (spec !== '%s' && arg && !arg.startsWith('&') && /^[a-zA-Z_]\w*$/.test(arg)) {
                    this.addBug('InvalidScanf', 'error', idx + 1,
                        `scanf() requires address of variable, missing '&' before '${arg}'`,
                        `Use scanf("${formatStr}", &${arg}); instead of scanf("${formatStr}", ${arg});`,
                        `scanf needs memory address (pointer) to store input value.`);
                }
            }
        }
    });
};

CAnalyzer.prototype.detectArrayOutOfBounds = function() {
    const arrayDeclPattern = /\b(int|float|char|double|long|short)\s+(\w+)\s*\[\s*(\d+)\s*\]/g;
    this.lines.forEach((line, idx) => {
        arrayDeclPattern.lastIndex = 0;
        let match;
        while ((match = arrayDeclPattern.exec(line)) !== null) {
            this.arrays.set(match[2], { type: match[1], size: parseInt(match[3], 10), line: idx + 1 });
        }
    });

    const accessPattern = /(\w+)\s*\[\s*(\d+)\s*\]/g;
    this.lines.forEach((line, idx) => {
        if (/\b(int|float|char|double|long|short)\s+\w+\s*\[/.test(line)) return;
        accessPattern.lastIndex = 0;
        let match;
        while ((match = accessPattern.exec(line)) !== null) {
            const arrayName = match[1], accessIndex = parseInt(match[2], 10);
            if (this.arrays.has(arrayName)) {
                const arrayInfo = this.arrays.get(arrayName);
                if (accessIndex >= arrayInfo.size) {
                    this.addBug('ArrayOutOfBounds', 'critical', idx + 1,
                        `Array '${arrayName}' accessed at index ${accessIndex}, but size is ${arrayInfo.size} (valid indices: 0-${arrayInfo.size - 1})`,
                        `Use an index less than ${arrayInfo.size}`,
                        `Accessing array out of bounds causes undefined behavior and can crash the program.`);
                }
                if (accessIndex < 0) {
                    this.addBug('ArrayOutOfBounds', 'critical', idx + 1,
                        `Array '${arrayName}' accessed at negative index ${accessIndex}`,
                        `Use a non-negative index`,
                        `Negative array indices cause undefined behavior.`);
                }
            }
        }
    });

    const forLoopPattern = /for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=|>|>=)\s*(\d+|\w+)\s*;/g;
    this.lines.forEach((line, idx) => {
        forLoopPattern.lastIndex = 0;
        let match;
        while ((match = forLoopPattern.exec(line)) !== null) {
            const loopVar = match[1], startVal = parseInt(match[2], 10), operator = match[3], limitStr = match[4];
            const limitVal = parseInt(limitStr, 10);
            if (isNaN(limitVal)) continue;
            let maxIndex;
            if (operator === '<') maxIndex = limitVal - 1;
            else if (operator === '<=') maxIndex = limitVal;
            else if (operator === '>') maxIndex = startVal;
            else if (operator === '>=') maxIndex = startVal;

            for (let j = idx; j < Math.min(idx + 10, this.lines.length); j++) {
                const innerLine = this.lines[j];
                const arrayAccessPattern = new RegExp(`(\\w+)\\s*\\[\\s*${loopVar}\\s*\\]`, 'g');
                let accessMatch;
                while ((accessMatch = arrayAccessPattern.exec(innerLine)) !== null) {
                    const arrayName = accessMatch[1];
                    if (this.arrays.has(arrayName)) {
                        const arrayInfo = this.arrays.get(arrayName);
                        if (maxIndex !== undefined && maxIndex >= arrayInfo.size) {
                            this.addBug('ArrayOutOfBounds', 'critical', idx + 1,
                                `Loop may access '${arrayName}[${maxIndex}]' but array size is ${arrayInfo.size} (valid: 0-${arrayInfo.size - 1})`,
                                `Change loop condition to '${loopVar} < ${arrayInfo.size}'`,
                                `The loop iterates beyond the array bounds which causes undefined behavior.`);
                        }
                    }
                }
            }
        }
    });
};
