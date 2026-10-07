"use strict";

/*
  Calculator state
  - tokens:  numbers and operators already entered, e.g. [5, "+", 3, "×"]
  - current: the number being typed, kept as a string so "0." and "-" are possible
  No eval() is used. Expressions are solved by evaluate(), which follows normal
  maths order: × and ÷ first, then + and −. So 5 + 3 × 2 = 11.
*/

const MAX_DIGITS = 15;
const OPERATORS = ["+", "−", "×", "÷"];

const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

let tokens = [];
let current = "";
let justEvaluated = false;
let shownExpression = "";
let errorMessage = "";

/* ---------- Rendering ---------- */

function lastNumber() {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (typeof tokens[i] === "number") return tokens[i];
  }
  return 0;
}

function render() {
  if (errorMessage) {
    expressionEl.textContent = shownExpression;
    resultEl.textContent = errorMessage;
    resultEl.classList.add("error");
    return;
  }

  resultEl.classList.remove("error");

  if (justEvaluated) {
    expressionEl.textContent = shownExpression;
  } else {
    expressionEl.textContent = [...tokens, current].filter((t) => t !== "").join(" ");
  }

  if (current !== "") resultEl.textContent = current;
  else if (tokens.length) resultEl.textContent = String(lastNumber());
  else resultEl.textContent = "0";
}

function resetAll() {
  tokens = [];
  current = "";
  justEvaluated = false;
  shownExpression = "";
  errorMessage = "";
}

/* ---------- Input handlers ---------- */

function inputDigit(d) {
  if (errorMessage || justEvaluated) resetAll();
  if (current.replace("-", "").replace(".", "").length >= MAX_DIGITS) return;

  if (current === "0") current = d;
  else if (current === "-0") current = "-" + d;
  else current += d;
}

function inputDecimal() {
  if (errorMessage || justEvaluated) resetAll();
  if (current.includes(".")) return;
  if (current === "" || current === "-") current += "0";
  current += ".";
}

function inputOperator(op) {
  if (errorMessage) return;

  if (justEvaluated) {
    // Keep working with the result of the last calculation.
    tokens = [Number(current)];
    current = "";
    justEvaluated = false;
    shownExpression = "";
  }

  if (current !== "" && current !== "-") {
    tokens.push(Number(current), op);
    current = "";
    return;
  }

  if (current === "-") return; // a lone minus sign is not a number yet

  const last = tokens[tokens.length - 1];

  if (tokens.length === 0) {
    // Nothing typed yet: "−" starts a negative number, other operators use 0.
    if (op === "−") current = "-";
    else tokens.push(0, op);
    return;
  }

  if (OPERATORS.includes(last)) {
    // Allow 5 × −3, otherwise replace the previous operator.
    if (op === "−" && (last === "×" || last === "÷")) current = "-";
    else tokens[tokens.length - 1] = op;
  }
}

function backspace() {
  if (errorMessage || justEvaluated) {
    resetAll();
    return;
  }

  if (current !== "") {
    current = current.slice(0, -1);
    return;
  }

  const last = tokens[tokens.length - 1];
  if (OPERATORS.includes(last)) {
    tokens.pop();
    current = String(tokens.pop()); // bring the number back so it can be edited
  }
}

function equals() {
  if (errorMessage || justEvaluated) return;

  if (current !== "" && current !== "-") tokens.push(Number(current));
  else if (OPERATORS.includes(tokens[tokens.length - 1])) tokens.pop(); // drop trailing operator

  if (tokens.length === 0) return;

  const expressionText = tokens.join(" ");
  const answer = evaluate(tokens);

  if (answer === null) {
    shownExpression = expressionText + " =";
    errorMessage = "Cannot divide by zero";
    tokens = [];
    current = "";
    return;
  }

  // Trim floating-point noise such as 0.1 + 0.2 = 0.30000000000000004.
  const cleaned = Number(answer.toPrecision(12));
  shownExpression = expressionText + " =";
  current = String(cleaned);
  tokens = [];
  justEvaluated = true;
}

/* ---------- Evaluation (no eval) ---------- */

function evaluate(list) {
  // Pass 1: handle × and ÷, keep + and − for later.
  const reduced = [list[0]];
  for (let i = 1; i < list.length; i += 2) {
    const op = list[i];
    const n = list[i + 1];
    if (op === "×") {
      reduced[reduced.length - 1] *= n;
    } else if (op === "÷") {
      if (n === 0) return null; // division by zero
      reduced[reduced.length - 1] /= n;
    } else {
      reduced.push(op, n);
    }
  }

  // Pass 2: handle + and − from left to right.
  let total = reduced[0];
  for (let i = 1; i < reduced.length; i += 2) {
    total = reduced[i] === "+" ? total + reduced[i + 1] : total - reduced[i + 1];
  }
  return total;
}

/* ---------- Button wiring (no inline onclick) ---------- */

document.querySelectorAll(".key").forEach((btn) => {
  btn.addEventListener("click", () => {
    const { digit, operator, action } = btn.dataset;

    if (digit !== undefined) inputDigit(digit);
    else if (operator !== undefined) inputOperator(operator);
    else if (action === "decimal") inputDecimal();
    else if (action === "backspace") backspace();
    else if (action === "clear") resetAll();
    else if (action === "equals") equals();

    render();
  });
});

/* ---------- Keyboard support ---------- */

const KEY_OPERATORS = { "+": "+", "-": "−", "*": "×", "x": "×", "/": "÷" };

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (/^[0-9]$/.test(e.key)) inputDigit(e.key);
  else if (e.key === ".") inputDecimal();
  else if (KEY_OPERATORS[e.key]) inputOperator(KEY_OPERATORS[e.key]);
  else if (e.key === "Enter" || e.key === "=") equals();
  else if (e.key === "Backspace") backspace();
  else if (e.key === "Escape" || e.key.toLowerCase() === "c") resetAll();
  else return;

  e.preventDefault();
  render();
});

render();
