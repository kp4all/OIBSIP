# Calculator

Browser calculator with a button grid and keyboard support.

**Tech:** HTML5, CSS3 (Grid), vanilla JavaScript

## Features
- Display for the current expression and result
- Digits 0–9 and decimal point
- Operators + − × ÷, equals, clear (C) and backspace (⌫)
- Division by zero shows "Cannot divide by zero" instead of crashing
- Operator chaining without a reset: `5 + 3 × 2` gives `11` (× and ÷ are done before + and −)
- CSS Grid button layout
- Event listeners on every button, no inline `onclick`
- No `eval()`: expressions are solved by my own `evaluate()` function
- Keyboard: digits, `+ - * /`, `Enter`, `Backspace`, `Esc`

## Run
Open `index.html` in any browser.
