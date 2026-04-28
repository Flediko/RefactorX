CAnalyzer.prototype.damerauLevenshteinDistance = function (str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
            if (i > 1 && j > 1 &&
                str1[i - 1] === str2[j - 2] &&
                str1[i - 2] === str2[j - 1]) {
                dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
            }
        }
    }
    return dp[m][n];
};

CAnalyzer.prototype.fuzzyMatchKeyword = function (token) {
    const cKeywords = [
        'int', 'float', 'char', 'double', 'void', 'long', 'short',
        'unsigned', 'signed', 'const', 'static', 'extern', 'struct',
        'enum', 'typedef', 'union', 'volatile', 'register', 'auto',
        'if', 'else', 'while', 'for', 'do', 'switch', 'case',
        'break', 'continue', 'return', 'goto', 'default',
        'sizeof', 'include', 'define', 'main', 'printf', 'scanf',
        'malloc', 'free', 'NULL', 'stdin', 'stdout', 'stderr'
    ];

    const lowerToken = token.toLowerCase();
    if (cKeywords.some(k => k.toLowerCase() === lowerToken)) return null;
    if (token.length < 2 || token.length > 12) return null;

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const keyword of cKeywords) {
        if (Math.abs(token.length - keyword.length) > 2) continue;
        const distance = this.damerauLevenshteinDistance(lowerToken, keyword.toLowerCase());
        const maxAllowed = keyword.length <= 3 ? 1 : 2;
        if (distance > 0 && distance <= maxAllowed && distance < bestDistance) {
            bestDistance = distance;
            bestMatch = keyword;
        }
    }
    return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
};

CAnalyzer.prototype.detectKeywordTypos = function () {
    this.keywordTypoFixes = new Map();
    const ignoreTokens = new Set([
        'argc', 'argv', 'NULL', 'true', 'false', 'EOF', 'size', 'file',
        'data', 'temp', 'result', 'count', 'index', 'value', 'total',
        'sum', 'flag', 'test', 'node', 'list', 'next', 'prev', 'head',
        'tail', 'left', 'right', 'root', 'key', 'num', 'str', 'ptr',
        'len', 'max', 'min', 'arr', 'buf', 'ret', 'err', 'msg', 'log',
        'end', 'start', 'pos', 'cur', 'new', 'old', 'src', 'dst',
        'tmp', 'val', 'idx', 'cnt', 'var', 'res', 'out', 'die',
        'counter', 'number', 'decimal', 'letter', 'symbol', 'amount'
    ]);

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
            trimmed.startsWith('*') || trimmed.startsWith('#')) return;

        const lineWithoutStrings = trimmed.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        const tokens = lineWithoutStrings.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
        if (!tokens) return;

        for (const token of tokens) {
            if (ignoreTokens.has(token)) continue;
            if (this.variables.has(token)) continue;
            if (this.functions.has(token)) continue;
            if (this.isStandardFunction(token)) continue;

            const fuzzyResult = this.fuzzyMatchKeyword(token);
            if (fuzzyResult) {
                this.keywordTypoFixes.set(token, fuzzyResult.match);
                this.addBug('KeywordTypo', 'error', idx + 1,
                    `Possible typo: '${token}' — did you mean '${fuzzyResult.match}'? (Damerau-Levenshtein distance: ${fuzzyResult.distance})`,
                    `Replace '${token}' with '${fuzzyResult.match}'`,
                    `'${token}' is not a valid C keyword but is ${fuzzyResult.distance} edit(s) away from '${fuzzyResult.match}'. Using fuzzy matching (Damerau-Levenshtein distance algorithm) to detect likely typos.`
                );
            }
        }
    });
};

CAnalyzer.prototype.fixKeywordTypos = function (line) {
    if (this.keywordTypoFixes.size === 0) return line;
    let fixed = line;
    for (const [typo, correction] of this.keywordTypoFixes) {
        const typoRegex = new RegExp(`\\b${typo}\\b`, 'g');
        if (typoRegex.test(fixed)) {
            fixed = fixed.replace(typoRegex, correction);
            this.stats.conditionsFixed++;
        }
    }
    return fixed;
};





CAnalyzer.prototype.detectMemoryLeaks = function () {
    const mallocs = [];
    const frees = new Set();
    const fopens = [];
    const fcloses = new Set();

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;


        const mallocMatch = trimmed.match(/(\w+)\s*=\s*(?:\([^)]*\)\s*)?(malloc|calloc|realloc)\s*\(/);
        if (mallocMatch) {
            mallocs.push({ varName: mallocMatch[1], line: idx + 1, type: mallocMatch[2] });
        }


        const freeMatch = trimmed.match(/\bfree\s*\(\s*(\w+)\s*\)/);
        if (freeMatch) {
            frees.add(freeMatch[1]);
        }


        const fopenMatch = trimmed.match(/(\w+)\s*=\s*fopen\s*\(/);
        if (fopenMatch) {
            fopens.push({ varName: fopenMatch[1], line: idx + 1 });
        }


        const fcloseMatch = trimmed.match(/\bfclose\s*\(\s*(\w+)\s*\)/);
        if (fcloseMatch) {
            fcloses.add(fcloseMatch[1]);
        }
    });


    mallocs.forEach(m => {
        if (!frees.has(m.varName)) {
            this.addBug('MemoryLeak', 'critical', m.line,
                `Memory allocated with ${m.type}() for '${m.varName}' is never freed`,
                `Add free(${m.varName}); before the function returns`,
                `Not freeing dynamically allocated memory causes memory leaks.`);
        }
    });


    fopens.forEach(f => {
        if (!fcloses.has(f.varName)) {
            this.addBug('ResourceLeak', 'critical', f.line,
                `File opened with fopen() for '${f.varName}' is never closed`,
                `Add fclose(${f.varName}); when done with the file`,
                `Not closing file handles causes resource leaks and data corruption.`);
        }
    });


    const freeLines = [];
    this.lines.forEach((line, idx) => {
        const freeMatch = line.match(/\bfree\s*\(\s*(\w+)\s*\)/);
        if (freeMatch) {
            freeLines.push({ varName: freeMatch[1], line: idx + 1 });
        }
    });
    const freeCounts = {};
    freeLines.forEach(f => {
        freeCounts[f.varName] = (freeCounts[f.varName] || 0) + 1;
        if (freeCounts[f.varName] > 1) {
            this.addBug('DoubleFree', 'critical', f.line,
                `Double free detected: '${f.varName}' is freed more than once`,
                `Remove the duplicate free(${f.varName}); call`,
                `Freeing memory twice causes undefined behavior and crashes.`);
        }
    });
};





CAnalyzer.prototype.detectCodeSmells = function () {

    let maxNesting = 0;
    let currentNesting = 0;
    this.lines.forEach((line, idx) => {
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        currentNesting += opens - closes;
        if (currentNesting > maxNesting) maxNesting = currentNesting;
        if (currentNesting > 4) {
            this.addBug('DeepNesting', 'warning', idx + 1,
                `Deep nesting detected (${currentNesting} levels) — consider refactoring`,
                `Extract the inner block into a separate function`,
                `Deeply nested code is hard to read and maintain. Keep nesting ≤ 3 levels.`);
        }
    });


    this.functions.forEach((info, funcName) => {
        let braceCount = 0, started = false, lineCount = 0;
        for (let i = info.line - 1; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (line.includes('{')) { started = true; braceCount++; }
            if (line.includes('}')) { braceCount--; if (braceCount === 0 && started) break; }
            if (started) lineCount++;
        }
        if (lineCount > 50) {
            this.addBug('LongFunction', 'warning', info.line,
                `Function '${funcName}' is ${lineCount} lines long (recommended: ≤ 50)`,
                `Break '${funcName}' into smaller helper functions`,
                `Long functions are harder to test, debug, and maintain.`);
        }
    });


    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) return;

        if (/\[\s*\d+\s*\]/.test(trimmed)) return;
        const magicMatch = trimmed.match(/[=<>!+\-*/]\s*(\d{2,})/g);
        if (magicMatch) {
            magicMatch.forEach(m => {
                const num = m.match(/(\d{2,})/)[1];
                const n = parseInt(num);
                if (n > 1 && n !== 10 && n !== 100 && n !== 1000 && n !== 255 && n !== 256) {
                    this.addBug('MagicNumber', 'info', idx + 1,
                        `Magic number '${num}' detected — consider using a named constant`,
                        `Use #define or const: const int VALUE = ${num};`,
                        `Named constants make code more readable and easier to change.`);
                }
            });
        }
    });
};





CAnalyzer.prototype.detectPointerIssues = function () {
    const pointers = new Map();
    const freedPointers = new Set();

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;


        const ptrDeclMatch = trimmed.match(/\b(int|float|char|double|void)\s*\*\s*(\w+)/);
        if (ptrDeclMatch) {
            const ptrName = ptrDeclMatch[2];
            const isInit = /=\s*.+/.test(trimmed);
            pointers.set(ptrName, { line: idx + 1, initialized: isInit, freed: false });
        }


        const nullAssign = trimmed.match(/(\w+)\s*=\s*NULL\s*;/);
        if (nullAssign) {
            const ptrName = nullAssign[1];

            for (let j = idx + 1; j < Math.min(idx + 10, this.lines.length); j++) {
                const nextLine = this.lines[j].trim();
                if (new RegExp(`\\*\\s*${ptrName}\\b`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*->`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*\\[`).test(nextLine)) {

                    let reassigned = false;
                    for (let k = idx + 1; k < j; k++) {
                        if (new RegExp(`${ptrName}\\s*=`).test(this.lines[k]) &&
                            !/=\s*NULL/.test(this.lines[k])) {
                            reassigned = true; break;
                        }
                    }
                    if (!reassigned) {
                        this.addBug('NullPointerDeref', 'critical', j + 1,
                            `Potential NULL pointer dereference of '${ptrName}'`,
                            `Check if '${ptrName}' is NULL before using it: if (${ptrName} != NULL)`,
                            `Dereferencing a NULL pointer causes a segmentation fault.`);
                    }
                    break;
                }
            }
        }


        const freeMatch = trimmed.match(/\bfree\s*\(\s*(\w+)\s*\)/);
        if (freeMatch) {
            freedPointers.add(freeMatch[1]);
            const ptrName = freeMatch[1];
            for (let j = idx + 1; j < Math.min(idx + 15, this.lines.length); j++) {
                const nextLine = this.lines[j].trim();
                if (new RegExp(`\\b${ptrName}\\s*=`).test(nextLine) && !/=\s*NULL/.test(nextLine)) break;
                if (new RegExp(`\\b${ptrName}\\s*=\\s*NULL`).test(nextLine)) break;
                if (new RegExp(`\\*\\s*${ptrName}\\b`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*->`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*\\[`).test(nextLine) ||
                    new RegExp(`printf.*${ptrName}`).test(nextLine)) {
                    this.addBug('UseAfterFree', 'critical', j + 1,
                        `Use after free: '${ptrName}' is used after being freed`,
                        `Set '${ptrName} = NULL;' after free and check before use`,
                        `Using freed memory causes undefined behavior.`);
                    break;
                }
            }
        }
    });
};





CAnalyzer.prototype.detectTypeIssues = function () {
    const varTypes = new Map();


    this.lines.forEach((line) => {
        const declMatch = line.match(/\b(int|float|char|double|long|short)\s+(\w+)/g);
        if (declMatch) {
            declMatch.forEach(d => {
                const parts = d.match(/\b(int|float|char|double|long|short)\s+(\w+)/);
                if (parts) varTypes.set(parts[2], parts[1]);
            });
        }
    });

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;


        const assignMatch = trimmed.match(/(\w+)\s*=\s*(\w+)\s*;/);
        if (assignMatch) {
            const lhs = assignMatch[1], rhs = assignMatch[2];
            const lhsType = varTypes.get(lhs);
            const rhsType = varTypes.get(rhs);
            if (lhsType === 'int' && (rhsType === 'float' || rhsType === 'double')) {
                this.addBug('TypeTruncation', 'warning', idx + 1,
                    `Implicit conversion: assigning '${rhsType} ${rhs}' to 'int ${lhs}' truncates decimal part`,
                    `Use explicit cast: ${lhs} = (int)${rhs};`,
                    `Assigning float/double to int silently loses the fractional part.`);
            }
            if (lhsType === 'char' && (rhsType === 'int' || rhsType === 'float' || rhsType === 'double')) {
                this.addBug('TypeOverflow', 'warning', idx + 1,
                    `Implicit conversion: assigning '${rhsType} ${rhs}' to 'char ${lhs}' may overflow`,
                    `Ensure '${rhs}' fits in char range (0-127 / -128 to 127)`,
                    `char is only 1 byte — larger values will wrap around.`);
            }
        }


        const divMatch = trimmed.match(/\b(float|double)\s+(\w+)\s*=\s*(\w+)\s*\/\s*(\w+)\s*;/);
        if (divMatch) {
            const rhsVar1 = divMatch[3], rhsVar2 = divMatch[4];
            const type1 = varTypes.get(rhsVar1), type2 = varTypes.get(rhsVar2);
            if (type1 === 'int' && type2 === 'int') {
                this.addBug('IntegerDivision', 'warning', idx + 1,
                    `Integer division: '${rhsVar1} / ${rhsVar2}' will truncate before assigning to ${divMatch[1]}`,
                    `Cast one operand: (${divMatch[1]})${rhsVar1} / ${rhsVar2}`,
                    `Dividing two ints produces an int, losing the decimal part even when stored in float/double.`);
            }
        }
    });
};





CAnalyzer.prototype.detectWastefulFloat = function () {
    const trackedTypes = ['double', 'float', 'long', 'int', 'short'];
    const typeRanges = {
        char: { min: -128, max: 127, size: 1 },
        short: { min: -32768, max: 32767, size: 2 },
        int: { min: -2147483648, max: 2147483647, size: 4 },
        long: { min: -9223372036854775808, max: 9223372036854775807, size: 8 },
        float: { min: -3.4e38, max: 3.4e38, size: 4 },
        double: { min: -1.7e308, max: 1.7e308, size: 8 }
    };

    const vars = new Map();


    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;


        const declInit = trimmed.match(/\b(double|float|long|int|short)\s+(\w+)\s*=\s*([^;]+);/);
        if (declInit) {
            vars.set(declInit[2], { type: declInit[1], line: idx + 1, values: [declInit[3].trim()] });
            return;
        }

        const declOnly = trimmed.match(/\b(double|float|long|int|short)\s+(\w+)\s*;/);
        if (declOnly && !trimmed.includes('[')) {
            vars.set(declOnly[2], { type: declOnly[1], line: idx + 1, values: [] });
        }
    });


    this.lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;
        vars.forEach((info, varName) => {
            const assignMatch = trimmed.match(new RegExp(`\\b${varName}\\s*=\\s*([^;]+);`));
            if (assignMatch && !trimmed.match(new RegExp(`\\b(double|float|long|int|short|char)\\s+${varName}`))) {
                info.values.push(assignMatch[1].trim());
            }
        });
    });


    vars.forEach((info, varName) => {
        if (info.values.length === 0) return;


        const numericVals = [];
        let allNumeric = true;
        let hasDecimal = false;

        info.values.forEach(val => {

            const numMatch = val.match(/^-?\d+\.?\d*$/);
            if (numMatch) {
                const n = parseFloat(val);
                numericVals.push(n);
                if (val.includes('.')) hasDecimal = true;
            } else {

                if (/^[\w\s+\-*/%()]+$/.test(val) && !/\./.test(val) && !/[a-zA-Z]{2,}\s*\(/.test(val)) {

                } else {
                    allNumeric = false;
                }
            }
        });

        if (!allNumeric && numericVals.length === 0) return;

        const currentType = info.type;


        if ((currentType === 'float' || currentType === 'double') && !hasDecimal && allNumeric) {
            if (numericVals.length > 0) {
                const maxVal = Math.max(...numericVals.map(Math.abs));
                const smallest = maxVal <= 127 ? 'short' : maxVal <= 32767 ? 'short' : 'int';
                this.addBug('WastefulType', 'warning', info.line,
                    `'${varName}' declared as '${currentType}' but only holds whole numbers`,
                    `Use '${smallest} ${varName}' instead — saves ${typeRanges[currentType].size - typeRanges[smallest].size} bytes per variable`,
                    `Using ${currentType} (${typeRanges[currentType].size} bytes) for integer values wastes memory and risks floating-point precision issues.`);
            } else {
                this.addBug('WastefulType', 'warning', info.line,
                    `'${varName}' declared as '${currentType}' but only assigned integer expressions`,
                    `Consider using 'int ${varName}' instead of '${currentType} ${varName}'`,
                    `If the variable never needs decimal values, an integer type is more efficient and precise.`);
            }
            return;
        }


        if (currentType === 'double' && numericVals.length > 0) {
            const maxVal = Math.max(...numericVals.map(Math.abs));
            if (maxVal <= 3.4e38) {
                this.addBug('WastefulType', 'info', info.line,
                    `'${varName}' declared as 'double' but values fit in 'float'`,
                    `Use 'float ${varName}' instead — saves 4 bytes per variable`,
                    `double uses 8 bytes, float uses 4 bytes. If values fit in float range (±3.4×10³⁸), use float.`);
            }
        }


        if (currentType === 'long' && numericVals.length > 0 && !hasDecimal) {
            const maxVal = Math.max(...numericVals.map(Math.abs));
            if (maxVal <= 2147483647) {
                const smallest = maxVal <= 127 ? 'char' : maxVal <= 32767 ? 'short' : 'int';
                this.addBug('WastefulType', 'warning', info.line,
                    `'${varName}' declared as 'long' but values fit in '${smallest}'`,
                    `Use '${smallest} ${varName}' instead — saves ${typeRanges['long'].size - typeRanges[smallest].size} bytes`,
                    `long uses 8 bytes. If your values fit in ${smallest} range, use the smaller type.`);
            }
        }


        if (currentType === 'int' && numericVals.length > 0 && !hasDecimal) {
            const maxVal = Math.max(...numericVals.map(Math.abs));
            if (maxVal <= 127) {
                this.addBug('WastefulType', 'info', info.line,
                    `'${varName}' declared as 'int' but values fit in 'char' (${maxVal} ≤ 127)`,
                    `Use 'char ${varName}' to save 3 bytes, or 'short' to save 2 bytes`,
                    `int uses 4 bytes, but values ≤127 fit in char (1 byte) or short (2 bytes).`);
            } else if (maxVal <= 32767) {
                this.addBug('WastefulType', 'info', info.line,
                    `'${varName}' declared as 'int' but values fit in 'short' (${maxVal} ≤ 32767)`,
                    `Use 'short ${varName}' instead — saves 2 bytes per variable`,
                    `int uses 4 bytes, short uses 2 bytes. If values stay within ±32767, short is sufficient.`);
            }
        }


        if (currentType === 'short' && numericVals.length > 0 && !hasDecimal) {
            const maxVal = Math.max(...numericVals.map(Math.abs));
            if (maxVal <= 127) {
                this.addBug('WastefulType', 'info', info.line,
                    `'${varName}' declared as 'short' but values fit in 'char' (${maxVal} ≤ 127)`,
                    `Use 'char ${varName}' instead — saves 1 byte per variable`,
                    `short uses 2 bytes, char uses 1 byte.`);
            }
        }
    });
};





CAnalyzer.prototype.detectBufferOverflow = function () {
    const unsafeFuncs = {
        'gets': { safe: 'fgets(buffer, sizeof(buffer), stdin)', reason: 'gets() has no bounds checking — can write past buffer end' },
        'strcpy': { safe: 'strncpy(dest, src, sizeof(dest)-1)', reason: 'strcpy() copies until \\0 with no size limit' },
        'strcat': { safe: 'strncat(dest, src, sizeof(dest)-strlen(dest)-1)', reason: 'strcat() appends without checking remaining space' },
        'sprintf': { safe: 'snprintf(buf, sizeof(buf), fmt, ...)', reason: 'sprintf() writes without bounds checking' },
        'scanf': null
    };

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

        for (const [func, info] of Object.entries(unsafeFuncs)) {
            if (!info) continue;
            const regex = new RegExp(`\\b${func}\\s*\\(`);
            if (regex.test(trimmed)) {
                this.addBug('BufferOverflow', 'critical', idx + 1,
                    `Unsafe function '${func}()' — vulnerable to buffer overflow`,
                    `Use safer alternative: ${info.safe}`,
                    `${info.reason}. This is a common source of security vulnerabilities.`);
            }
        }


        const scanfStrMatch = trimmed.match(/\bscanf\s*\(\s*"([^"]*)"/);
        if (scanfStrMatch) {
            const fmt = scanfStrMatch[1];
            if (/%s/.test(fmt) && !/%\d+s/.test(fmt)) {
                this.addBug('BufferOverflow', 'critical', idx + 1,
                    `scanf() with '%s' has no width limit — vulnerable to buffer overflow`,
                    `Use width specifier: scanf("%99s", buf) for a 100-byte buffer`,
                    `%s reads until whitespace with no size limit, overflowing the buffer.`);
            }
        }
    });
};





CAnalyzer.prototype.detectFormatStringVuln = function () {
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;


        const printfMatch = trimmed.match(/\bprintf\s*\(\s*(\w+)\s*\)/);
        if (printfMatch) {
            const arg = printfMatch[1];
            if (arg !== 'NULL' && !/^"/.test(arg)) {
                this.addBug('FormatStringVuln', 'critical', idx + 1,
                    `Format string vulnerability: printf(${arg}) — user input could contain %x, %n`,
                    `Use printf("%s", ${arg}) instead of printf(${arg})`,
                    `If '${arg}' contains format specifiers like %x or %n, an attacker can read/write memory. This is a serious security flaw.`);
            }
        }

        // fprintf(file, variable)
        const fprintfMatch = trimmed.match(/\bfprintf\s*\(\s*\w+\s*,\s*(\w+)\s*\)/);
        if (fprintfMatch) {
            const arg = fprintfMatch[1];
            if (arg !== 'NULL') {
                this.addBug('FormatStringVuln', 'critical', idx + 1,
                    `Format string vulnerability: fprintf with variable '${arg}' as format string`,
                    `Use fprintf(file, "%s", ${arg}) instead`,
                    `Passing user-controlled data as a format string enables format string attacks.`);
            }
        }
    });
};





CAnalyzer.prototype.detectLargeStackAlloc = function () {
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;

        const arrayMatch = trimmed.match(/\b(int|float|char|double|long|short)\s+(\w+)\s*\[\s*(\d+)\s*\]/);
        if (arrayMatch) {
            const type = arrayMatch[1];
            const name = arrayMatch[2];
            const size = parseInt(arrayMatch[3]);
            const typeSize = { int: 4, float: 4, char: 1, double: 8, long: 8, short: 2 };
            const bytes = size * (typeSize[type] || 4);
            if (bytes > 8192) {
                this.addBug('LargeStackAlloc', 'warning', idx + 1,
                    `Large stack allocation: '${name}[${size}]' uses ~${(bytes / 1024).toFixed(1)}KB on the stack`,
                    `Use dynamic allocation: ${type} *${name} = malloc(${size} * sizeof(${type}));`,
                    `Default stack size is typically 1-8MB. Large local arrays risk stack overflow.`);
            }
        }
    });
};





CAnalyzer.prototype.detectHighComplexity = function () {
    this.functions.forEach((info, funcName) => {
        let braceCount = 0, started = false;
        let complexity = 1;

        for (let i = info.line - 1; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (line.includes('{')) { started = true; braceCount++; }
            if (line.includes('}')) { braceCount--; if (braceCount === 0 && started) break; }
            if (!started) continue;


            if (/\bif\s*\(/.test(line)) complexity++;
            if (/\belse\s+if\s*\(/.test(line)) complexity++;
            if (/\bwhile\s*\(/.test(line)) complexity++;
            if (/\bfor\s*\(/.test(line)) complexity++;
            if (/\bcase\b/.test(line)) complexity++;
            if (/&&|\|\|/.test(line)) complexity++;
            if (/\?.*:/.test(line)) complexity++;
        }

        if (complexity > 10) {
            this.addBug('HighComplexity', 'warning', info.line,
                `Function '${funcName}' has cyclomatic complexity of ${complexity} (threshold: 10)`,
                `Break '${funcName}' into smaller functions to reduce complexity`,
                `High cyclomatic complexity makes code harder to test. Each decision path needs its own test case.`);
        }
    });
};





CAnalyzer.prototype.detectNamingIssues = function () {
    const singleLetterExceptions = new Set(['i', 'j', 'k', 'n', 'x', 'y', 'c']);
    const forLoopVars = new Set();


    this.lines.forEach(line => {
        const forMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w)\s*=/);
        if (forMatch) forLoopVars.add(forMatch[1]);
    });


    const declPattern = /\b(int|float|char|double|long|short)\s+([a-zA-Z])\s*[;=,]/g;
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (/^\s*for\s*\(/.test(trimmed)) return;

        declPattern.lastIndex = 0;
        let match;
        while ((match = declPattern.exec(trimmed)) !== null) {
            const varName = match[2];
            if (!forLoopVars.has(varName) && !singleLetterExceptions.has(varName)) {
                this.addBug('NamingConvention', 'info', idx + 1,
                    `Single-letter variable '${varName}' — use a descriptive name`,
                    `Rename '${varName}' to something meaningful (e.g., count, index, value)`,
                    `Single-letter names reduce readability. Only loop variables (i, j, k) are acceptable.`);
            }
        }
    });
};





function analyzeCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) return;
    const analyzer = new CAnalyzer();
    const result = analyzer.analyzeOnly(code);
    displayBugs(result.bugs);
    updateMetrics(code, result.bugs);
}

function changeCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { showToast('⚠️ Please enter some C code first'); return; }
    try {
        const analyzer = new CAnalyzer();
        const result = analyzer.analyzeAndRefactor(code);
        displayBugs(result.bugs);
        updateMetrics(code, result.bugs);
        window._originalCode = code;
        window._refactoredCode = result.refactoredCode;
        window._showDiff = false;
        document.getElementById('diffToggle').classList.remove('active');

        document.getElementById('resultsSection').classList.remove('hidden');
        document.getElementById('originalOutput').textContent = code;
        if (result.refactoredCode && result.refactoredCode.trim() !== '') {
            document.getElementById('refactoredOutput').textContent = result.refactoredCode;
            showToast('✨ Code refactored successfully!');
        } else {
            document.getElementById('refactoredOutput').innerHTML =
                '<span style="color: var(--accent-red);">No refactored code generated. Check console for errors.</span>';
        }
    } catch (error) {
        console.error('Error during refactoring:', error);
        document.getElementById('refactoredOutput').innerHTML =
            '<span style="color: var(--accent-red);">Error: ' + error.message + '</span>';
    }
}





function displayBugs(bugs) {
    const bugReport = document.getElementById('bugReport');
    const summaryBar = document.getElementById('summaryBar');
    const filterBar = document.getElementById('filterBar');
    if (bugs.length === 0) {
        bugReport.innerHTML = '<div class="no-bugs">✅ No bugs found! Your code looks clean.</div>';
        summaryBar.style.display = 'none';
        filterBar.style.display = 'none';
        return;
    }
    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    bugs.forEach(bug => counts[bug.severity]++);
    summaryBar.style.display = 'flex';
    filterBar.style.display = 'flex';
    summaryBar.innerHTML = `
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-critical);">${counts.critical}</span> Critical</div>
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-error);">${counts.error}</span> Errors</div>
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-warning);">${counts.warning}</span> Warnings</div>
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-info);">${counts.info}</span> Info</div>
        <div class="summary-item" style="margin-left: auto;">Total: <span class="summary-count">${bugs.length}</span></div>
    `;
    bugReport.innerHTML = bugs.map((bug, i) => `
        <div class="bug-item" data-severity="${bug.severity}" onclick="highlightLine(${bug.line})" style="animation-delay: ${i * 0.04}s" title="Click to highlight line ${bug.line}">
            <span class="severity-badge severity-${bug.severity}">${bug.severity}</span>
            <div class="bug-details">
                <div class="bug-message">${bug.message}</div>
                <div class="bug-location">Line ${bug.line} • ${bug.type}</div>
                ${bug.suggestion ? `<div class="bug-suggestion">💡 ${bug.suggestion}</div>` : ''}
                ${bug.explanation ? `<div class="bug-explanation">📖 ${bug.explanation}</div>` : ''}
            </div>
        </div>
    `).join('');
    // Reset filter to 'all'
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-severity="all"]').classList.add('active');
}





function highlightLine(lineNum) {
    const textarea = document.getElementById('codeInput');
    const lines = textarea.value.split('\n');
    if (lineNum < 1 || lineNum > lines.length) return;


    const lineHeight = 20.8;
    textarea.scrollTop = (lineNum - 1) * lineHeight - textarea.clientHeight / 3;


    const lineNumbers = document.getElementById('lineNumbers');
    const spans = lineNumbers.querySelectorAll('span');
    spans.forEach(s => s.classList.remove('highlighted'));
    if (spans[lineNum - 1]) {
        spans[lineNum - 1].classList.add('highlighted');
        setTimeout(() => spans[lineNum - 1].classList.remove('highlighted'), 3000);
    }


    let charStart = 0;
    for (let i = 0; i < lineNum - 1; i++) charStart += lines[i].length + 1;
    const charEnd = charStart + lines[lineNum - 1].length;
    textarea.focus();
    textarea.setSelectionRange(charStart, charEnd);
}





function updateSyntaxHighlight() {
    const code = document.getElementById('codeInput').value;
    const overlay = document.getElementById('highlightOverlay');
    if (!code.trim()) { overlay.innerHTML = ''; return; }

    let html = escapeHtml(code);

    // Order matters: comments first, then strings, then others
    // Comments (single-line)
    html = html.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
    // Comments (multi-line — simplified)
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    // Preprocessor
    html = html.replace(/(#\s*(?:include|define|ifdef|ifndef|endif|if|else|elif|pragma|undef)[^\n]*)/g, '<span class="hl-preprocessor">$1</span>');
    // Strings
    html = html.replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-string">$1</span>');
    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
    // Keywords
    html = html.replace(/\b(if|else|while|for|do|switch|case|break|continue|return|goto|default|sizeof|typedef|struct|enum|union)\b/g, '<span class="hl-keyword">$1</span>');
    // Types
    html = html.replace(/\b(int|float|char|double|void|long|short|unsigned|signed|const|static|extern|volatile|register|auto|FILE)\b/g, '<span class="hl-type">$1</span>');
    // Common functions
    html = html.replace(/\b(printf|scanf|malloc|calloc|realloc|free|fopen|fclose|fread|fwrite|fprintf|fscanf|strlen|strcpy|strcmp|memset|memcpy|puts|gets|getchar|putchar|exit|atoi|atof)\b/g, '<span class="hl-function">$1</span>');
    // NULL, true, false
    html = html.replace(/\b(NULL|true|false|EOF|stdin|stdout|stderr)\b/g, '<span class="hl-keyword">$1</span>');

    overlay.innerHTML = html;
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// CODE METRICS
// ============================================================

function updateMetrics(code, bugs) {
    const lines = code.split('\n');
    const loc = lines.filter(l => l.trim() !== '' && !l.trim().startsWith('//')).length;
    const funcCount = (code.match(/\b(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?/g) || []).length;
    const varCount = (code.match(/\b(int|float|char|double|long|short)\s+\w+\s*(=|;|,)/g) || []).length;
    const includeCount = (code.match(/#\s*include/g) || []).length;


    const ifCount = (code.match(/\bif\s*\(/g) || []).length;
    const whileCount = (code.match(/\bwhile\s*\(/g) || []).length;
    const forCount = (code.match(/\bfor\s*\(/g) || []).length;
    const caseCount = (code.match(/\bcase\b/g) || []).length;
    const andOr = (code.match(/&&|\|\|/g) || []).length;
    const complexity = 1 + ifCount + whileCount + forCount + caseCount + andOr;

    document.getElementById('metricLOC').textContent = loc;
    document.getElementById('metricFunctions').textContent = funcCount;
    document.getElementById('metricVariables').textContent = varCount;
    document.getElementById('metricIncludes').textContent = includeCount;
    var complexityEl = document.getElementById('metricComplexity');
    if (complexityEl) complexityEl.textContent = complexity;
    document.getElementById('metricBugs').textContent = bugs ? bugs.length : 0;

}





function toggleDiffView() {
    if (!window._originalCode || !window._refactoredCode) {
        showToast('⚠️ Run "Change Code" first to see diff');
        return;
    }
    window._showDiff = !window._showDiff;
    const btn = document.getElementById('diffToggle');
    btn.classList.toggle('active', window._showDiff);

    const output = document.getElementById('refactoredOutput');
    if (window._showDiff) {
        output.innerHTML = generateDiff(window._originalCode, window._refactoredCode);
    } else {
        output.textContent = window._refactoredCode;
    }
}

function generateDiff(original, refactored) {
    const origLines = original.split('\n');
    const refLines = refactored.split('\n');
    const maxLen = Math.max(origLines.length, refLines.length);
    let html = '';

    for (let i = 0; i < maxLen; i++) {
        const orig = origLines[i] || '';
        const ref = refLines[i] || '';
        if (orig === ref) {
            html += `<span class="diff-line unchanged">${escapeHtml(ref)}</span>\n`;
        } else {
            if (orig.trim()) html += `<span class="diff-line removed">${escapeHtml(orig)}</span>\n`;
            if (ref.trim()) html += `<span class="diff-line added">${escapeHtml(ref)}</span>\n`;
        }
    }
    return html;
}

// ============================================================
// COPY TO CLIPBOARD
// ============================================================

function copyRefactored() {
    const output = document.getElementById('refactoredOutput');
    const text = output.textContent;
    if (!text || text.includes('Click "Change Code"')) {
        showToast('⚠️ Nothing to copy yet'); return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied to clipboard!');
    }).catch(() => {

        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('📋 Copied to clipboard!');
    });
}





function exportReport() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { showToast('⚠️ No code to analyze'); return; }

    const analyzer = new CAnalyzer();
    const result = analyzer.analyzeOnly(code);
    const bugs = result.bugs;

    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    bugs.forEach(b => counts[b.severity]++);

    const now = new Date().toLocaleString();
    let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>RefactorX Analysis Report</title>
<style>
body { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0d1117; color: #e6edf3; }
h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
h2 { color: #8b949e; margin-top: 30px; }
.meta { color: #8b949e; font-size: 14px; }
.summary { display: flex; gap: 20px; margin: 20px 0; }
.summary-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px 20px; text-align: center; }
.summary-card .num { font-size: 24px; font-weight: 700; }
.critical .num { color: #f85149; } .error .num { color: #f778ba; }
.warning .num { color: #d29922; } .info .num { color: #58a6ff; }
pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px; }
.bug { padding: 10px 16px; border-bottom: 1px solid #21262d; }
.badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: white; }
.badge-critical { background: #f85149; } .badge-error { background: #f778ba; }
.badge-warning { background: #d29922; } .badge-info { background: #58a6ff; }
.suggestion { color: #56d4dd; font-size: 12px; margin-top: 4px; }
.location { color: #6e7681; font-size: 12px; }
</style></head><body>
<h1>🔍 RefactorX Analysis Report</h1>
<p class="meta">Generated: ${now}</p>
<div class="summary">
<div class="summary-card critical"><div class="num">${counts.critical}</div>Critical</div>
<div class="summary-card error"><div class="num">${counts.error}</div>Errors</div>
<div class="summary-card warning"><div class="num">${counts.warning}</div>Warnings</div>
<div class="summary-card info"><div class="num">${counts.info}</div>Info</div>
</div>
<h2>Source Code</h2>
<pre>${escapeHtml(code)}</pre>
<h2>Issues Found (${bugs.length})</h2>
${bugs.length === 0 ? '<p style="color:#3fb950;">✅ No issues found!</p>' :
            bugs.map(b => `<div class="bug">
<span class="badge badge-${b.severity}">${b.severity}</span>
<strong> ${b.message}</strong>
<div class="location">Line ${b.line} • ${b.type}</div>
${b.suggestion ? `<div class="suggestion">💡 ${b.suggestion}</div>` : ''}
</div>`).join('')}
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'c-code-analysis-report.html';
    a.click(); URL.revokeObjectURL(url);
    showToast('📄 Report exported!');
}





function filterBugs(severity) {
    const items = document.querySelectorAll('.bug-item');
    items.forEach(item => {
        if (severity === 'all') {
            item.classList.remove('hidden');
        } else {
            item.classList.toggle('hidden', item.dataset.severity !== severity);
        }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.severity === severity);
    });
}





function toggleLearningMode() {
    document.body.classList.toggle('learning-mode');
    const btn = document.getElementById('learnToggle');
    const isActive = document.body.classList.contains('learning-mode');
    btn.classList.toggle('active', isActive);
    showToast(isActive ? '📚 Learning mode ON — explanations visible' : '📚 Learning mode OFF');
}





function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    localStorage.setItem('theme', html.getAttribute('data-theme'));
}





function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}





function updateLineNumbers() {
    const textarea = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const lines = textarea.value.split('\n');
    let numbersHtml = '';
    for (let i = 1; i <= lines.length; i++) { numbersHtml += `<span>${i}</span>`; }
    lineNumbers.innerHTML = numbersHtml;
}

function syncScroll() {
    const textarea = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const overlay = document.getElementById('highlightOverlay');
    lineNumbers.scrollTop = textarea.scrollTop;
    overlay.scrollTop = textarea.scrollTop;
}





let _analyzeTimer = null;

function debouncedAnalyze() {
    clearTimeout(_analyzeTimer);
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) {
        document.getElementById('bugReport').innerHTML =
            '<span style="color: var(--text-muted);">Start typing C code to see bug analysis...</span>';
        document.getElementById('summaryBar').style.display = 'none';
        updateMetrics('', []);
        return;
    }
    _analyzeTimer = setTimeout(function () {
        analyzeCode();
    }, 400);
}

// ============================================================
// ISSUES HISTOGRAM — Error Distribution by Compiler Phase
// ============================================================

// Categorize bug types into Lexical, Syntactical, and Semantic phases
var ERROR_CATEGORIES = {
    lexical: new Set([
        'KeywordTypo',
        'InvalidPrintf',
        'InvalidScanf',
        'PrintfArgMismatch',
        'ScanfArgMismatch',
        'NamingConvention',
        'MagicNumber'
    ]),
    syntactical: new Set([
        'MissingSemicolon',
        'MismatchedBracket',
        'MismatchedParen',
        'MismatchedBrace',
        'MalformedSyntax',
        'EmptyBody',
        'EmptyFunction',
        'MissingFunctionBody',
        'InvalidParameter',
        'DeepNesting',
        'LongFunction'
    ]),
    semantic: new Set([
        'UninitializedVariable',
        'UnusedVariable',
        'UnusedFunction',
        'UndefinedFunction',
        'UncalledFunctionsSummary',
        'MemoryLeak',
        'DoubleFree',
        'UseAfterFree',
        'NullPointerDeref',
        'ResourceLeak',
        'BufferOverflow',
        'ArrayOutOfBounds',
        'DivisionByZero',
        'AssignmentInCondition',
        'InfiniteLoop',
        'UnreachableCode',
        'MissingReturn',
        'SelfAssignment',
        'ConstantCondition',
        'RedundantExpression',
        'FormatStringVuln',
        'LargeStackAlloc',
        'HighComplexity',
        'TypeOverflow',
        'TypeTruncation',
        'IntegerDivision',
        'WastefulType'
    ])
};

function categorizeErrors(bugs) {
    var counts = { lexical: 0, syntactical: 0, semantic: 0 };
    if (!bugs || bugs.length === 0) return counts;

    bugs.forEach(function (bug) {
        if (ERROR_CATEGORIES.lexical.has(bug.type)) {
            counts.lexical++;
        } else if (ERROR_CATEGORIES.syntactical.has(bug.type)) {
            counts.syntactical++;
        } else {

            counts.semantic++;
        }
    });
    return counts;
}

function openIssuesGraph() {

    var code = document.getElementById('codeInput').value;
    if (!code.trim()) {
        showToast('⚠️ Enter some C code first');
        return;
    }

    var analyzer = new CAnalyzer();
    var result = analyzer.analyzeOnly(code);
    var bugs = result.bugs;
    var counts = categorizeErrors(bugs);
    var total = counts.lexical + counts.syntactical + counts.semantic;

    var container = document.getElementById('histogramContainer');
    var legend = document.getElementById('histogramLegend');

    if (total === 0) {
        container.innerHTML =
            '<div class="histogram-empty">' +
            '<span class="histogram-empty-icon">✅</span>' +
            'No issues detected! Your code is clean.' +
            '</div>';
        legend.innerHTML = '';
    } else {
        var maxCount = Math.max(counts.lexical, counts.syntactical, counts.semantic, 1);
        var maxBarHeight = 200; // pixels

        var categories = [
            { key: 'lexical', label: 'Lexical', count: counts.lexical, icon: '🔤' },
            { key: 'syntactical', label: 'Syntactical', count: counts.syntactical, icon: '🔧' },
            { key: 'semantic', label: 'Semantic', count: counts.semantic, icon: '🧠' }
        ];

        var html = '';
        categories.forEach(function (cat, i) {
            var barHeight = cat.count > 0 ? Math.max((cat.count / maxCount) * maxBarHeight, 8) : 4;
            var delay = (i * 0.15) + 's';

            html +=
                '<div class="histogram-bar-group">' +
                '<div class="histogram-bar-wrapper">' +
                '<div class="histogram-bar ' + cat.key + '" ' +
                'style="height: ' + barHeight + 'px; animation-delay: ' + delay + ';" ' +
                'title="' + cat.label + ': ' + cat.count + ' error' + (cat.count !== 1 ? 's' : '') + '">' +
                '<span class="histogram-count">' + cat.count + '</span>' +
                '</div>' +
                '</div>' +
                '<div class="histogram-label">' + cat.icon + ' ' + cat.label + '</div>' +
                '</div>';
        });
        container.innerHTML = html;

        legend.innerHTML =
            '<div class="legend-item"><span class="legend-dot lexical"></span>Lexical — token/keyword errors</div>' +
            '<div class="legend-item"><span class="legend-dot syntactical"></span>Syntactical — structure/grammar errors</div>' +
            '<div class="legend-item"><span class="legend-dot semantic"></span>Semantic — logic/runtime errors</div>';
    }

    document.getElementById('issuesGraphModal').classList.add('show');
}

function closeIssuesGraph() {
    document.getElementById('issuesGraphModal').classList.remove('show');
}






function openParseTreeModal() {
    var code = document.getElementById('codeInput').value;
    if (!code.trim()) { showToast('⚠️ No code to parse'); return; }

    try {
        var parseTree = window.generateParseTree(code);
        var html = window.renderParseTreeHTML(parseTree);
        document.getElementById('parseTreeContainer').innerHTML = html || '<div class="no-bugs" style="padding:20px;">Empty Parse Tree</div>';
        document.getElementById('parseTreeModal').classList.add('show');


        resetTreeZoom();


        var zoomSlider = document.getElementById('treeZoomSlider');
        if (zoomSlider) {

            var newSlider = zoomSlider.cloneNode(true);
            zoomSlider.parentNode.replaceChild(newSlider, zoomSlider);
            zoomSlider = newSlider;

            zoomSlider.addEventListener('input', function () {
                var scale = this.value;
                document.getElementById('treeZoomValue').textContent = Math.round(scale * 100) + '%';
                var treeEl = document.querySelector('.pt-tree-horizontal');
                if (treeEl) {
                    treeEl.style.transform = 'scale(' + scale + ')';
                }
            });
        }


        var scrollContainer = document.querySelector('.parse-tree-scroll');
        if (scrollContainer) {
            let isDown = false;
            let startX;
            let startY;
            let scrollLeft;
            let scrollTop;


            var newScroll = scrollContainer.cloneNode(true);
            scrollContainer.parentNode.replaceChild(newScroll, scrollContainer);
            scrollContainer = newScroll;

            scrollContainer.addEventListener('mousedown', (e) => {

                if (e.target.closest('.pt-node')) return;
                isDown = true;
                scrollContainer.style.cursor = 'grabbing';
                startX = e.pageX - scrollContainer.offsetLeft;
                startY = e.pageY - scrollContainer.offsetTop;
                scrollLeft = scrollContainer.scrollLeft;
                scrollTop = scrollContainer.scrollTop;
            });
            scrollContainer.addEventListener('mouseleave', () => {
                isDown = false;
                scrollContainer.style.cursor = 'grab';
            });
            scrollContainer.addEventListener('mouseup', () => {
                isDown = false;
                scrollContainer.style.cursor = 'grab';
            });
            scrollContainer.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - scrollContainer.offsetLeft;
                const y = e.pageY - scrollContainer.offsetTop;
                const walkX = (x - startX) * 1.5;
                const walkY = (y - startY) * 1.5;
                scrollContainer.scrollLeft = scrollLeft - walkX;
                scrollContainer.scrollTop = scrollTop - walkY;
            });


            scrollContainer.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    var slider = document.getElementById('treeZoomSlider');
                    if (slider) {
                        var delta = e.deltaY > 0 ? -0.1 : 0.1;
                        slider.value = Math.min(Math.max(parseFloat(slider.value) + delta, 0.2), 2);
                        slider.dispatchEvent(new Event('input'));
                    }
                }
            });
        }

    } catch (e) {
        showToast('❌ Error generating Parse Tree');
        console.error(e);
    }
}

function closeParseTreeModal() {
    document.getElementById('parseTreeModal').classList.remove('show');
}

function resetTreeZoom() {
    var slider = document.getElementById('treeZoomSlider');
    if (slider) {
        slider.value = 1;
        document.getElementById('treeZoomValue').textContent = '100%';
        var treeEl = document.querySelector('.pt-tree-horizontal');
        if (treeEl) {
            treeEl.style.transform = 'scale(1)';
        }
    }
}







document.addEventListener('DOMContentLoaded', function () {
    var codeInput = document.getElementById('codeInput');
    codeInput.value = '';
    updateLineNumbers();
    updateSyntaxHighlight();
    updateMetrics('', []);

    // Tab key inserts 4 spaces instead of moving focus
    codeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            var start = this.selectionStart;
            var end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
            updateLineNumbers();
            updateSyntaxHighlight();
            debouncedAnalyze();
        }
    });


    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
});
