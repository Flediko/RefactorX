/*
 * PART 2: CODE OPTIMIZATION & CODE GENERATION
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ALGORITHMS USED IN THIS FILE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Algebraic Identity Detection (Pattern Matching)
 *    - Regex patterns match known identity operations: x+0, x*1, x*0, x/1, x-0
 *    - Flags redundant operations for removal/simplification
 *    ALTERNATES:
 *    • Common Subexpression Elimination (CSE) — reuses repeated computations
 *    • Global Value Numbering (GVN) — detects equivalences across basic blocks
 *    • Peephole Optimization — small window instruction replacement
 * 
 * 2. Constant Expression Detection
 *    - Pattern matches literal constants in conditions: if(0), if(1), while(0)
 *    - Identifies dead code blocks and always-true conditions
 *    ALTERNATES:
 *    • Constant Folding/Propagation — evaluates + propagates constants at compile time
 *    • Partial Redundancy Elimination (PRE) — combines CSE and LICM
 *    • Abstract Interpretation — proves properties on abstract domains
 * 
 * 3. Division by Zero Detection
 *    - Regex `/\s*0(?!\d)` detects division by literal zero
 *    ALTERNATES:
 *    • Symbolic Execution — explores all paths with symbolic variables
 *    • SMT Solvers (Z3) — proves/disproves if divisor can be zero
 *    • Constraint-Based Analysis — generates constraints over variables
 * 
 * 4. Self-Assignment Detection (Backreference Regex)
 *    - Uses regex `(\w+)\s*=\s*\1\s*;` where \1 is backreference
 *    - Catches `x = x;` patterns
 *    ALTERNATES:
 *    • Use-Def Chains — track if assigned value equals current value
 *    • SSA Form — trivially detects self-assignment (same SSA name)
 * 
 * 5. Multi-Pass Line-by-Line Code Transformation
 *    - Pass 1: applies all fixes (typos, semicolons, dead code removal, etc.)
 *    - Pass 2: removes unreachable code after return statements
 *    - Pass 2.5: counts and appends missing closing braces
 *    - Pass 3: applies formatCode() for indentation
 *    ALTERNATES:
 *    • AST-Based Code Generation — transform AST to source (Clang-format)
 *    • Source-to-Source Transformation — AST pattern matching (Coccinelle)
 *    • SSA-Based Optimization + Emission — LLVM IR approach
 *    • Automated Program Repair (GenProg) — genetic programming for fixes
 * 
 * 6. Constant Folding via eval()
 *    - Evaluates pure arithmetic: 3+5 → 8, 4*3 → 12
 *    ALTERNATES:
 *    • Tree-Walking Evaluator — evaluate AST nodes recursively
 *    • Strength Reduction — x*2 → x<<1
 *    • Loop-Invariant Code Motion (LICM) — hoist invariants out of loops
 * 
 * 7. Algebraic Simplification (Regex-Based)
 *    - x+0 → x, x*1 → x via pattern replacement
 *    ALTERNATES:
 *    • Term Rewriting Systems — formal rules for algebraic simplification
 *    • Dead Code Elimination (DCE) — uses liveness analysis on CFG
 * 
 * 8. Type-Based Variable Renaming
 *    - Renames short vars (≤3 chars) using predefined name pools per type
 *    - int → counter/number/value, float → decimal/ratio, etc.
 *    ALTERNATES:
 *    • Scope-Aware Renaming — considers variable scope for naming
 *    • ML-Based Name Suggestion — neural networks that suggest meaningful names
 * 
 * 9. Indentation-Based Code Formatter
 *    - Tracks brace depth, applies 4-space indentation per level
 *    - Normalizes operator spacing, fixes comma/semicolon spacing
 *    ALTERNATES:
 *    • AST Pretty-Printer — rebuilds source from AST (clang-format, Prettier)
 *    • Template-Based Generation — code templates with placeholder substitution
 * 
 * 10. Brace Balancing (Count & Append)
 *     - Counts all { and } (excluding strings/comments)
 *     - Appends missing } at the end of code
 *     ALTERNATES:
 *     • Parser Error Recovery — insert missing tokens during parsing
 *     • Syntax-Guided Synthesis (SyGuS) — synthesize fixes from specs
 * ═══════════════════════════════════════════════════════════════════
 * 
 * COMPILER PHASES IN THIS FILE:
 * - Phase 6: Code Optimization (redundancy, constants, dead code)
 * - Phase 7: Code Generation (fixing, formatting, refactoring)
 */

// Phase 6: Optimization - Redundant Expressions
CAnalyzer.prototype.detectRedundantExpressions = function() {
    const patterns = [
        { regex: /(\w+)\s*\+\s*0\b/, msg: 'Adding 0 has no effect' },
        { regex: /(\w+)\s*-\s*0\b/, msg: 'Subtracting 0 has no effect' },
        { regex: /(\w+)\s*\*\s*1\b/, msg: 'Multiplying by 1 has no effect' },
        { regex: /(\w+)\s*\/\s*1\b/, msg: 'Dividing by 1 has no effect' },
        { regex: /(\w+)\s*\*\s*0\b/, msg: 'Multiplying by 0 always gives 0' },
    ];

    this.lines.forEach((line, idx) => {
        patterns.forEach(({ regex, msg }) => {
            if (regex.test(line)) {
                this.addBug(
                    'RedundantExpression',
                    'info',
                    idx + 1,
                    msg,
                    `Simplify the expression`,
                    `Redundant operations can be removed.`
                );
            }
        });
    });
};

// Phase 4: Semantic Analysis - Division by Zero
CAnalyzer.prototype.detectDivisionByZero = function() {
    const pattern = /\/\s*0(?!\d)/g;
    this.lines.forEach((line, idx) => {
        if (pattern.test(line)) {
            this.addBug('DivisionByZero', 'critical', idx + 1,
                `Division by zero detected`, `Use a non-zero divisor`,
                `Division by zero causes runtime errors.`);
        }
        pattern.lastIndex = 0;
    });
};

// Phase 6: Optimization - Constant Conditions
CAnalyzer.prototype.detectConstantConditions = function() {
    const patterns = [
        { regex: /if\s*\(\s*0\s*\)/, msg: 'Condition is always false - code never executes', isDeadCode: true },
        { regex: /if\s*\(\s*false\s*\)/, msg: 'Condition is always false - code never executes', isDeadCode: true },
        { regex: /if\s*\(\s*1\s*\)/, msg: 'Condition is always true' },
        { regex: /while\s*\(\s*(0|false)\s*\)/, msg: 'Loop condition is always false - code never executes', isDeadCode: true },
    ];
    this.lines.forEach((line, idx) => {
        patterns.forEach(({ regex, msg, isDeadCode }) => {
            if (regex.test(line)) {
                this.addBug('ConstantCondition', 'warning', idx + 1, msg,
                    `Remove the dead code block`,
                    isDeadCode ? `Code inside this block will never execute - dead code.` : `Consider simplifying the condition.`);
            }
        });
    });
};

// Phase 6: Optimization - Self-Assignment
CAnalyzer.prototype.detectSelfAssignment = function() {
    const pattern = /(\w+)\s*=\s*\1\s*;/g;
    this.lines.forEach((line, idx) => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
            this.addBug('SelfAssignment', 'warning', idx + 1,
                `Self-assignment detected: '${match[1]} = ${match[1]}'`,
                `Remove the redundant assignment`,
                `Assigning a variable to itself has no effect.`);
        }
    });
};

// Phase 7: Code Generation - Variable Naming
CAnalyzer.prototype.generateClearName = function(varName, varType) {
    const clearNames = ['result', 'count', 'index', 'value', 'total', 'sum', 'main', 'argc', 'argv'];
    if (clearNames.includes(varName) || varName.length > 3) return varName;

    const typePrefix = {
        'int': ['counter', 'number', 'value', 'index', 'count'],
        'float': ['decimal', 'ratio', 'amount', 'rate'],
        'double': ['preciseValue', 'calculation'],
        'char': ['character', 'letter', 'symbol']
    };

    const prefixes = typePrefix[varType] || typePrefix['int'];
    this.variableCounter[varType] = (this.variableCounter[varType] || 0) + 1;
    const idx = this.variableCounter[varType] - 1;
    return idx < prefixes.length ? prefixes[idx] : `${prefixes[0]}${idx + 1}`;
};

// Phase 6 & 7: Optimization & Code Generation
CAnalyzer.prototype.generateRefactoredCode = function() {
    let lines = this.originalCode.split('\n');

    this.variables.forEach((info, varName) => {
        const newName = this.generateClearName(varName, info.type);
        if (newName !== varName) this.variableRenameMap.set(varName, newName);
    });

    // Pass 1: Line-by-line fixes
    let processedLines = [];
    let skipUntilBrace = false;
    let skipBraceCount = 0;
    let skipNextLine = false;
    let skipUnusedFunction = false;
    let unusedFuncBraceCount = 0;

    for (let idx = 0; idx < lines.length; idx++) {
        let line = lines[idx];

        // Fix keyword typos FIRST (before any removal logic)
        // This ensures 'itn main()' becomes 'int main()' before
        // the undefined function check would wrongly remove it
        line = this.fixKeywordTypos(line);

        const trimmed = line.trim();

        // Skip this line if flagged from previous iteration
        if (skipNextLine) {
            skipNextLine = false;
            this.stats.deadCodeRemoved++;
            continue;
        }

        // Skip unused function definitions
        if (skipUnusedFunction) {
            if (line.includes('{')) unusedFuncBraceCount++;
            if (line.includes('}')) {
                unusedFuncBraceCount--;
                if (unusedFuncBraceCount === 0) {
                    skipUnusedFunction = false;
                    this.stats.unusedRemoved++;
                }
            }
            continue;
        }

        // Check if this line starts an unused function definition
        if (this.unusedFunctions && this.unusedFunctions.size > 0) {
            for (const funcName of this.unusedFunctions) {
                const funcDefPattern = new RegExp(`^\\s*(int|float|char|double|void|long|short)\\s+${funcName}\\s*\\(`);
                if (funcDefPattern.test(trimmed)) {
                    skipUnusedFunction = true;
                    unusedFuncBraceCount = 0;
                    if (line.includes('{')) unusedFuncBraceCount = 1;
                    break;
                }
            }
            if (skipUnusedFunction) continue;
        }

        if (skipUntilBrace) {
            if (line.includes('{')) skipBraceCount++;
            if (line.includes('}')) {
                skipBraceCount--;
                if (skipBraceCount === 0) skipUntilBrace = false;
            }
            this.stats.deadCodeRemoved++;
            continue;
        }

        // Remove calls to undefined functions
        // BUT skip lines that are now valid function definitions (after typo fix)
        let skipLine = false;
        const isFuncDefAfterFix = /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?\s*(\/\/.*)?$/.test(trimmed);
        if (!isFuncDefAfterFix && this.undefinedFunctions && this.undefinedFunctions.size > 0) {
            for (const funcName of this.undefinedFunctions) {
                const callPattern = new RegExp(`^\\s*${funcName}\\s*\\([^)]*\\)\\s*;?\\s*$`);
                const callInLine = new RegExp(`\\b${funcName}\\s*\\([^)]*\\)\\s*;?`);
                if (callPattern.test(trimmed) || callInLine.test(trimmed)) {
                    skipLine = true;
                    this.stats.deadCodeRemoved++;
                    break;
                }
            }
        }
        if (skipLine) continue;

        // Strip comments for pattern matching
        const codeWithoutComment = trimmed.replace(/\/\/.*$/, '').trim();

        // Fix malformed control structures - } or { in wrong places
        // Fix: (x > 0} -> (x > 0) - brace used instead of parenthesis
        line = line.replace(/\(\s*([^(){}]+)\s*\}\s*\{/g, '($1) {');
        line = line.replace(/\(\s*([^(){}]+)\s*\}/g, '($1)');
        // Fix: while(x}{ -> while(x) {
        line = line.replace(/\b(while|if)\s*\(\s*(\w+)\s*\}\s*\{/, '$1($2) {');
        // Fix: while(x{ -> while(x) {  
        line = line.replace(/\b(while|if)\s*\(\s*(\w+)\s*\{/, '$1($2) {');
        // Fix: (condition){ -> (condition) {
        line = line.replace(/\)\s*\{/g, ') {');

        if (/\b(while|if|for)\s*\([^)]*[\{\}]/.test(codeWithoutComment)) {
            this.stats.conditionsFixed++;
        }

        // Fix uninitialized variables - add = 0 initialization
        if (this.uninitializedVariables.size > 0) {
            for (const [varName, info] of this.uninitializedVariables) {
                // Match declaration without initialization: int x;
                const declPattern = new RegExp(`(int|float|char|double|long|short)\\s+${varName}\\s*;`);
                if (declPattern.test(line)) {
                    // Get the appropriate default value based on type
                    const defaultVal = info.type === 'char' ? "'\\0'" :
                        (info.type === 'float' || info.type === 'double') ? '0.0' : '0';
                    line = line.replace(declPattern, `$1 ${varName} = ${defaultVal};`);
                    this.stats.conditionsFixed++;
                }
            }
        }

        // Notify about while(false) or while(0) loops - dead code
        if (/while\s*\(\s*(0|false)\s*\)/.test(codeWithoutComment)) {
            const indent = line.match(/^\s*/)[0];
            processedLines.push(indent + "// [RefactorX Warning] Dead code loop detected: condition is always false");
            // Block is preserved
        }

        // Notify about if(false) or if(0) blocks - dead code
        if (/if\s*\(\s*(0|false)\s*\)/.test(codeWithoutComment)) {
            const indent = line.match(/^\s*/)[0];
            processedLines.push(indent + "// [RefactorX Warning] Dead code block detected: condition is always false");
            // Block is preserved
        }

        // Remove unused variable declarations (but preserve lines with function calls)
        if (this.unusedVariables.size > 0) {
            let isUnusedDecl = false;
            for (const unusedVar of this.unusedVariables) {
                // Match: int x; or int x = value;
                const declPattern = new RegExp(`^\\s*(int|float|char|double|long|short)\\s+${unusedVar}\\s*(=\\s*[^;]+)?\\s*;\\s*$`);
                if (declPattern.test(codeWithoutComment)) {
                    // Check if there's a function call in the initialization - if so, keep the line
                    const funcCallMatch = codeWithoutComment.match(/=\s*([a-zA-Z_]\w*)\s*\([^)]*\)/);
                    if (funcCallMatch && !['int', 'float', 'char', 'double', 'void'].includes(funcCallMatch[1])) {
                        // Has function call - keep the entire line as-is
                        break;
                    }
                    isUnusedDecl = true;
                    this.stats.unusedRemoved++;
                    break;
                }
            }
            if (isUnusedDecl) continue;
        }

        // Remove self-assignments (standalone line)
        if (/^(\w+)\s*=\s*\1\s*;?\s*$/.test(codeWithoutComment)) {
            this.stats.expressionsSimplified++;
            continue;
        }

        // Remove self-assignments within a line (e.g., in if block: x = x;)
        line = line.replace(/(\w+)\s*=\s*\1\s*;/g, (match, varName) => {
            this.stats.expressionsSimplified++;
            return '';  // Remove self-assignment
        });

        // If line became empty after removing self-assignment, skip it
        if (line.trim() === '' || line.trim() === '//') {
            continue;
        }

        // Remove empty statements (single line)
        const codeForEmptyCheck = line.replace(/\/\/.*$/, '').trim();
        if (/if\s*\([^)]+\)\s*;\s*$/.test(codeForEmptyCheck) ||
            /while\s*\([^)]+\)\s*;\s*$/.test(codeForEmptyCheck) ||
            /for\s*\([^)]+\)\s*;\s*$/.test(codeForEmptyCheck) ||
            /if\s*\([^)]+\)\s*\{\s*\}\s*$/.test(codeForEmptyCheck) ||
            /while\s*\([^)]+\)\s*\{\s*\}\s*$/.test(codeForEmptyCheck) ||
            /for\s*\([^)]+\)\s*\{\s*\}\s*$/.test(codeForEmptyCheck) ||
            /else\s*\{\s*\}\s*$/.test(codeForEmptyCheck) ||
            /else\s*;\s*$/.test(codeForEmptyCheck)) {
            this.stats.deadCodeRemoved++;
            continue;
        }

        // Check for multi-line empty blocks: if/while/for/else { followed by }
        const nextLine = idx + 1 < lines.length ? lines[idx + 1].trim() : '';
        if (/^(if\s*\([^)]+\)|else\s*if\s*\([^)]+\)|else|while\s*\([^)]+\)|for\s*\([^)]+\))\s*\{\s*$/.test(codeForEmptyCheck) && nextLine === '}') {
            // Skip this line and flag next line (closing brace) for removal
            this.stats.deadCodeRemoved++;
            skipNextLine = true;
            continue;
        }

        // Notify about infinite loops - while(1), while(true), for(;;)
        if (/while\s*\(\s*(1|true)\s*\)/.test(line) || /for\s*\(\s*;\s*;\s*\)/.test(line)) {
            let hasBreak = false;
            for (let j = idx + 1; j < Math.min(idx + 20, lines.length); j++) {
                if (/\bbreak\b|\breturn\b/.test(lines[j])) { hasBreak = true; break; }
                if (/^\s*}\s*$/.test(lines[j])) break;
            }
            if (!hasBreak) {
                const indent = line.match(/^\s*/)[0];
                processedLines.push(indent + "// [RefactorX Warning] Infinite loop detected");
                // Block is preserved
            }
        }

        // Remove contradictory for loops (e.g., for(int i = 0; i >= 0; i++))
        const forLoopMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(>=|>|<=|<)\s*(-?\d+)\s*;\s*(\w+)(\+\+|--|\s*\+=\s*\d+|\s*-=\s*\d+)/);
        if (forLoopMatch) {
            const [, initVar, initVal, condVar, condOp, condVal, incrVar, incrOp] = forLoopMatch;
            const initNum = parseInt(initVal);
            const condNum = parseInt(condVal);

            if (initVar === condVar && condVar === incrVar) {
                let isInfinite = false;

                // Case: i = 0; i >= 0; i++ (always true, incrementing)
                if ((condOp === '>=' || condOp === '>') && (incrOp === '++' || incrOp.includes('+='))) {
                    if (initNum >= condNum) isInfinite = true;
                }
                // Case: i = 0; i <= 10; i-- (never terminates, decrementing wrong way)
                if ((condOp === '<=' || condOp === '<') && (incrOp === '--' || incrOp.includes('-='))) {
                    if (initNum <= condNum) isInfinite = true;
                }

                if (isInfinite) {
                    const indent = line.match(/^\s*/)[0];
                    processedLines.push(indent + "// [RefactorX Warning] Infinite loop detected (contradictory condition)");
                }
            }
        }

        // Detect and add warning comment for while(var) where var only increases
        const whileVarMatch = line.match(/while\s*\(\s*(\w+)\s*\)/);
        if (whileVarMatch) {
            const loopVar = whileVarMatch[1];
            if (!/^\d+$/.test(loopVar)) { // Not a constant
                let hasDecrement = false;
                let hasBreak = false;
                let onlyIncrement = false;

                for (let j = idx + 1; j < Math.min(idx + 30, lines.length); j++) {
                    const bodyLine = lines[j];
                    if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                    if (new RegExp(`${loopVar}\\s*--`).test(bodyLine) ||
                        new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=\\s*0\\s*;`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*-=`).test(bodyLine)) {
                        hasDecrement = true;
                    }
                    if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) ||
                        new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=\\s*${loopVar}\\s*\\+`).test(bodyLine)) {
                        onlyIncrement = true;
                    }
                    if (/^\s*}\s*$/.test(bodyLine)) break;
                }

                // If definitely infinite (only increments, no break), warn instead of removing
                if (onlyIncrement && !hasDecrement && !hasBreak) {
                    const indent = line.match(/^\s*/)[0];
                    processedLines.push(indent + "// [RefactorX Warning] Infinite loop detected (variable only increments)");
                }
            }
        }

        // Notify about while(var op value) where var is never modified
        const whileCompMatch = line.match(/while\s*\(\s*(\w+)\s*(<=?|>=?|==|!=)\s*\d+\s*\)/);
        if (whileCompMatch) {
            const loopVar = whileCompMatch[1];
            let varModified = false;
            let hasBreak = false;

            for (let j = idx + 1; j < Math.min(idx + 30, lines.length); j++) {
                const bodyLine = lines[j];
                if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) ||
                    new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*--`).test(bodyLine) ||
                    new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*-=`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*=`).test(bodyLine)) {
                    varModified = true;
                }
                if (/^\s*}\s*$/.test(bodyLine)) break;
            }

            // If variable is never modified and no break, warn instead of removing the infinite loop
            if (!varModified && !hasBreak) {
                const indent = line.match(/^\s*/)[0];
                processedLines.push(indent + "// [RefactorX Warning] Infinite loop detected (variable is never modified)");
            }
        }

        // (keyword typos already fixed at top of loop)

        // Fix missing semicolons
        line = this.fixMissingSemicolon(line, idx);

        // Fix missing brackets - close unclosed ones at end of array access
        line = this.fixMissingBrackets(line);

        // Fix invalid function parameters (add types)
        line = this.fixInvalidParameters(line);

        // Fix assignments in conditions
        line = line.replace(/if\s*\(\s*(\w+)\s*=\s*([^=)]+)\)/g, (match, v, val) => {
            if (!val.includes('=') && !val.includes('!') && !val.includes('<') && !val.includes('>')) {
                this.stats.conditionsFixed++;
                return `if (${v} == ${val.trim()})`;
            }
            return match;
        });

        // Fix array out of bounds in for loops
        line = this.fixArrayOutOfBounds(line);

        // Fix printf/scanf errors
        line = this.fixPrintfScanf(line);

        // Constant folding
        line = line.replace(/(\d+)\s*\+\s*(\d+)/g, (m, a, b) => { this.stats.constantsFolded++; return String(parseInt(a) + parseInt(b)); });
        line = line.replace(/(\d+)\s*\*\s*(\d+)/g, (m, a, b) => { this.stats.constantsFolded++; return String(parseInt(a) * parseInt(b)); });

        // Algebraic simplification
        line = line.replace(/(\w+)\s*\+\s*0\b/g, (m, v) => { this.stats.expressionsSimplified++; return v; });
        line = line.replace(/(\w+)\s*\*\s*1\b/g, (m, v) => { this.stats.expressionsSimplified++; return v; });

        // Variable renaming
        this.variableRenameMap.forEach((newName, oldName) => {
            const regex = new RegExp(`\\b${oldName}\\b`, 'g');
            if (regex.test(line)) { line = line.replace(regex, newName); this.stats.variablesRenamed++; }
        });

        processedLines.push(line);
    }

    // Pass 2: Remove unreachable code
    let finalLines = [];
    let afterReturn = false;
    let braceDepth = 0;

    for (let line of processedLines) {
        const trimmed = line.trim();
        if (trimmed.includes('{')) braceDepth++;
        if (trimmed.includes('}')) { braceDepth--; afterReturn = false; }
        if (afterReturn && trimmed.length > 0 && trimmed !== '}' && !trimmed.startsWith('//')) {
            this.stats.deadCodeRemoved++;
            continue;
        }
        if (/\breturn\b.*;/.test(trimmed)) afterReturn = true;
        finalLines.push(line);
    }

    // Pass 2.5: Add missing closing braces
    let openBraces = 0;
    for (const line of finalLines) {
        const stripped = line.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
        for (const ch of stripped) {
            if (ch === '{') openBraces++;
            if (ch === '}') openBraces--;
        }
    }
    // Append missing closing braces
    while (openBraces > 0) {
        finalLines.push('}');
        openBraces--;
        this.stats.conditionsFixed++;
    }

    // Pass 3: Format output
    const formattedCode = this.formatCode(finalLines.join('\n'));
    this.refactoredCode = formattedCode || finalLines.join('\n');
};

// Phase 7: Code Generation - Fix Semicolons
CAnalyzer.prototype.fixMissingSemicolon = function(line, idx) {
    const trimmed = line.trim();

    // Skip if empty or is full-line comment
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#') ||
        trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return line;
    }

    // Extract comment if exists
    const commentMatch = line.match(/(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[1] : '';
    const codeOnly = comment ? line.replace(comment, '').trimEnd() : line.trimEnd();
    const codeOnlyTrimmed = codeOnly.trim();

    // Skip if already has semicolon, or ends with braces
    if (codeOnlyTrimmed.endsWith(';') || codeOnlyTrimmed.endsWith('{') ||
        codeOnlyTrimmed.endsWith('}') || codeOnlyTrimmed === '}') {
        return line;
    }

    // Skip control structures
    if (/^(if|else|while|for|switch|do)\s*[\({]/.test(codeOnlyTrimmed) || codeOnlyTrimmed === 'else') {
        return line;
    }

    // Skip function definitions (with opening brace or without)
    if (/^(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?$/.test(codeOnlyTrimmed)) {
        return line;
    }

    // Patterns that need semicolons
    const needsSemicolon = [
        /^(int|float|char|double|long|short)\s+\w+(\s*\[[^\]]*\])?\s*(=\s*[^;{]+)?$/,  // Variable/array declaration
        /^\w+\s*=\s*[^;{]+$/,  // Assignment
        /^\w+\s*\([^)]*\)$/,  // Function call like func() or printf("hello")
        /^return\s+[^;]*$/,  // Return
        /^return$/,  // Just return
        /^(break|continue)$/,  // break/continue
        /^\w+\s*(\+\+|--)$/,  // Postfix increment/decrement
        /^(\+\+|--)\s*\w+$/,  // Prefix increment/decrement
    ];

    for (const pattern of needsSemicolon) {
        if (pattern.test(codeOnlyTrimmed)) {
            this.stats.expressionsSimplified++;
            // Add semicolon before comment if there's a comment
            if (comment) {
                return codeOnly + '; ' + comment;
            }
            return codeOnly + ';';
        }
    }

    return line;
};

// Phase 7: Code Generation - Fix Parameters
CAnalyzer.prototype.fixInvalidParameters = function(line) {
    // Extract comment if exists
    const commentMatch = line.match(/(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[1] : '';
    const codeOnly = comment ? line.replace(comment, '').trimEnd() : line;

    // Match function definition with parameters missing types
    const funcDefMatch = codeOnly.match(/^(\s*)(int|float|char|double|void|long|short)\s+(\w+)\s*\(([^)]*)\)\s*(\{?)\s*$/);
    if (funcDefMatch) {
        const indent = funcDefMatch[1];
        const returnType = funcDefMatch[2];
        const funcName = funcDefMatch[3];
        const params = funcDefMatch[4];
        const brace = funcDefMatch[5] || '';

        if (params.trim() !== '' && params.trim() !== 'void') {
            let needsFix = false;
            const paramList = params.split(',');
            const fixedParams = paramList.map(p => {
                const trimmedP = p.trim();
                // Check if parameter has a type
                if (!/^(int|float|char|double|void|long|short)\s+/.test(trimmedP) &&
                    !/^(int|float|char|double|void|long|short)\s*\*/.test(trimmedP) &&
                    trimmedP !== '...' && trimmedP !== 'void' && trimmedP !== '') {
                    // Add int type by default
                    needsFix = true;
                    this.stats.expressionsSimplified++;
                    return `int ${trimmedP}`;
                }
                return trimmedP;
            });
            if (needsFix) {
                let result = `${indent}${returnType} ${funcName}(${fixedParams.join(', ')})`;
                if (brace) result += ' ' + brace;
                if (comment) result += ' ' + comment;
                return result.trimEnd();
            }
        }
    }
    return line;
};

// Phase 7: Code Generation - Fix Brackets
CAnalyzer.prototype.fixMissingBrackets = function(line) {
    // Extract comment if exists
    const commentMatch = line.match(/(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[1] : '';
    const codeOnly = comment ? line.replace(comment, '').trimEnd() : line;

    let openBrackets = 0;
    let closeBrackets = 0;
    let inString = false;

    for (let i = 0; i < codeOnly.length; i++) {
        const char = codeOnly[i];
        const prevChar = i > 0 ? codeOnly[i - 1] : '';

        if (char === '"' && prevChar !== '\\') inString = !inString;
        if (inString) continue;

        if (char === '[') openBrackets++;
        if (char === ']') closeBrackets++;
    }

    // Add missing closing brackets
    if (openBrackets > closeBrackets) {
        const missing = openBrackets - closeBrackets;

        // Find position to insert - before semicolon if exists
        const semiIdx = codeOnly.lastIndexOf(';');
        let fixedCode;
        if (semiIdx > 0) {
            fixedCode = codeOnly.substring(0, semiIdx) + ']'.repeat(missing) + codeOnly.substring(semiIdx);
        } else {
            // No semicolon - add bracket and semicolon if it's a declaration
            if (/^\s*(int|float|char|double|long|short|void)\s+\w+\s*\[/.test(codeOnly) ||
                /^\s*\w+\s*\[/.test(codeOnly)) {
                fixedCode = codeOnly.trimEnd() + ']'.repeat(missing) + ';';
            } else {
                fixedCode = codeOnly.trimEnd() + ']'.repeat(missing);
            }
        }
        this.stats.expressionsSimplified++;
        return comment ? fixedCode + ' ' + comment : fixedCode;
    }

    return line;
};

// Phase 7: Code Generation - Fix Array Bounds
CAnalyzer.prototype.fixArrayOutOfBounds = function(line) {
    // Match for loop pattern: for(int i=0; i<LIMIT; i++)
    const forLoopPattern = /for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=)\s*(\d+)\s*;/;
    const match = line.match(forLoopPattern);

    if (!match) return line;

    const loopVar = match[1];
    const operator = match[3];
    const limitVal = parseInt(match[4], 10);

    // Calculate max index
    let maxIndex;
    if (operator === '<') {
        maxIndex = limitVal - 1;
    } else if (operator === '<=') {
        maxIndex = limitVal;
    }

    // Find the line index of this for loop in the original lines
    const lineIdx = this.lines.findIndex(l => l.includes(line.trim()) || l.trim() === line.trim());

    // Look at the loop body (next few lines) to find array access with loop variable
    let needsFix = false;
    let correctLimit = null;

    if (lineIdx !== -1) {
        for (let j = lineIdx; j < Math.min(lineIdx + 15, this.lines.length); j++) {
            const innerLine = this.lines[j];
            // Check for array access with the loop variable
            const arrayAccessPattern = new RegExp(`(\\w+)\\s*\\[\\s*${loopVar}\\s*\\]`);
            const accessMatch = innerLine.match(arrayAccessPattern);

            if (accessMatch) {
                const arrayName = accessMatch[1];
                if (this.arrays.has(arrayName)) {
                    const arrayInfo = this.arrays.get(arrayName);
                    if (maxIndex !== undefined && maxIndex >= arrayInfo.size) {
                        needsFix = true;
                        correctLimit = arrayInfo.size;
                        break;
                    }
                }
            }

            // Stop if we hit a closing brace at indent level 0 (end of loop)
            if (j > lineIdx && /^\s*\}\s*$/.test(innerLine)) break;
        }
    }

    if (needsFix && correctLimit !== null) {
        // Fix the loop condition
        const oldCondition = new RegExp(`${loopVar}\\s*(<=?)\\s*${limitVal}`);
        line = line.replace(oldCondition, `${loopVar} < ${correctLimit}`);
        this.stats.conditionsFixed++;
    }

    return line;
};

// Phase 7: Code Generation - Fix Printf/Scanf
CAnalyzer.prototype.fixPrintfScanf = function(line) {
    // Fix printf(variable) -> printf("%d", variable) or appropriate format
    const printfPattern = /\bprintf\s*\(\s*([^")][^,)]*)\s*\)/g;

    line = line.replace(printfPattern, (match, arg) => {
        const varName = arg.trim();

        // Skip if it's a string literal, macro, or empty
        if (!varName || varName.startsWith('"') || varName.startsWith("'") ||
            /^[A-Z_]+$/.test(varName)) {
            return match;
        }

        // Determine format specifier based on variable type
        let formatSpec = '%d'; // default to int
        if (this.variables.has(varName)) {
            const varInfo = this.variables.get(varName);
            switch (varInfo.type) {
                case 'float': formatSpec = '%f'; break;
                case 'double': formatSpec = '%lf'; break;
                case 'char': formatSpec = '%c'; break;
                case 'long': formatSpec = '%ld'; break;
                default: formatSpec = '%d';
            }
        }

        this.stats.expressionsSimplified++;
        return `printf("${formatSpec}", ${varName})`;
    });

    // Fix scanf without & for non-string arguments
    const scanfPattern = /\bscanf\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\)/g;

    line = line.replace(scanfPattern, (match, formatStr, args) => {
        const formatSpecs = formatStr.match(/%[diouxXeEfFgGaAcspn]/g) || [];
        const argList = args.split(',').map(a => a.trim());
        let changed = false;

        const fixedArgs = argList.map((arg, i) => {
            const spec = formatSpecs[i] || '%d';

            // Add & if missing for non-string types
            if (spec !== '%s' && arg && !arg.startsWith('&') &&
                /^[a-zA-Z_]\w*$/.test(arg)) {
                changed = true;
                return `&${arg}`;
            }
            return arg;
        });

        if (changed) {
            this.stats.expressionsSimplified++;
            return `scanf("${formatStr}", ${fixedArgs.join(', ')})`;
        }
        return match;
    });

    // Fix printf format-argument mismatch: remove extra specifiers if no args
    // e.g., printf("%d") -> printf("%d", 0) — adds a default placeholder argument
    const printfFmtMismatchPattern = /\bprintf\s*\(\s*"([^"]*)"\s*\)/g;
    line = line.replace(printfFmtMismatchPattern, (match, formatStr) => {
        const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
        if (fmtSpecs.length === 0) return match; // No specifiers, just a plain string — fine

        // Generate default arguments for each specifier
        const defaultArgs = fmtSpecs.map(spec => {
            if (spec === '%s') return '""';
            if (spec === '%c') return "'\\0'";
            if (spec === '%f' || spec === '%lf') return '0.0';
            return '0';
        });

        this.stats.conditionsFixed++;
        return `printf("${formatStr}", ${defaultArgs.join(', ')}) /* TODO: replace placeholder args */`;
    });

    // Fix printf with more specifiers than arguments: add placeholder args
    const printfPartialPattern = /\bprintf\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\)/g;
    line = line.replace(printfPartialPattern, (match, formatStr, argsStr) => {
        const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
        const argList = argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);

        if (fmtSpecs.length <= argList.length) return match; // Enough args already

        // Add placeholder args for missing ones
        const extraArgs = [];
        for (let i = argList.length; i < fmtSpecs.length; i++) {
            const spec = fmtSpecs[i];
            if (spec === '%s') extraArgs.push('""');
            else if (spec === '%c') extraArgs.push("'\\0'");
            else if (spec === '%f' || spec === '%lf') extraArgs.push('0.0');
            else extraArgs.push('0');
        }

        this.stats.conditionsFixed++;
        const allArgs = [...argList, ...extraArgs].join(', ');
        return `printf("${formatStr}", ${allArgs}) /* TODO: replace placeholder args */`;
    });

    return line;
};

// Phase 7: Code Generation - Format Code
CAnalyzer.prototype.formatCode = function(code) {
    const lines = code.split('\n');
    let indentLevel = 0;
    const indentStr = '    ';
    let formattedLines = [];
    let lastLineWasEmpty = false;

    for (let i = 0; i < lines.length; i++) {
        let trimmed = lines[i].trim();

        // Skip multiple consecutive empty lines
        if (trimmed === '') {
            if (!lastLineWasEmpty && formattedLines.length > 0) {
                formattedLines.push('');
                lastLineWasEmpty = true;
            }
            continue;
        }
        lastLineWasEmpty = false;

        // Count braces to adjust indent
        let openBraces = (trimmed.match(/\{/g) || []).length;
        let closeBraces = (trimmed.match(/\}/g) || []).length;

        // Decrease indent before closing brace (if line starts with })
        if (trimmed.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Separate code and comment
        let code = trimmed;
        let comment = '';
        const commentIdx = trimmed.indexOf('//');
        if (commentIdx !== -1) {
            code = trimmed.substring(0, commentIdx).trim();
            comment = trimmed.substring(commentIdx);
        }

        // Fix spacing in code part only (not in strings or comments)
        if (code && !code.includes('"')) {
            // Add space around binary operators
            code = code.replace(/([a-zA-Z0-9_\)])\s*([+\-*/%])\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');
            code = code.replace(/([a-zA-Z0-9_\)])\s*([<>=!]=?)\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');
            code = code.replace(/([a-zA-Z0-9_\)])\s*(&&|\|\|)\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');

            // Fix assignment operator
            code = code.replace(/([a-zA-Z0-9_\]])\s*=\s*([^=])/g, '$1 = $2');

            // Fix comparison operators that got messed up
            code = code.replace(/= =/g, '==');
            code = code.replace(/! =/g, '!=');
            code = code.replace(/< =/g, '<=');
            code = code.replace(/> =/g, '>=');

            // Fix increment/decrement
            code = code.replace(/\+ \+/g, '++');
            code = code.replace(/- -/g, '--');

            // Fix compound assignment
            code = code.replace(/\+ =/g, '+=');
            code = code.replace(/- =/g, '-=');
            code = code.replace(/\* =/g, '*=');
            code = code.replace(/\/ =/g, '/=');
        }

        // Fix comma spacing
        code = code.replace(/\s*,\s*/g, ', ');

        // Remove space before semicolon
        code = code.replace(/\s+;/g, ';');

        // Fix parentheses spacing
        code = code.replace(/\(\s+/g, '(');
        code = code.replace(/\s+\)/g, ')');

        // Fix bracket spacing
        code = code.replace(/\[\s+/g, '[');
        code = code.replace(/\s+\]/g, ']');

        // Remove multiple spaces
        code = code.replace(/\s{2,}/g, ' ');

        // Reconstruct line
        let finalLine = code;
        if (comment) {
            finalLine = code ? code + '  ' + comment : comment;
        }

        // Add the line with proper indentation
        formattedLines.push(indentStr.repeat(indentLevel) + finalLine);

        // Increase indent after opening brace (if line ends with { and doesn't start with })
        if (trimmed.endsWith('{') && !trimmed.startsWith('}')) {
            indentLevel++;
        } else if (openBraces > closeBraces && !trimmed.startsWith('}')) {
            // Handle cases like "} else {"
            indentLevel += (openBraces - closeBraces);
        }
    }

    // Second pass: add blank lines for readability
    let result = [];
    for (let i = 0; i < formattedLines.length; i++) {
        const line = formattedLines[i];
        const nextLine = i + 1 < formattedLines.length ? formattedLines[i + 1] : '';
        const prevLine = i > 0 ? formattedLines[i - 1] : '';

        result.push(line);

        // Add blank line after #include blocks
        if (line.trim().startsWith('#include') && nextLine.trim() && !nextLine.trim().startsWith('#include')) {
            result.push('');
        }

        // Add blank line after closing brace of function (at indent level 0)
        if (line.trim() === '}' && !line.startsWith(' ') && nextLine.trim() && !nextLine.trim().startsWith('#')) {
            result.push('');
        }
    }

    return result.join('\n');
};
