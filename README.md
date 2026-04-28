# 🔍 RefactorX — Advanced C Code Static Analyzer & Refactoring Tool

Welcome to **RefactorX**, the most comprehensive, real-time, browser-based static analysis tool for C code. Built entirely on client-side web technologies, RefactorX detects bugs, security vulnerabilities, syntax errors, and code smells dynamically as you type—requiring no compilation or backend server.

![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen) ![JavaScript](https://img.shields.io/badge/built%20with-JavaScript-yellow) ![Browser Based](https://img.shields.io/badge/runs%20in-browser-blue)

## 📖 Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [Exceptional Features](#exceptional-features)
3. [Multi-Phase Compiler Pipeline](#multi-phase-compiler-pipeline)
4. [Exhaustive Bug Detection](#exhaustive-bug-detection)
5. [Premium User Interface](#premium-user-interface)
6. [Quick Start & Usage](#quick-start--usage)
7. [In-Depth File Structure](#in-depth-file-structure)
8. [Underlying Tech Stack](#underlying-tech-stack)
9. [Detailed Algorithmic Implementations](#detailed-algorithmic-implementations)
10. [Error Types and Solutions](#error-types-and-solutions)
11. [License](#license)

## 🧠 Core Philosophy
RefactorX was designed with a single goal: **democratize code analysis**. By shifting complex compiler tasks (like lexical tokenization, semantic checking, and AST generation) entirely to the browser, RefactorX eliminates the friction of configuring local toolchains, Docker containers, or cloud environments. It serves as an instant feedback loop, making it an invaluable tool for students learning C, and for seasoned developers seeking a lightweight, instantaneous code review.

## ✨ Exceptional Features
RefactorX is packed with advanced features typically found only in enterprise-grade standard IDEs:

### 1. Zero-Latency Real-Time Analysis
- **Live Detection**: Bugs are detected instantly as you type via a highly optimized 400ms debounced analysis engine.
- **Frictionless UI**: No "Run" or "Analyze" buttons required to see your code's health.
- **Interactive Feedback**: Click any bug card to automatically scroll and highlight its corresponding line in the editor.

### 2. Intelligent Code Refactoring
- **Automatic Fixes**: Intelligent logic applies corrections to identified bugs (e.g., adding missing semicolons, fixing typos, completing function parameters).
- **Split View Navigation**: Side-by-side comparison of original and securely refactored code.
- **One-Click Copy**: Seamlessly copy the optimized code to your clipboard.

## 🛠 Multi-Phase Compiler Pipeline
Under the hood, RefactorX implements a true compiler front-end and middle-end:

1. **Lexical Analysis (Scanner)**: Breaks raw text into a stream of categorized tokens. Employs Damerau-Levenshtein fuzzy matching to catch typos (e.g., `itn` handled as `int`).
2. **Syntax Analysis (Parser)**: Leverages a purpose-built Recursive Descent parser to construct a Concrete Syntax Tree (CST) and Abstract Syntax Tree (AST), verifying structural integrity.
3. **Semantic Analysis**: Oversees Symbol Table management, verifying variable scoping, function signatures, and resolving types.
4. **Optimization Pass**: Subjects the code to constant folding, dead code elimination, and algebraic simplification.
5. **Code Generation**: Re-translates the optimized AST and resolved symbols back into formatted, canonical C code.

## 🚨 Exhaustive Bug Detection
RefactorX categorizes anomalies into over 40 precise categories spanning logical, syntactical, and security boundaries.

| Severity / Category | Examples & Detailed Scope |
|---------------------|---------------------------|
| **Security Risk** | Buffer overruns (`gets`, `strcpy`, `sprintf`), unchecked format strings (`printf(var)` vulnerabilities). |
| **Memory Management**| Memory leaks (`malloc` without `free`), resource leakage (`fopen` without `fclose`), dreaded double-frees, use-after-free, and unchecked NULL references. |
| **Syntax Flaws** | Missing semicolons, completely mismatched brackets/braces/parentheses, improperly structured loop bodies. |
| **Semantic Errors** | Uninitialized or unassigned variables, unused functions, omitted returns in non-void functions, critical parameter mismatches. |
| **Control Flow** | Unintentional infinite loops (`while(1)` with no break), logically unreachable code paths, contradictory loop limits. |
| **Code Quality** | Unmaintainable deep nesting (>4 levels), excessively long functions (>50 lines), magic numbers needing constant definition, complex code. |
| **Array Boundary constraints** | Severe out-of-bounds access detected either via direct constants or dynamically deduced via for-loop range limits. Warnings for dangerous >8KB stack allocations. |

## 🎨 Premium User Interface
The UI has been completely overhauled to offer a **premium glassmorphism** aesthetic, complete with dynamic transitions and depth-focused shadowing.

- 🌗 **Dark/Light Theme**: Built-in toggle with persistent `localStorage` saving.
- 🌳 **Interactive Parse Tree View**: A highly interactive modal that visually maps the code's hierarchical structure. Features include **drag-to-pan** navigation, **smooth zoom controls** (0.2x to 2x), and persistent scrollbar positioning for exploring large trees.
- 📊 **Dynamic Code Metrics Dashboard**: Real-time stats counting Lines of Code (LOC), functions, variables, imported includes, and overall cyclomatic complexity.
- 🎨 **Syntax Highlighting**: Beautiful grammar-based highlighting natively injected into an overlay upon the text area.
- 🔎 **Intelligent Severity Filtering**: Instantly filter bugs by Critical, Error, Warning, or Info pills.
- 📚 **Pedagogical Learning Mode**: When enabled, every bug card expands to display a detailed, beginner-friendly explanation of *why* the bug is dangerous.
- 📄 **HTML Report Generation**: Easily export the entire dashboard, issue list, and code into a self-contained, beautifully styled HTML document.

## 🚀 Quick Start & Usage

Because RefactorX is entirely browser-dependent, there are absolutely no node modules or build systems to configure.

### Option 1: Direct File Access
```bash
# Simply clone the repository and open index.html directly your preferred browser
git clone https://github.com/your-repo/c-code-analysis-and-refactoring-tool.git
cd c-code-analysis-and-refactoring-tool
start index.html  # On Windows
open index.html   # On macOS
xdg-open index.html # On Linux
```

### Option 2: Local Web Server
```bash
# If you prefer running it over HTTP to circumvent CORS restrictions for local files:
npx http-server . -p 8080
# Then visit http://localhost:8080 in your browser
```

## 📁 In-Depth File Structure

The project relies on modularizing analysis phases across dedicated JavaScript files to preserve maintainability.

```
├── index.html                                  # Central UI scaffolding, layouts, modals, and container definitions
├── styles.css                                  # Core styling rules: glassmorphism, flexbox grids, animations
├── analyzer-part1-lexical-syntax.js            # Foundation: CAnalyzer class, Lexical Tokenization, Syntax Checks, and the Recursive AST Parser
├── analyzer-part2-optimization-codegen.js      # Middle-end logic: Pre-evaluation passes, constant folding, and final Refactored Code Generation
├── analyzer-part3-semantics-controlflow-ui.js  # Complex evaluation: Semantic validation, intricate control flow patterns, variable lifetimes, and UI bindings
├── lexical_errors.c                            # C test file containing various lexical tokens and typos
├── syntactical_errors.c                        # C test file containing structural and grammar errors
├── semantic_errors.c                           # C test file containing type mismatches and logical semantic flaws
├── test-all-detections.c                       # A purposefully flawed C program testing the limits of the analyzer
└──  errors_detected_and_solved.txt              # Auto-generated index of all supported error detections and automatic resolutions
```

## 🛠 Underlying Tech Stack

RefactorX is a testament to the power of vanilla web technologies:

| Ecosystem Component | Technology Employed | Description |
|---------------------|---------------------|-------------|
| **Frontend Framework** | HTML5 / CSS3 / ES6 JavaScript | Hand-crafted DOM manipulation avoiding generic third-party frameworks. |
| **Styling Paradigm** | Modern CSS, Glassmorphism CSS | Employs backdrop-filters, CSS variables, and native CSS transitions. |
| **Typography** | Google Fonts (Inter, JetBrains Mono) | Inter for general UI readability; JetBrains Mono for accurate code spacing. |
| **Backend API** | N/A | Strictly serverless architecture. Analysis executes purely on the client CPU. |
| **External Dependencies** | Zero | No jQuery, no React, no NPM installations required. |

## 📊 Detailed Algorithmic Implementations

The robustness of RefactorX rests on several academic computer science algorithms meticulously adapted for JavaScript:

- **Damerau-Levenshtein Distance**: Measures standard edit distance (insertions, deletions, substitutions) while also natively handling **transpositions**. This heavily mitigates standard keyboarding errors (e.g., `retrun` to `return`).
- **Stack-Based Delimiter Matching**: Employs an $O(n)$ time complexity linear scan using Last-In-First-Out (LIFO) stacks to pinpoint precisely where nested scopes or array boundaries fail to close.
- **Recursive Descent Parser (LL(1))**: Programmatically breaks down expression grammars via mutually recursive functions to yield deeply nested AST maps.
- **Cyclomatic Complexity Estimator**: Implements standard software engineering metrics by mapping out conditional decision branches (e.g., counting `if`, `while`, `for`, `&&`, `||`, and ternary nodes) to quantify function intricacy.
- **Multi-Line CFG (Control Flow Graph) approximations**: Identifies loops where incrementing variables fail to interact with bounds, revealing theoretical infinite loops despite having syntactically valid structure.
- **Pointer Lifecycle Tracking**: Leverages context windows across lines to track `malloc()` events. If a `free()` event isn't matched within the variable's scope, or if the variable is dereferenced post-free, exact alerts are triggered.
- **Dynamic Tree Panning & Zooming**: Implements a custom coordinate-based transformation engine for the Parse Tree, allowing users to navigate complex code structures via mouse dragging and precise zoom scaling.

## 📋 Error Types and Solutions

The system actively manages a vast matrix of discernible faults. For a comprehensive mapping of specific error types that can be automatically identified, explained, and intrinsically solved by the RefactorX engine, refer to the root document:
[`errors_detected_and_solved.txt`](./errors_detected_and_solved.txt).

## 📄 License

This repository and all accompanying code snippets, parsers, algorithms, and documentation are provided as **Open Source**. You are heartily encouraged to clone, deeply explore, legally modify, and redistribute this platform as you see fit. Building a better toolchain for C developers is a collaborative endeavor!
