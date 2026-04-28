
class CAnalyzer {
    constructor() {
        this.bugs = [];

        
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

        
        this.detectFunctions();
        this.detectVariableIssues();
        
        this.detectKeywordTypos();

        this.detectMissingSemicolons();
        this.detectMismatchedBrackets();
        this.detectMismatchedParentheses();
        this.detectMismatchedBraces();
        this.detectMalformedControlStructures();
        this.detectFunctionErrors();
        this.detectAssignmentInCondition();

        
        this.detectUnreachableCode();
        this.detectInfiniteLoops();
        this.detectEmptyBodies();

        
        this.detectRedundantExpressions();
        this.detectDivisionByZero();
        this.detectConstantConditions();
        this.detectSelfAssignment();
        this.detectPrintfScanfErrors();
        this.detectArrayOutOfBounds();
        this.detectUnusedFunctions();
        this.detectMissingReturn();

        
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

        
        this.bugs.sort((a, b) => a.line - b.line);

        return { bugs: this.bugs };
    }

    
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

        
        this.detectKeywordTypos();

        
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

        
        this.detectMemoryLeaks();
        this.detectCodeSmells();
        this.detectPointerIssues();
        this.detectTypeIssues();

        
        this.generateRefactoredCode();

        this.bugs.sort((a, b) => a.line - b.line);

        return {
            bugs: this.bugs,
            refactoredCode: this.refactoredCode,
            stats: this.stats
        };
    }

    
    addBug(type, severity, line, message, suggestion = null, explanation = null) {
        const exists = this.bugs.some(b => b.line === line && b.type === type && b.message === message);
        if (!exists) {
            this.bugs.push({ type, severity, line, message, suggestion, explanation });
        }
    }

    
    
    
    
    

    
    detectMissingSemicolons() {
        const needsSemicolon = [
            /^\s*(int|float|char|double|long|short|void)\s+\w+\s*(=\s*[^;{]+)?$/,  
            /^\s*\w+\s*=\s*[^;{]+$/,  
            /^\s*\w+\s*\([^)]*\)\s*$/,  
            /^\s*(return)\s+[^;]+$/,  
            /^\s*(break|continue)\s*$/,  
            /^\s*\w+\s*(\+\+|--)\s*$/,  
            /^\s*(\+\+|--)\s*\w+\s*$/,  
        ];

        const exceptions = [
            /^\s*\/\//,  
            /^\s*\/\*/,  
            /^\s*\*/,    
            /^\s*#/,     
            /^\s*$/,     
            /\{\s*$/,    
            /^\s*\}/,    
            /^\s*(if|else|while|for|switch|do)\s*[\({]/,  
            /^\s*else\s*$/,  
            /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?$/,  
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

    
    detectMismatchedBrackets() {
        let bracketStack = [];

        this.lines.forEach((line, idx) => {
            
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

    
    detectMismatchedParentheses() {
        let parenStack = [];
        let inString = false;
        let inChar = false;

        this.lines.forEach((line, idx) => {
            
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

    
    detectMismatchedBraces() {
        let braceStack = [];
        let inString = false;

        this.lines.forEach((line, idx) => {
            
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
            const codeOnly = trimmed.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
            if (!codeOnly) return;

            if (/\([^()]*\}/.test(codeOnly)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `'}' used instead of ')' to close condition/expression`,
                    `Replace '}' with ')' to close the parenthesis`,
                    `Parentheses () must be closed with ')' not '}'.`);
            }

            if (/\b(while|if|for)\s*\([^)]*\{/.test(codeOnly)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Malformed control structure: '{' found inside condition parentheses`,
                    `Check for missing ')' before '{'`,
                    `Control structures like while(condition) must have proper parentheses before the body.`);
            }

            if (/\b(while|if|for)\s*\([^)]*\}/.test(codeOnly)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Malformed control structure: '}' found instead of ')' in condition`,
                    `Change '}' to ')' to properly close the condition`,
                    `Conditions cannot contain braces. Use ')' to close.`);
            }

            if (/\b(while|if)\s+[^(]\w/.test(codeOnly) && !/\b(while|if)\s*\(/.test(codeOnly)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Control structure missing '(' after keyword`,
                    `Add '(' after while/if keyword`,
                    `Syntax: while(condition) or if(condition).`);
            }

            const forMatch = codeOnly.match(/\bfor\s*\(([^)]*)\)/);
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

            if (/\bswitch\s+[^(]/.test(codeOnly) && !/\bswitch\s*\(/.test(codeOnly)) {
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
    const potentialFuncDefWithTypo = /\b(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    const funcCallPattern = /\b(\w+)\s*\(/g;
    const keywords = ['if', 'while', 'for', 'switch', 'return', 'int', 'float', 'char',
        'double', 'void', 'printf', 'scanf', 'sizeof', 'malloc', 'free', 'strlen', 'main'];
    const cTypes = new Set(['int', 'float', 'char', 'double', 'void', 'long', 'short']);

    this.lines.forEach((line, idx) => {
        funcDefPattern.lastIndex = 0;
        let match;
        while ((match = funcDefPattern.exec(line)) !== null) {
            const funcName = match[2];
            if (!keywords.includes(funcName)) {
                this.functions.set(funcName, {
                    line: idx + 1, returnType: match[1], params: match[3],
                    hasBody: line.includes('{') || (idx + 1 < this.lines.length && this.lines[idx + 1].trim().startsWith('{'))
                });
            }
        }

        potentialFuncDefWithTypo.lastIndex = 0;
        while ((match = potentialFuncDefWithTypo.exec(line)) !== null) {
            const typeToken = match[1], funcName = match[2];
            if (this.keywordTypoFixes.has(typeToken)) {
                const correction = this.keywordTypoFixes.get(typeToken);
                if (cTypes.has(correction) && !keywords.includes(funcName) && !this.functions.has(funcName)) {
                    this.functions.set(funcName, {
                        line: idx + 1, returnType: correction, params: match[3],
                        hasBody: true
                    });
                }
            }
        }
    });

    this.lines.forEach((line, idx) => {
        const isFuncDef = /^\s*(\w+)\s+\w+\s*\([^)]*\)\s*\{?\s*(\/\/.*)?$/.test(line);
        if (isFuncDef) {
            const match = line.match(/^\s*(\w+)\s+(\w+)/);
            if (match) {
                const type = match[1];
                if (cTypes.has(type) || this.keywordTypoFixes.has(type)) return;
            }
        }
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
        if (!this.functions.has(funcName) && !this.isStandardFunction(funcName) && !this.keywordTypoFixes.has(funcName)) {
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
                if (inFunction && (/\breturn\b/.test(line) || Array.from(this.keywordTypoFixes.keys()).some(typo => this.keywordTypoFixes.get(typo) === 'return' && new RegExp(`\\b${typo}\\b`).test(line)))) hasReturn = true;
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
        const isMain = funcName === 'main' || (this.keywordTypoFixes.has(funcName) && this.keywordTypoFixes.get(funcName) === 'main');
        if (!isMain && !this.functionCalls.has(funcName)) {
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





class CTokenizer {
    constructor(input) {
        this.input = input;
        this.pos = 0;
        this.length = input.length;
    }

    nextToken() {
        
        while (this.pos < this.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }

        if (this.pos >= this.length) return null;

        let char = this.input[this.pos];

        
        if (/[a-zA-Z_]/.test(char)) {
            let value = '';
            while (this.pos < this.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
                value += this.input[this.pos];
                this.pos++;
            }
            const keywords = [
                'int', 'float', 'char', 'double', 'void', 'long', 'short', 'unsigned', 'signed',
                'if', 'else', 'while', 'for', 'do', 'switch', 'case', 'break', 'continue',
                'return', 'struct', 'typedef', 'enum', 'const', 'static', 'sizeof'
            ];
            return { type: keywords.includes(value) ? 'KEYWORD' : 'IDENTIFIER', value };
        }

        
        if (/[0-9]/.test(char)) {
            let value = '';
            while (this.pos < this.length && /[0-9.]/.test(this.input[this.pos])) {
                value += this.input[this.pos];
                this.pos++;
            }
            return { type: 'NUMBER', value };
        }

        
        if (char === '"') {
            let value = '"';
            this.pos++; 
            while (this.pos < this.length && this.input[this.pos] !== '"') {
                if (this.input[this.pos] === '\\' && this.pos + 1 < this.length) {
                    value += this.input[this.pos] + this.input[this.pos + 1];
                    this.pos += 2;
                } else {
                    value += this.input[this.pos];
                    this.pos++;
                }
            }
            if (this.pos < this.length) { value += '"'; this.pos++; } 
            return { type: 'STRING', value };
        }

        
        if (char === "'") {
            let value = "'";
            this.pos++;
            while (this.pos < this.length && this.input[this.pos] !== "'") {
                value += this.input[this.pos];
                this.pos++;
            }
            if (this.pos < this.length) { value += "'"; this.pos++; }
            return { type: 'STRING', value };
        }

        
        const next = this.pos + 1 < this.length ? this.input[this.pos + 1] : '';
        if ((char === '=' && next === '=') || (char === '!' && next === '=') ||
            (char === '<' && next === '=') || (char === '>' && next === '=') ||
            (char === '+' && next === '+') || (char === '-' && next === '-') ||
            (char === '+' && next === '=') || (char === '-' && next === '=') ||
            (char === '*' && next === '=') || (char === '/' && next === '=') ||
            (char === '&' && next === '&') || (char === '|' && next === '|')) {
            this.pos += 2;
            return { type: 'OPERATOR', value: char + next };
        }

        
        this.pos++;
        return { type: 'OPERATOR', value: char };
    }

    tokenize() {
        const tokens = [];
        let token;
        let safety = 0;
        const maxTokens = this.length + 100; 
        while ((token = this.nextToken()) !== null && safety < maxTokens) {
            tokens.push(token);
            safety++;
        }
        return tokens;
    }
}





class CParseTreeParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.maxPos = tokens.length;
    }

    peek() { return this.pos < this.maxPos ? this.tokens[this.pos] : null; }
    consume() { return this.pos < this.maxPos ? this.tokens[this.pos++] : null; }
    check(value) { const t = this.peek(); return t && t.value === value; }
    expect(value) {
        if (this.check(value)) {
            const token = this.consume();
            return { type: 'Terminal', value: token.value, tokenType: token.type };
        }
        return null;
    }

    isTypeKeyword(token) {
        if (!token || token.type !== 'KEYWORD') return false;
        return ['int', 'float', 'char', 'double', 'void', 'long', 'short',
                'unsigned', 'signed', 'const', 'static'].includes(token.value);
    }

    parse() {
        const children = [];
        let safety = 0;
        while (this.peek() && safety < this.maxPos + 1) {
            const prevPos = this.pos;
            const node = this.parseTopLevel();
            if (node) children.push(node);
            if (this.pos === prevPos) {
                const skipped = this.consume();
                children.push({ type: 'Terminal', value: skipped.value, tokenType: skipped.type });
            }
            safety++;
        }
        return { type: 'Program', children };
    }

    parseTopLevel() {
        const token = this.peek();
        if (!token) return null;
        if (this.isTypeKeyword(token)) return this.parseDeclarationOrFunction();
        const skipped = this.consume();
        return { type: 'Terminal', value: skipped.value, tokenType: skipped.type };
    }

    parseDeclarationOrFunction() {
        const children = [];
        while (this.peek() && this.isTypeKeyword(this.peek())) {
            const t = this.consume();
            children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
        }
        while (this.check('*')) {
            const t = this.consume();
            children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
        }

        const nameToken = this.peek();
        if (!nameToken || nameToken.type !== 'IDENTIFIER') return { type: 'DeclarationError', children };
        const nt = this.consume();
        children.push({ type: 'Terminal', value: nt.value, tokenType: nt.type });

        if (this.check('(')) {
            const t1 = this.consume();
            children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
            children.push(this.parseParamList());
            const t2 = this.expect(')');
            if (t2) children.push(t2);

            let body = null;
            if (this.check('{')) {
                children.push(this.parseBlock());
            } else {
                const t3 = this.expect(';');
                if (t3) children.push(t3);
            }
            return { type: 'FunctionDeclaration', children };
        }

        if (this.check('[')) {
            const t1 = this.consume();
            children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
            while (this.peek() && !this.check(']')) {
                const ts = this.consume();
                children.push({ type: 'Terminal', value: ts.value, tokenType: ts.type });
            }
            const t2 = this.expect(']');
            if (t2) children.push(t2);
            const t3 = this.expect(';');
            if (t3) children.push(t3);
            return { type: 'VariableDeclaration', children };
        }

        if (this.check('=')) {
            const t1 = this.consume();
            children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
            children.push(this.collectExpression(';'));
        }
        const t4 = this.expect(';');
        if (t4) children.push(t4);
        return { type: 'VariableDeclaration', children };
    }

    parseParamList() {
        const children = [];
        if (this.check(')')) return { type: 'ParamList', children };
        let safety = 0;
        while (this.peek() && !this.check(')') && safety < 50) {
            while (this.peek() && this.isTypeKeyword(this.peek())) {
                const t = this.consume();
                children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
            }
            while (this.check('*')) {
                const t = this.consume();
                children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
            }
            const pName = this.peek();
            if (pName && pName.type === 'IDENTIFIER') {
                const t = this.consume();
                children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
            }

            if (this.check('[')) {
                const t1 = this.consume();
                children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
                const t2 = this.expect(']');
                if (t2) children.push(t2);
            }

            if (this.check(',')) {
                const t = this.consume();
                children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
            }
            safety++;
        }
        return { type: 'ParamList', children };
    }

    parseBlock() {
        const children = [];
        const t1 = this.consume();
        children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
        let safety = 0;
        while (this.peek() && !this.check('}') && safety < 500) {
            const prevPos = this.pos;
            const stmt = this.parseStatement();
            if (stmt) children.push(stmt);
            if (this.pos === prevPos) {
                const skip = this.consume();
                children.push({ type: 'Terminal', value: skip.value, tokenType: skip.type });
            }
            safety++;
        }
        const t2 = this.expect('}');
        if (t2) children.push(t2);
        return { type: 'BlockStatement', children };
    }

    parseStatement() {
        const token = this.peek();
        if (!token) return null;
        if (this.isTypeKeyword(token)) return this.parseDeclarationOrFunction();
        switch (token.value) {
            case 'if': return this.parseIf();
            case 'else': return this.parseElse();
            case 'while': return this.parseWhile();
            case 'for': return this.parseFor();
            case 'return': return this.parseReturn();
            case 'break': {
                const t1 = this.consume();
                const node = { type: 'BreakStatement', children: [{ type: 'Terminal', value: t1.value, tokenType: t1.type }] };
                const t2 = this.expect(';');
                if (t2) node.children.push(t2);
                return node;
            }
            case 'continue': {
                const t1 = this.consume();
                const node = { type: 'ContinueStatement', children: [{ type: 'Terminal', value: t1.value, tokenType: t1.type }] };
                const t2 = this.expect(';');
                if (t2) node.children.push(t2);
                return node;
            }
            case '{': return this.parseBlock();
        }
        return this.parseExpressionStatement();
    }

    parseIf() {
        const children = [];
        const t1 = this.consume();
        children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
        if (this.check('(')) {
            const t2 = this.consume();
            children.push({ type: 'Terminal', value: t2.value, tokenType: t2.type });
            children.push(this.collectExpression(')'));
            const t3 = this.expect(')');
            if (t3) children.push(t3);
        }
        children.push(this.check('{') ? this.parseBlock() : this.parseStatement());
        if (this.peek() && this.peek().value === 'else') {
            const t4 = this.consume();
            children.push({ type: 'Terminal', value: t4.value, tokenType: t4.type });
            if (this.peek() && this.peek().value === 'if') {
                children.push(this.parseIf());
            } else {
                children.push(this.check('{') ? this.parseBlock() : this.parseStatement());
            }
        }
        return { type: 'IfStatement', children };
    }

    parseElse() {
        const children = [];
        const t1 = this.consume();
        children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
        children.push(this.check('{') ? this.parseBlock() : this.parseStatement());
        return { type: 'ElseClause', children };
    }

    parseWhile() {
        const children = [];
        const t1 = this.consume();
        children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
        if (this.check('(')) {
            const t2 = this.consume();
            children.push({ type: 'Terminal', value: t2.value, tokenType: t2.type });
            children.push(this.collectExpression(')'));
            const t3 = this.expect(')');
            if (t3) children.push(t3);
        }
        children.push(this.check('{') ? this.parseBlock() : this.parseStatement());
        return { type: 'WhileStatement', children };
    }

    parseFor() {
        const children = [];
        const t1 = this.consume();
        children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
        if (this.check('(')) {
            const t2 = this.consume();
            children.push({ type: 'Terminal', value: t2.value, tokenType: t2.type });
            children.push(this.collectExpression(')'));
            const t3 = this.expect(')');
            if (t3) children.push(t3);
        }
        children.push(this.check('{') ? this.parseBlock() : this.parseStatement());
        return { type: 'ForStatement', children };
    }

    parseReturn() {
        const children = [];
        const t1 = this.consume();
        children.push({ type: 'Terminal', value: t1.value, tokenType: t1.type });
        if (this.peek() && !this.check(';')) {
            children.push(this.collectExpression(';'));
        }
        const t2 = this.expect(';');
        if (t2) children.push(t2);
        return { type: 'ReturnStatement', children };
    }

    parseExpressionStatement() {
        const children = [];
        const expr = this.collectExpression(';');
        if (expr) children.push(expr);
        const t1 = this.expect(';');
        if (t1) children.push(t1);
        return { type: 'ExpressionStatement', children };
    }

    collectExpression(stopChar) {
        const children = [];
        let depth = 0;
        let safety = 0;
        while (this.peek() && safety < 200) {
            const val = this.peek().value;
            if (val === stopChar && depth === 0) break;
            if ((val === '{' || val === '}') && depth === 0) break;
            if (val === '(') depth++;
            if (val === ')') {
                if (depth === 0) break;
                depth--;
            }
            const t = this.consume();
            children.push({ type: 'Terminal', value: t.value, tokenType: t.type });
            safety++;
        }
        return { type: 'Expression', children };
    }
}

window.generateParseTree = function(code) {
    
    
    const cleanCode = code
        .replace(/\/\/.*$/gm, '')               
        .replace(/\/\*[\s\S]*?\*\//g, '')         
        .replace(/#.*$/gm, '');                   

    const tokenizer = new CTokenizer(cleanCode);
    const tokens = tokenizer.tokenize();
    const parser = new CParseTreeParser(tokens);
    return parser.parse();
};

window.renderParseTreeHTMLInner = function(node) {
    if (!node) return '';

    var html = '<li>';

    if (node.type === 'Terminal') {
        html += '<span class="pt-node term">📝 \'' + escapeHtmlPT(node.value) + '\'</span>';
    } else {
        var icon = '💠';
        var styleClass = 'pt-node';
        if (node.type === 'Program') { icon = '📄'; styleClass += ' root'; }
        else if (node.type.includes('Function')) { icon = '🛠️'; styleClass += ' func'; }
        else if (node.type.includes('Variable') || node.type === 'ParamList') { icon = '📦'; styleClass += ' var'; }
        else if (node.type === 'BlockStatement') { icon = '🧱'; styleClass += ' block'; }
        else if (node.type.includes('Statement') && !node.type.includes('Return') && !node.type.includes('Expression')) { icon = '🔀'; styleClass += ' ctrl'; }
        else if (node.type.includes('Return') || node.type.includes('Break') || node.type.includes('Continue')) { icon = '↩️'; styleClass += ' ret'; }
        else if (node.type === 'Expression') { icon = '⚙️'; styleClass += ' expr'; }

        html += '<span class="' + styleClass + '">' + icon + ' ' + node.type + '</span>';
    }

    if (node.children && node.children.length > 0) {
        html += '<ul>';
        node.children.forEach(function(n) {
            html += window.renderParseTreeHTMLInner(n);
        });
        html += '</ul>';
    }

    html += '</li>';
    return html;
};

window.renderParseTreeHTML = function(node) {
    var html = '<div class="parse-tree-scroll">' +
               '<ul class="pt-tree-horizontal">' + 
               window.renderParseTreeHTMLInner(node) + 
               '</ul></div>';
    return html;
};

function escapeHtmlPT(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
