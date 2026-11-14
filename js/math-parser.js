/**
 * Safe tokenizer, parser, and evaluator for calculator and graph expressions.
 */
class SafeMathParser {
  static tokenize(expression) {
    const tokens = [];
    const input = expression.toLowerCase();
    let index = 0;

    while (index < input.length) {
      const character = input[index];
      if (/\s/.test(character)) {
        index++;
        continue;
      }

      const numberMatch = input.slice(index).match(/^(?:(?:\d+\.?\d*)|(?:\.\d+))(?:e[+-]?\d+)?/);
      if (numberMatch) {
        const value = Number(numberMatch[0]);
        if (!Number.isFinite(value)) throw new Error('Number is outside the supported range.');
        tokens.push({ type: 'NUMBER', value });
        index += numberMatch[0].length;
        if (input[index] === '.') throw new Error('Invalid number format.');
        continue;
      }

      if (/[a-z_]/.test(character)) {
        let identifier = '';
        while (index < input.length && /[a-z0-9_]/.test(input[index])) {
          identifier += input[index++];
        }
        tokens.push({ type: 'IDENTIFIER', value: identifier });
        continue;
      }

      if ('+-*/^%!(),'.includes(character)) {
        tokens.push({ type: 'OPERATOR', value: character });
        index++;
        continue;
      }

      throw new Error(`Unsupported character "${character}".`);
    }

    return tokens;
  }

  static parse(tokens) {
    let position = 0;
    const functions = new Set([
      'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
      'asin', 'acos', 'atan', 'atan2',
      'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
      'sqrt', 'cbrt', 'abs', 'ln', 'log', 'log10', 'log2', 'exp',
      'floor', 'ceil', 'round', 'trunc', 'sign',
      'min', 'max', 'pow', 'hypot', 'mod', 'ncr', 'npr'
    ]);

    function peek(value) {
      return position < tokens.length && (value === undefined || tokens[position].value === value);
    }

    function parseExpression() {
      let node = parseTerm();
      while (peek('+') || peek('-')) {
        const operator = tokens[position++].value;
        node = { type: 'BINARY', op: operator, left: node, right: parseTerm() };
      }
      return node;
    }

    function parseTerm() {
      let node = parseUnary();
      while (position < tokens.length) {
        if (peek('*') || peek('/')) {
          const operator = tokens[position++].value;
          node = { type: 'BINARY', op: operator, left: node, right: parseUnary() };
        } else if (tokens[position].type === 'NUMBER'
          || tokens[position].type === 'IDENTIFIER'
          || peek('(')) {
          node = { type: 'BINARY', op: '*', left: node, right: parseUnary() };
        } else {
          break;
        }
      }
      return node;
    }

    function parseUnary() {
      if (peek('+') || peek('-')) {
        const operator = tokens[position++].value;
        return { type: 'UNARY', op: operator, arg: parseUnary() };
      }
      return parsePower();
    }

    function parsePower() {
      const left = parsePostfix();
      if (peek('^')) {
        position++;
        return { type: 'BINARY', op: '^', left, right: parseUnary() };
      }
      return left;
    }

    function parsePostfix() {
      let node = parsePrimary();
      while (peek('!') || peek('%')) {
        const operator = tokens[position++].value;
        node = { type: 'POSTFIX', op: operator, arg: node };
      }
      return node;
    }

    function parsePrimary() {
      if (position >= tokens.length) throw new Error('Expression is incomplete.');
      const token = tokens[position++];

      if (token.type === 'NUMBER') return token;

      if (token.type === 'OPERATOR' && token.value === '(') {
        const node = parseExpression();
        if (!peek(')')) throw new Error('Missing closing parenthesis.');
        position++;
        return node;
      }

      if (token.type === 'IDENTIFIER') {
        if (token.value === 'pi') return { type: 'NUMBER', value: Math.PI };
        if (token.value === 'tau') return { type: 'NUMBER', value: Math.PI * 2 };
        if (token.value === 'e') return { type: 'NUMBER', value: Math.E };
        if (token.value === 'phi') return { type: 'NUMBER', value: (1 + Math.sqrt(5)) / 2 };
        if (token.value === 'x' || token.value === 'ans' || token.value === 'm') {
          return { type: 'VARIABLE', name: token.value };
        }
        if (!functions.has(token.value)) throw new Error(`Unknown name "${token.value}".`);

        const args = [];
        if (peek('(')) {
          position++;
          if (!peek(')')) {
            args.push(parseExpression());
            while (peek(',')) {
              position++;
              args.push(parseExpression());
            }
          }
          if (!peek(')')) throw new Error('Missing closing parenthesis.');
          position++;
        } else {
          args.push(parseUnary());
        }
        return { type: 'FUNCTION', name: token.value, args };
      }

      throw new Error(`Unexpected token "${token.value}".`);
    }

    if (tokens.length === 0) throw new Error('Enter an expression.');
    const ast = parseExpression();
    if (position !== tokens.length) throw new Error(`Unexpected token "${tokens[position].value}".`);
    return ast;
  }

  static evaluate(ast, xValue, variables) {
    if (!ast) return NaN;
    const context = variables || {};

    switch (ast.type) {
      case 'NUMBER':
        return ast.value;
      case 'VARIABLE': {
        const value = ast.name === 'x' && Number.isFinite(xValue) ? xValue : context[ast.name];
        return typeof value === 'number' ? value : NaN;
      }
      case 'UNARY': {
        const value = this.evaluate(ast.arg, xValue, context);
        return ast.op === '-' ? -value : value;
      }
      case 'BINARY': {
        const left = this.evaluate(ast.left, xValue, context);
        const right = this.evaluate(ast.right, xValue, context);
        switch (ast.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right === 0 ? NaN : left / right;
          case '^': return Math.pow(left, right);
          default: return NaN;
        }
      }
      case 'POSTFIX': {
        const value = this.evaluate(ast.arg, xValue, context);
        if (ast.op === '%') return value / 100;
        if (!Number.isInteger(value) || value < 0 || value > 170) return NaN;
        let result = 1;
        for (let factor = 2; factor <= value; factor++) result *= factor;
        return result;
      }
      case 'FUNCTION': {
        const args = ast.args.map(arg => this.evaluate(arg, xValue, context));
        if (args.some(value => !Number.isFinite(value))) return NaN;
        return this.evaluateFunction(ast.name, args);
      }
      default:
        return NaN;
    }
  }

  static evaluateFunction(name, args) {
    const angleScale = typeof state !== 'undefined' && state.angleMode === 'degrees'
      ? Math.PI / 180
      : 1;
    const angleResult = value => value / angleScale;
    const unary = fn => args.length === 1 ? fn(args[0]) : NaN;

    switch (name) {
      case 'sin': return unary(value => Math.sin(value * angleScale));
      case 'cos': return unary(value => Math.cos(value * angleScale));
      case 'tan': return unary(value => Math.tan(value * angleScale));
      case 'cot': return unary(value => 1 / Math.tan(value * angleScale));
      case 'sec': return unary(value => 1 / Math.cos(value * angleScale));
      case 'csc': return unary(value => 1 / Math.sin(value * angleScale));
      case 'asin': return unary(value => angleResult(Math.asin(value)));
      case 'acos': return unary(value => angleResult(Math.acos(value)));
      case 'atan': return unary(value => angleResult(Math.atan(value)));
      case 'atan2': return args.length === 2 ? angleResult(Math.atan2(args[0], args[1])) : NaN;
      case 'sinh': return unary(value => Math.sinh(value));
      case 'cosh': return unary(value => Math.cosh(value));
      case 'tanh': return unary(value => Math.tanh(value));
      case 'asinh': return unary(value => Math.asinh(value));
      case 'acosh': return unary(value => value >= 1 ? Math.acosh(value) : NaN);
      case 'atanh': return unary(value => Math.abs(value) < 1 ? Math.atanh(value) : NaN);
      case 'sqrt': return unary(value => value >= 0 ? Math.sqrt(value) : NaN);
      case 'cbrt': return unary(value => Math.cbrt(value));
      case 'abs': return unary(value => Math.abs(value));
      case 'ln': return unary(value => value > 0 ? Math.log(value) : NaN);
      case 'log':
        if (args.length === 1) return args[0] > 0 ? Math.log(args[0]) : NaN;
        return args.length === 2 && args[0] > 0 && args[1] > 0 && args[1] !== 1
          ? Math.log(args[0]) / Math.log(args[1])
          : NaN;
      case 'log10': return unary(value => value > 0 ? Math.log10(value) : NaN);
      case 'log2': return unary(value => value > 0 ? Math.log2(value) : NaN);
      case 'exp': return unary(value => Math.exp(value));
      case 'floor': return unary(value => Math.floor(value));
      case 'ceil': return unary(value => Math.ceil(value));
      case 'round': return unary(value => Math.round(value));
      case 'trunc': return unary(value => Math.trunc(value));
      case 'sign': return unary(value => Math.sign(value));
      case 'min': return args.length >= 2 ? Math.min(...args) : NaN;
      case 'max': return args.length >= 2 ? Math.max(...args) : NaN;
      case 'pow': return args.length === 2 ? Math.pow(args[0], args[1]) : NaN;
      case 'hypot': return args.length >= 2 ? Math.hypot(...args) : NaN;
      case 'mod': return args.length === 2 && args[1] !== 0 ? args[0] % args[1] : NaN;
      case 'ncr':
      case 'npr': {
        const [n, r] = args;
        if (args.length !== 2 || !Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n || n > 170) return NaN;
        let result = 1;
        for (let i = 0; i < r; i++) result *= n - i;
        if (name === 'npr') return result;
        for (let i = 2; i <= r; i++) result /= i;
        return result;
      }
      default:
        return NaN;
    }
  }

  static evaluateExpression(expression, variables) {
    return this.evaluate(this.parse(this.tokenize(expression)), NaN, variables);
  }

  static createEvaluator(expression) {
    try {
      const ast = this.parse(this.tokenize(expression));
      return x => this.evaluate(ast, x, {});
    } catch (error) {
      return () => NaN;
    }
  }

  static evalSimple(expression) {
    try {
      return this.evaluateExpression(expression);
    } catch (error) {
      return NaN;
    }
  }
}
