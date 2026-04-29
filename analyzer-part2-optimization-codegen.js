CAnalyzer.prototype.detectRedundantExpressions = function () {
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
CAnalyzer.prototype.detectDivisionByZero = function () {
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
CAnalyzer.prototype.detectConstantConditions = function () {
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
CAnalyzer.prototype.detectSelfAssignment = function () {
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
CAnalyzer.prototype.generateClearName = function (varName, varType) {
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
CAnalyzer.prototype.generateRefactoredCode = function () {
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
    let skipInfiniteLoop = false;
    let infiniteLoopBraceCount = 0;

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

        if (skipInfiniteLoop) {
            if (line.includes('{')) infiniteLoopBraceCount++;
            if (line.includes('}')) {
                infiniteLoopBraceCount--;
                if (infiniteLoopBraceCount === 0) {
                    skipInfiniteLoop = false;
                    this.stats.deadCodeRemoved++;
                }
            }
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

        // Remove infinite loops - while(1), while(true), for(;;)
        if (/while\s*\(\s*(1|true)\s*\)/.test(line) || /for\s*\(\s*;\s*;\s*\)/.test(line)) {
            let hasBreak = false;
            for (let j = idx + 1; j < Math.min(idx + 20, lines.length); j++) {
                if (/\bbreak\b|\breturn\b/.test(lines[j])) { hasBreak = true; break; }
                if (/^\s*}\s*$/.test(lines[j])) break;
            }
            if (!hasBreak) {
                // This is a true infinite loop - skip the entire loop block
                const indent = line.match(/^\s*/)[0];
                processedLines.push(indent + "// [RefactorX] Infinite loop removed");
                skipInfiniteLoop = true;
                infiniteLoopBraceCount = 0;
                // Count opening brace if it's on the same line
                if (line.includes('{')) infiniteLoopBraceCount++;
                this.stats.deadCodeRemoved++;
                continue;
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
                    // This is a true infinite loop - skip the entire loop block
                    skipInfiniteLoop = true;
                    infiniteLoopBraceCount = 0;
                    // Count opening brace if it's on the same line
                    if (line.includes('{')) infiniteLoopBraceCount++;
                    this.stats.deadCodeRemoved++;
                    continue;
                }
            }
        }

        // Remove while(var) loops where var only increases (infinite)
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

                // If definitely infinite (only increments, no break), remove the loop
                if (onlyIncrement && !hasDecrement && !hasBreak) {
                    skipInfiniteLoop = true;
                    infiniteLoopBraceCount = 0;
                    // Count opening brace if it's on the same line
                    if (line.includes('{')) infiniteLoopBraceCount++;
                    this.stats.deadCodeRemoved++;
                    continue;
                }
            }
        }

        // Remove while(var op value) loops where var is never modified (infinite)
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

            // If variable is never modified and no break, remove the infinite loop
            if (!varModified && !hasBreak) {
                skipInfiniteLoop = true;
                infiniteLoopBraceCount = 0;
                // Count opening brace if it's on the same line
                if (line.includes('{')) infiniteLoopBraceCount++;
                this.stats.deadCodeRemoved++;
                continue;
            }
        }

        // (keyword typos already fixed at top of loop)

        // Fix missing semicolons
        line = this.fixMissingSemicolon(line, idx);

        // Fix missing brackets - close unclosed [] at end of array access
        line = this.fixMissingBrackets(line);

        // Fix missing parentheses - close unclosed () on same line
        line = this.fixMissingParentheses(line);

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
        // Fix division by zero and redundant division
        line = line.replace(/(\w+)\s*\/\s*0\b/g, (m, v) => {
            this.stats.expressionsSimplified++;
            this.stats.conditionsFixed++;
            return '0'; // Replace x / 0 with 0 to avoid division by zero
        });
        line = line.replace(/\b(\w+)\s*\/\s*\1\b/g, (m, v) => {
            this.stats.expressionsSimplified++;
            return '1'; // Replace x / x with 1 (when x != 0)
        });

        // Variable renaming
        this.variableRenameMap.forEach((newName, oldName) => {
            const regex = new RegExp(`\\b${oldName}\\b`, 'g');
            if (regex.test(line)) { line = line.replace(regex, newName); this.stats.variablesRenamed++; }
        });

        processedLines.push(line);
    }

    // Pass 1.5: Wrap braceless control structures in {} braces
    // e.g.  while (a > 0)  →  while (a > 0) {
    //           a--;                a--;
    //                           }
    let wrappedLines = [];
    for (let i = 0; i < processedLines.length; i++) {
        const line = processedLines[i];
        const trimmed = line.trim();
        const stripped = trimmed.replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '').trim();

        // Detect control statements without opening brace on same line
        const isControlNoBrace = (
            (/^\s*(if|while|for)\s*\(/.test(stripped) && !stripped.includes('{') && !stripped.endsWith(';')) ||
            (/^\s*else\s*$/.test(stripped))
        );

        if (isControlNoBrace) {
            // Check if next non-empty line is a single statement (not a brace)
            let nextIdx = i + 1;
            while (nextIdx < processedLines.length && processedLines[nextIdx].trim() === '') nextIdx++;

            if (nextIdx < processedLines.length) {
                const nextTrimmed = processedLines[nextIdx].trim();
                // Only wrap if next line is a statement, not already a block
                if (nextTrimmed && nextTrimmed !== '{' && nextTrimmed !== '}') {
                    // Get indentation from current line
                    const indent = line.match(/^(\s*)/)[1];
                    const bodyIndent = indent + '    ';

                    wrappedLines.push(line.trimEnd() + ' {');
                    // Push the body line with proper indentation
                    wrappedLines.push(bodyIndent + processedLines[nextIdx].trim());
                    wrappedLines.push(indent + '}');
                    this.stats.conditionsFixed++;
                    i = nextIdx; // Skip the body line we just consumed
                    continue;
                }
            }
        }
        wrappedLines.push(line);
    }

    // Pass 1.7: Rescue orphaned code (return statements at brace depth 0)
    // If code appears outside any function body, pull it back inside
    let rescuedLines = [];
    let depth = 0;
    let lastClosingBraceAtZero = -1;

    // First pass: identify brace depths
    for (let i = 0; i < wrappedLines.length; i++) {
        const stripped = wrappedLines[i].replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');
        for (const ch of stripped) {
            if (ch === '{') depth++;
            if (ch === '}') depth--;
        }
        if (depth === 0 && wrappedLines[i].trim() === '}') {
            lastClosingBraceAtZero = i;
        }
    }

    // Second pass: if we find statements at depth 0 that should be inside a function,
    // insert them before the last closing brace
    depth = 0;
    let orphanedCode = [];
    let insertBeforeIdx = lastClosingBraceAtZero;

    for (let i = 0; i < wrappedLines.length; i++) {
        const trimmed = wrappedLines[i].trim();
        const stripped = wrappedLines[i].replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');

        let lineDepthBefore = depth;
        for (const ch of stripped) {
            if (ch === '{') depth++;
            if (ch === '}') depth--;
        }

        // If this line is at depth 0 and looks like it should be inside a function
        if (lineDepthBefore === 0 && depth === 0 && trimmed.length > 0 &&
            trimmed !== '}' && !trimmed.startsWith('#') && !trimmed.startsWith('//') &&
            !trimmed.startsWith('/*') && !trimmed.startsWith('*') &&
            !/^\s*(int|float|char|double|void|long|short|unsigned|signed|struct|enum|typedef)\s+\w+\s*\(/.test(trimmed)) {
            // This is orphaned code (like `return 0;` outside main)
            orphanedCode.push(wrappedLines[i]);
            continue;
        }

        // If this is an orphaned extra closing brace (depth goes negative)
        if (depth < 0) {
            depth = 0; // Reset depth
            this.stats.conditionsFixed++;
            continue; // Skip orphan brace
        }

        rescuedLines.push(wrappedLines[i]);
    }

    // Insert orphaned code before the last closing brace of the last function
    if (orphanedCode.length > 0 && insertBeforeIdx >= 0) {
        // Find where that closing brace ended up in rescuedLines
        let insertAt = -1;
        depth = 0;
        for (let i = 0; i < rescuedLines.length; i++) {
            const stripped = rescuedLines[i].replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');
            for (const ch of stripped) {
                if (ch === '{') depth++;
                if (ch === '}') depth--;
            }
            if (depth === 0 && rescuedLines[i].trim() === '}') {
                insertAt = i;
            }
        }

        if (insertAt >= 0) {
            // Get indentation from function body
            const bodyIndent = '    ';
            const indentedOrphans = orphanedCode.map(l => bodyIndent + l.trim());
            rescuedLines.splice(insertAt, 0, ...indentedOrphans);
            this.stats.conditionsFixed++;
        }
    }

    // Pass 2: Remove unreachable code
    let finalLines = [];
    let afterReturn = false;
    let braceDepth = 0;

    for (let line of rescuedLines) {
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

    // Pass 2.5: Fix all mismatched delimiters globally ({}, [], ())
    // -- Braces --
    let openBraces = 0;
    for (const line of finalLines) {
        const stripped = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');
        for (const ch of stripped) {
            if (ch === '{') openBraces++;
            if (ch === '}') openBraces--;
        }
    }
    while (openBraces > 0) {
        finalLines.push('}');
        openBraces--;
        this.stats.conditionsFixed++;
    }
    // Remove orphan closing braces (more } than {)
    if (openBraces < 0) {
        let excess = Math.abs(openBraces);
        for (let i = finalLines.length - 1; i >= 0 && excess > 0; i--) {
            if (finalLines[i].trim() === '}') {
                finalLines.splice(i, 1);
                excess--;
                this.stats.conditionsFixed++;
            }
        }
    }

    // -- Brackets [] --
    let openBrackets = 0;
    for (const line of finalLines) {
        const stripped = line.replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');
        for (const ch of stripped) {
            if (ch === '[') openBrackets++;
            if (ch === ']') openBrackets--;
        }
    }
    if (openBrackets > 0) {
        // Find last line with '[' and append missing ']'
        for (let i = finalLines.length - 1; i >= 0 && openBrackets > 0; i--) {
            const strippedLine = finalLines[i].replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '');
            if (strippedLine.includes('[')) {
                const semiIdx = finalLines[i].lastIndexOf(';');
                if (semiIdx > 0) {
                    finalLines[i] = finalLines[i].substring(0, semiIdx) + ']'.repeat(openBrackets) + finalLines[i].substring(semiIdx);
                } else {
                    finalLines[i] = finalLines[i].trimEnd() + ']'.repeat(openBrackets);
                }
                this.stats.expressionsSimplified++;
                openBrackets = 0;
            }
        }
    }

    // -- Parentheses () --
    let openParens = 0;
    for (const line of finalLines) {
        const stripped = line.replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');
        for (const ch of stripped) {
            if (ch === '(') openParens++;
            if (ch === ')') openParens--;
        }
    }
    if (openParens > 0) {
        // Find last line with '(' and append missing ')'
        for (let i = finalLines.length - 1; i >= 0 && openParens > 0; i--) {
            const strippedLine = finalLines[i].replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '');
            if (strippedLine.includes('(')) {
                const semiIdx = finalLines[i].lastIndexOf(';');
                if (semiIdx > 0) {
                    finalLines[i] = finalLines[i].substring(0, semiIdx) + ')'.repeat(openParens) + finalLines[i].substring(semiIdx);
                } else {
                    finalLines[i] = finalLines[i].trimEnd() + ')'.repeat(openParens);
                }
                this.stats.expressionsSimplified++;
                openParens = 0;
            }
        }
    }

    // Pass 3: Format output
    const formattedCode = this.formatCode(finalLines.join('\n'));
    this.refactoredCode = formattedCode || finalLines.join('\n');
};

// Phase 7: Code Generation - Fix Semicolons
CAnalyzer.prototype.fixMissingSemicolon = function (line, idx) {
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
CAnalyzer.prototype.fixInvalidParameters = function (line) {
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

// Phase 7: Code Generation - Fix Brackets []
CAnalyzer.prototype.fixMissingBrackets = function (line) {
    // Extract comment if exists
    const commentMatch = line.match(/(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[1] : '';
    const codeOnly = comment ? line.replace(comment, '').trimEnd() : line;

    // Strip strings for counting
    const cleaned = codeOnly.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');

    let open = 0, close = 0;
    for (const ch of cleaned) {
        if (ch === '[') open++;
        if (ch === ']') close++;
    }

    // Add missing closing brackets
    if (open > close) {
        const missing = open - close;
        const semiIdx = codeOnly.lastIndexOf(';');
        let fixedCode;
        if (semiIdx > 0) {
            fixedCode = codeOnly.substring(0, semiIdx) + ']'.repeat(missing) + codeOnly.substring(semiIdx);
        } else if (/^\s*(int|float|char|double|long|short|void)\s+\w+\s*\[/.test(codeOnly) ||
            /^\s*\w+\s*\[/.test(codeOnly)) {
            fixedCode = codeOnly.trimEnd() + ']'.repeat(missing) + ';';
        } else {
            fixedCode = codeOnly.trimEnd() + ']'.repeat(missing);
        }
        this.stats.expressionsSimplified++;
        return comment ? fixedCode + ' ' + comment : fixedCode;
    }

    // Remove extra closing brackets (more ] than [)
    if (close > open) {
        let excess = close - open;
        let fixedCode = codeOnly;
        while (excess > 0) {
            const lastIdx = fixedCode.lastIndexOf(']');
            if (lastIdx >= 0) {
                fixedCode = fixedCode.substring(0, lastIdx) + fixedCode.substring(lastIdx + 1);
                excess--;
            } else break;
        }
        this.stats.expressionsSimplified++;
        return comment ? fixedCode + ' ' + comment : fixedCode;
    }

    return line;
};

// Phase 7: Code Generation - Fix Parentheses ()
CAnalyzer.prototype.fixMissingParentheses = function (line) {
    // Extract comment if exists
    const commentMatch = line.match(/(\/\/.*)$/);
    const comment = commentMatch ? commentMatch[1] : '';
    const codeOnly = comment ? line.replace(comment, '').trimEnd() : line;

    // Strip strings for counting
    const cleaned = codeOnly.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '');

    let open = 0, close = 0;
    for (const ch of cleaned) {
        if (ch === '(') open++;
        if (ch === ')') close++;
    }

    // Add missing closing parens
    if (open > close) {
        const missing = open - close;
        const semiIdx = codeOnly.lastIndexOf(';');
        let fixedCode;
        if (semiIdx > 0) {
            fixedCode = codeOnly.substring(0, semiIdx) + ')'.repeat(missing) + codeOnly.substring(semiIdx);
        } else if (codeOnly.trim().endsWith('{')) {
            // e.g. `if (x == 5 {` → `if (x == 5) {`
            const braceIdx = codeOnly.lastIndexOf('{');
            fixedCode = codeOnly.substring(0, braceIdx).trimEnd() + ')'.repeat(missing) + ' ' + codeOnly.substring(braceIdx).trim();
        } else {
            fixedCode = codeOnly.trimEnd() + ')'.repeat(missing);
        }
        this.stats.expressionsSimplified++;
        return comment ? fixedCode + ' ' + comment : fixedCode;
    }

    // Remove extra closing parens
    if (close > open) {
        let excess = close - open;
        let fixedCode = codeOnly;
        while (excess > 0) {
            const lastIdx = fixedCode.lastIndexOf(')');
            if (lastIdx >= 0) {
                fixedCode = fixedCode.substring(0, lastIdx) + fixedCode.substring(lastIdx + 1);
                excess--;
            } else break;
        }
        this.stats.expressionsSimplified++;
        return comment ? fixedCode + ' ' + comment : fixedCode;
    }

    return line;
};

// Phase 7: Code Generation - Fix Array Bounds
CAnalyzer.prototype.fixArrayOutOfBounds = function (line) {
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
CAnalyzer.prototype.fixPrintfScanf = function (line) {
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
CAnalyzer.prototype.formatCode = function (code) {
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
