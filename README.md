# 🔍 RefactorX — C Code Static Analyzer & Refactoring Tool

A **real-time, browser-based static analysis tool** for C code. Detects bugs, security vulnerabilities, and code smells as you type — no compilation or backend required.

![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen) ![JavaScript](https://img.shields.io/badge/built%20with-JavaScript-yellow) ![Browser Based](https://img.shields.io/badge/runs%20in-browser-blue)

## ✨ Features

### Real-Time Analysis
- Bugs detected **live as you type** (400ms debounce)
- No buttons to click — instant feedback
- Click any bug to jump to its line in the editor

### Multi-Phase Compiler Pipeline
- Lexical Analysis → Syntax Analysis → Semantic Analysis → Optimization → Code Generation
- **Damerau-Levenshtein** fuzzy matching for keyword typos (`itn` → `int`)
- Constant folding, dead code elimination, strength reduction

### Bug Detection (40+ categories)

| Category | Examples |
|----------|---------|
| **Security** | Buffer overflow (`gets`, `strcpy`, `sprintf`), format string vulnerabilities |
| **Memory** | Memory leaks, resource leaks, double-free, use-after-free, NULL dereference |
| **Syntax** | Missing semicolons, mismatched brackets/braces, malformed loops |
| **Semantic** | Uninitialized variables, unused variables/functions, missing return, type mismatches |
| **Control Flow** | Infinite loops, unreachable code, empty bodies, constant conditions |
| **Code Quality** | Deep nesting, long functions, magic numbers, naming conventions, high complexity |
| **Array Safety** | Out-of-bounds access (constant + loop-based), stack allocation warnings |

### Premium UI
- 🌗 **Dark/Light theme** toggle with persistent preference
- 📊 **Code metrics dashboard** — LOC, functions, variables, includes, complexity, issues
- 🎨 **Syntax highlighting** — keywords, types, strings, comments colored in-editor
- 🔎 **Severity filter** — show only Critical / Error / Warning / Info bugs
- 📚 **Learning mode** — explains *why* each bug is dangerous
- 📄 **Export report** — download a styled HTML analysis report
- 🔀 **Split view** — side-by-side Original vs Refactored code
- 📋 **Copy to clipboard** — one-click copy of refactored output

## 🚀 Quick Start

```bash
# No installation needed — just open in your browser
open index.html

# Or serve locally
npx http-server . -p 8080
```

## 📁 File Structure

```
├── index.html                                  # UI layout
├── styles.css                                  # Theming, animations, responsive design
├── analyzer-part1-lexical-syntax.js            # CAnalyzer class, lexical & syntax analysis
├── analyzer-part2-optimization-codegen.js      # Optimization passes & code generation
├── analyzer-part3-semantics-controlflow-ui.js  # Semantic analysis, control flow, UI
├── test-all-detections.c                       # Test file triggering all detectors
├── USP.md                                      # Unique selling points
├── PROJECT_SUMMARY.md                          # Project summary (<500 words)
├── ANALYZER_DOCUMENTATION.md                   # Full analyzer documentation
├── PART1_DOCUMENTATION.md                      # Part 1 detailed docs
├── PART2_DOCUMENTATION.md                      # Part 2 detailed docs
└── PART3_DOCUMENTATION.md                      # Part 3 detailed docs
```

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| Backend | None — fully client-side |
| Dependencies | Zero |

## 📊 Key Algorithms

- **Damerau-Levenshtein Distance** — Fuzzy keyword matching with transposition support
- **Stack-Based Delimiter Matching** — O(n) bracket/brace/parenthesis validation
- **Cyclomatic Complexity** — Per-function decision point counting
- **Pattern-Based Control Flow** — Infinite loop and unreachable code detection
- **Multi-Line Pointer Tracking** — NULL dereference and use-after-free detection

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

---

## 📋 Error Types and Solutions

For a complete list of error types that can be detected and solved (and vice versa), please see [`errors_detected_and_solved.txt`](./errors_detected_and_solved.txt).