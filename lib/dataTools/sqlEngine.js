// A compact, dependency-free SQL engine: tokenizer -> recursive-descent
// parser -> in-memory executor. No WASM SQL engine (sql.js/alasql) was
// pulled in — the project has no existing SQL dependency, so per the
// "use existing dependencies before adding new ones / avoid unnecessary
// dependencies" instruction, this hand-written interpreter covers the
// explicitly requested subset (SELECT/WHERE/ORDER BY/GROUP BY/JOIN/INSERT/
// UPDATE/DELETE/CREATE TABLE + common functions) entirely client-side, with
// no WASM bundle to ship. It is NOT a general-purpose SQL engine — see
// SQL_LIMITATIONS below for exactly what it doesn't support, surfaced
// verbatim in the tool's own Limitations section rather than silently
// failing on unsupported syntax.

export const SQL_LIMITATIONS = [
  'Subqueries and Common Table Expressions (WITH ... AS) are not supported.',
  'Only a single JOIN per query is supported (no chained multi-table joins).',
  'Window functions (OVER, PARTITION BY) are not supported.',
  'Transactions (BEGIN/COMMIT/ROLLBACK) are not applicable — every statement runs immediately against the in-browser table.',
  'UNION, INTERSECT, and EXCEPT are not supported.',
];

// ---------------------------------------------------------------------
// TOKENIZER — shared by the parser and the editor's syntax highlighter.
// ---------------------------------------------------------------------

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS', 'DISTINCT', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'NULL', 'IS', 'LIKE', 'IN', 'BETWEEN', 'ASC', 'DESC',
  'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'DROP', 'ALTER', 'DEFAULT',
]);

export function tokenizeSql(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      const start = i;
      while (i < n && /\s/.test(text[i])) i++;
      tokens.push({ type: 'ws', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (ch === '-' && text[i + 1] === '-') {
      const start = i;
      while (i < n && text[i] !== '\n') i++;
      tokens.push({ type: 'comment', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (ch === "'") {
      const start = i; i++;
      while (i < n) {
        if (text[i] === "'" && text[i + 1] === "'") { i += 2; continue; }
        if (text[i] === "'") { i++; break; }
        i++;
      }
      tokens.push({ type: 'string', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (ch === '"') {
      const start = i; i++;
      while (i < n && text[i] !== '"') i++;
      i = Math.min(i + 1, n);
      tokens.push({ type: 'quoted-ident', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < n && /[0-9.]/.test(text[i])) i++;
      tokens.push({ type: 'number', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < n && /[a-zA-Z0-9_]/.test(text[i])) i++;
      const word = text.slice(start, i);
      tokens.push({ type: KEYWORDS.has(word.toUpperCase()) ? 'keyword' : 'ident', start, end: i, text: word });
      continue;
    }
    if ('<>='.includes(ch)) {
      const start = i; i++;
      if ((ch === '<' && (text[i] === '=' || text[i] === '>')) || (ch === '>' && text[i] === '=')) i++;
      tokens.push({ type: 'op', start, end: i, text: text.slice(start, i) });
      continue;
    }
    if ('+-*/%,.();'.includes(ch)) {
      tokens.push({ type: 'punct', start: i, end: i + 1, text: ch });
      i++;
      continue;
    }
    tokens.push({ type: 'punct', start: i, end: i + 1, text: ch });
    i++;
  }
  return tokens;
}

// ---------------------------------------------------------------------
// PARSER — recursive descent over the significant (non-ws, non-comment)
// tokens for a single statement. `parseSql` splits on top-level ';' and
// parses each statement independently, so one bad statement in a
// multi-statement paste doesn't block the others from being reported.
// ---------------------------------------------------------------------

class SqlSyntaxError extends Error {}

function significant(tokens) {
  return tokens.filter((t) => t.type !== 'ws' && t.type !== 'comment');
}

function splitStatements(text) {
  const tokens = significant(tokenizeSql(text));
  const statements = [];
  let current = [];
  let depth = 0;
  for (const t of tokens) {
    if (t.type === 'punct' && t.text === '(') depth++;
    if (t.type === 'punct' && t.text === ')') depth--;
    if (t.type === 'punct' && t.text === ';' && depth === 0) {
      if (current.length) statements.push(current);
      current = [];
      continue;
    }
    current.push(t);
  }
  if (current.length) statements.push(current);
  return statements;
}

class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek(offset = 0) { return this.tokens[this.pos + offset]; }
  atEnd() { return this.pos >= this.tokens.length; }
  isKeyword(word) { const t = this.peek(); return t && t.type === 'keyword' && t.text.toUpperCase() === word; }
  isPunct(ch) { const t = this.peek(); return t && t.type === 'punct' && t.text === ch; }
  isOp(op) { const t = this.peek(); return t && t.type === 'op' && t.text === op; }
  next() { return this.tokens[this.pos++]; }
  expectKeyword(word) {
    if (!this.isKeyword(word)) throw new SqlSyntaxError(`Expected "${word}" near ${this.describe()}`);
    return this.next();
  }
  expectPunct(ch) {
    if (!this.isPunct(ch)) throw new SqlSyntaxError(`Expected "${ch}" near ${this.describe()}`);
    return this.next();
  }
  describe() {
    const t = this.peek();
    return t ? `"${t.text}"` : 'end of statement';
  }
  identName() {
    const t = this.peek();
    if (!t) throw new SqlSyntaxError('Expected an identifier but statement ended.');
    if (t.type === 'ident' || t.type === 'keyword') { this.next(); return t.text; }
    if (t.type === 'quoted-ident') { this.next(); return t.text.slice(1, -1); }
    throw new SqlSyntaxError(`Expected an identifier near ${this.describe()}`);
  }

  parseStatement() {
    if (this.isKeyword('SELECT')) return this.parseSelect();
    if (this.isKeyword('INSERT')) return this.parseInsert();
    if (this.isKeyword('UPDATE')) return this.parseUpdate();
    if (this.isKeyword('DELETE')) return this.parseDelete();
    if (this.isKeyword('CREATE')) return this.parseCreateTable();
    throw new SqlSyntaxError(`Unsupported or unrecognized statement starting at ${this.describe()}. Supported: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE.`);
  }

  parseColumnRef() {
    let name = this.identName();
    if (this.isPunct('.')) { this.next(); const col = this.identName(); return { table: name, column: col }; }
    return { table: null, column: name };
  }

  parseSelect() {
    this.expectKeyword('SELECT');
    let distinct = false;
    if (this.isKeyword('DISTINCT')) { this.next(); distinct = true; }
    const columns = [];
    do {
      if (this.isPunct('*')) { this.next(); columns.push({ type: 'star' }); continue; }
      const expr = this.parseExpression();
      let alias = null;
      if (this.isKeyword('AS')) { this.next(); alias = this.identName(); }
      else if (this.peek() && (this.peek().type === 'ident')) { alias = this.identName(); }
      columns.push({ type: 'expr', expr, alias });
    } while (this.isPunct(',') && this.next());

    this.expectKeyword('FROM');
    const from = { name: this.identName(), alias: null };
    if (this.peek() && this.peek().type === 'ident') from.alias = this.identName();

    let join = null;
    if (this.isKeyword('JOIN') || this.isKeyword('INNER') || this.isKeyword('LEFT')) {
      const joinType = this.isKeyword('LEFT') ? 'LEFT' : 'INNER';
      if (this.isKeyword('INNER') || this.isKeyword('LEFT')) { this.next(); if (this.isKeyword('OUTER')) this.next(); }
      this.expectKeyword('JOIN');
      const table = { name: this.identName(), alias: null };
      if (this.peek() && this.peek().type === 'ident') table.alias = this.identName();
      this.expectKeyword('ON');
      const on = this.parseExpression();
      join = { type: joinType, table, on };
    }

    let where = null;
    if (this.isKeyword('WHERE')) { this.next(); where = this.parseExpression(); }

    let groupBy = [];
    if (this.isKeyword('GROUP')) {
      this.next(); this.expectKeyword('BY');
      do { groupBy.push(this.parseColumnRef()); } while (this.isPunct(',') && this.next());
    }

    let having = null;
    if (this.isKeyword('HAVING')) { this.next(); having = this.parseExpression(); }

    let orderBy = [];
    if (this.isKeyword('ORDER')) {
      this.next(); this.expectKeyword('BY');
      do {
        const col = this.parseColumnRef();
        let dir = 'ASC';
        if (this.isKeyword('ASC')) { this.next(); }
        else if (this.isKeyword('DESC')) { this.next(); dir = 'DESC'; }
        orderBy.push({ col, dir });
      } while (this.isPunct(',') && this.next());
    }

    let limit = null;
    if (this.isKeyword('LIMIT')) { this.next(); limit = Number(this.next().text); }

    return { type: 'SELECT', distinct, columns, from, join, where, groupBy, having, orderBy, limit };
  }

  parseInsert() {
    this.expectKeyword('INSERT');
    this.expectKeyword('INTO');
    const table = this.identName();
    let columns = null;
    if (this.isPunct('(')) {
      this.next();
      columns = [];
      do { columns.push(this.identName()); } while (this.isPunct(',') && this.next());
      this.expectPunct(')');
    }
    this.expectKeyword('VALUES');
    const valueRows = [];
    do {
      this.expectPunct('(');
      const values = [];
      do { values.push(this.parseExpression()); } while (this.isPunct(',') && this.next());
      this.expectPunct(')');
      valueRows.push(values);
    } while (this.isPunct(',') && this.next());
    return { type: 'INSERT', table, columns, valueRows };
  }

  parseUpdate() {
    this.expectKeyword('UPDATE');
    const table = this.identName();
    this.expectKeyword('SET');
    const assignments = [];
    do {
      const col = this.identName();
      if (!this.isOp('=')) throw new SqlSyntaxError(`Expected "=" after column "${col}" in SET clause.`);
      this.next();
      const expr = this.parseExpression();
      assignments.push({ column: col, expr });
    } while (this.isPunct(',') && this.next());
    let where = null;
    if (this.isKeyword('WHERE')) { this.next(); where = this.parseExpression(); }
    return { type: 'UPDATE', table, assignments, where };
  }

  parseDelete() {
    this.expectKeyword('DELETE');
    this.expectKeyword('FROM');
    const table = this.identName();
    let where = null;
    if (this.isKeyword('WHERE')) { this.next(); where = this.parseExpression(); }
    return { type: 'DELETE', table, where };
  }

  parseCreateTable() {
    this.expectKeyword('CREATE');
    this.expectKeyword('TABLE');
    const table = this.identName();
    this.expectPunct('(');
    const columns = [];
    do {
      const name = this.identName();
      let dataType = 'TEXT';
      if (this.peek() && (this.peek().type === 'ident' || this.peek().type === 'keyword') && !this.isKeyword('PRIMARY')) {
        dataType = this.identName().toUpperCase();
      }
      // Skip constraint keywords we don't enforce (PRIMARY KEY, NOT NULL,
      // DEFAULT ...) — recognized and consumed, not silently misparsed.
      while (this.isKeyword('PRIMARY') || this.isKeyword('KEY') || this.isKeyword('NOT') || this.isKeyword('NULL') || this.isKeyword('DEFAULT')) {
        this.next();
        if (this.peek() && (this.peek().type === 'string' || this.peek().type === 'number')) this.next();
      }
      columns.push({ name, dataType });
    } while (this.isPunct(',') && this.next());
    this.expectPunct(')');
    return { type: 'CREATE_TABLE', table, columns };
  }

  // Precedence climbing: OR < AND < NOT < comparison < additive < multiplicative < unary < primary
  parseExpression() { return this.parseOr(); }
  parseOr() {
    let left = this.parseAnd();
    while (this.isKeyword('OR')) { this.next(); const right = this.parseAnd(); left = { type: 'or', left, right }; }
    return left;
  }
  parseAnd() {
    let left = this.parseNot();
    while (this.isKeyword('AND')) { this.next(); const right = this.parseNot(); left = { type: 'and', left, right }; }
    return left;
  }
  parseNot() {
    if (this.isKeyword('NOT')) { this.next(); return { type: 'not', value: this.parseNot() }; }
    return this.parseComparison();
  }
  parseComparison() {
    const left = this.parseAdditive();
    const t = this.peek();
    if (t && t.type === 'op') {
      this.next();
      const right = this.parseAdditive();
      return { type: 'compare', op: t.text, left, right };
    }
    if (this.isKeyword('LIKE')) {
      this.next();
      const right = this.parseAdditive();
      return { type: 'like', left, right };
    }
    if (this.isKeyword('IN')) {
      this.next();
      this.expectPunct('(');
      const list = [];
      do { list.push(this.parseExpression()); } while (this.isPunct(',') && this.next());
      this.expectPunct(')');
      return { type: 'in', left, list };
    }
    if (this.isKeyword('BETWEEN')) {
      this.next();
      const low = this.parseAdditive();
      this.expectKeyword('AND');
      const high = this.parseAdditive();
      return { type: 'between', left, low, high };
    }
    if (this.isKeyword('IS')) {
      this.next();
      let negate = false;
      if (this.isKeyword('NOT')) { this.next(); negate = true; }
      this.expectKeyword('NULL');
      return { type: 'isnull', left, negate };
    }
    return left;
  }
  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.isPunct('+') || this.isPunct('-')) {
      const op = this.next().text;
      const right = this.parseMultiplicative();
      left = { type: 'arith', op, left, right };
    }
    return left;
  }
  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.isPunct('*') || this.isPunct('/') || this.isPunct('%')) {
      const op = this.next().text;
      const right = this.parseUnary();
      left = { type: 'arith', op, left, right };
    }
    return left;
  }
  parseUnary() {
    if (this.isPunct('-')) { this.next(); return { type: 'neg', value: this.parseUnary() }; }
    return this.parsePrimary();
  }
  parsePrimary() {
    const t = this.peek();
    if (!t) throw new SqlSyntaxError('Unexpected end of statement.');
    if (t.type === 'number') { this.next(); return { type: 'literal', value: t.text.includes('.') ? parseFloat(t.text) : parseInt(t.text, 10) }; }
    if (t.type === 'string') { this.next(); return { type: 'literal', value: t.text.slice(1, -1).replace(/''/g, "'") }; }
    if (this.isKeyword('NULL')) { this.next(); return { type: 'literal', value: null }; }
    if (this.isKeyword('TRUE')) { this.next(); return { type: 'literal', value: true }; }
    if (this.isKeyword('FALSE')) { this.next(); return { type: 'literal', value: false }; }
    if (t.type === 'punct' && t.text === '(') {
      this.next();
      const expr = this.parseExpression();
      this.expectPunct(')');
      return expr;
    }
    if (t.type === 'punct' && t.text === '*') { this.next(); return { type: 'star' }; }
    if (t.type === 'ident' || t.type === 'keyword' || t.type === 'quoted-ident') {
      const name = this.identName();
      if (this.isPunct('(')) {
        this.next();
        const args = [];
        if (this.isPunct('*')) { this.next(); args.push({ type: 'star' }); }
        else if (!this.isPunct(')')) {
          do { args.push(this.parseExpression()); } while (this.isPunct(',') && this.next());
        }
        this.expectPunct(')');
        return { type: 'call', name: name.toUpperCase(), args };
      }
      if (this.isPunct('.')) {
        this.next();
        const col = this.identName();
        return { type: 'column', table: name, column: col };
      }
      return { type: 'column', table: null, column: name };
    }
    throw new SqlSyntaxError(`Unexpected token ${this.describe()}`);
  }
}

export function parseSql(text) {
  const chunks = splitStatements(text);
  if (!chunks.length) return { statements: [], errors: [{ message: 'No SQL statement found.', statementIndex: 0 }] };
  const statements = [];
  const errors = [];
  chunks.forEach((tokens, idx) => {
    try {
      const parser = new Parser(tokens);
      const stmt = parser.parseStatement();
      if (parser.pos < parser.tokens.length) {
        throw new SqlSyntaxError(`Unexpected extra input near ${parser.describe()}`);
      }
      statements.push(stmt);
    } catch (e) {
      errors.push({ message: e.message || 'Syntax error.', statementIndex: idx });
    }
  });
  return { statements, errors };
}

export function validateSql(text) {
  const { statements, errors } = parseSql(text);
  return { valid: errors.length === 0 && statements.length > 0, statementCount: statements.length, errors };
}

// ---------------------------------------------------------------------
// FORMATTER — rule-based: uppercase keywords, put major clauses on their
// own line, indent SELECT columns. Not a full pretty-printer for deeply
// nested subqueries (not supported anyway — see SQL_LIMITATIONS).
// ---------------------------------------------------------------------

const CLAUSE_BREAKS = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'VALUES', 'SET'];

export function formatSql(text) {
  const tokens = significant(tokenizeSql(text));
  let out = '';
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    let word = t.type === 'keyword' ? t.text.toUpperCase() : t.text;
    // Merge two-word clause keywords (GROUP BY / ORDER BY) so the break
    // logic below treats them as one clause head.
    if (t.type === 'keyword' && ['GROUP', 'ORDER'].includes(t.text.toUpperCase()) && tokens[i + 1] && tokens[i + 1].type === 'keyword' && tokens[i + 1].text.toUpperCase() === 'BY') {
      word = `${t.text.toUpperCase()} BY`;
      i++;
    }
    if (t.type === 'keyword' && ['INNER', 'LEFT'].includes(t.text.toUpperCase()) && tokens[i + 1] && tokens[i + 1].type === 'keyword' && tokens[i + 1].text.toUpperCase() === 'JOIN') {
      word = `${t.text.toUpperCase()} JOIN`;
      i++;
    }
    const isBreak = CLAUSE_BREAKS.includes(word);
    if (isBreak && out.trim() !== '') out += '\n';
    if (out !== '' && !out.endsWith('\n') && !(t.type === 'punct' && [',', ')', ';', '.'].includes(t.text))) out += ' ';
    if (t.type === 'punct' && t.text === '(' && out.endsWith(' ')) out = out.slice(0, -1) + '(';
    out += word;
    i++;
  }
  return out.trim();
}

export function minifySql(text) {
  const tokens = significant(tokenizeSql(text));
  return tokens.map((t) => (t.type === 'keyword' ? t.text.toUpperCase() : t.text)).join(' ').replace(/\s+([,.)])/g, '$1').replace(/\(\s+/g, '(');
}

// ---------------------------------------------------------------------
// EXECUTOR — runs a parsed statement against an in-memory `db`:
// { tableName: { columns: [string], rows: [{col: value}] } }. Mutating
// statements (INSERT/UPDATE/DELETE/CREATE TABLE) mutate a shallow-cloned
// db and return the new db alongside a result summary; SELECT returns a
// read-only result table plus timing/row-count stats.
// ---------------------------------------------------------------------

class SqlRuntimeError extends Error {}

function resolveColumnValue(row, tables, ref) {
  if (ref.table) {
    const t = tables[ref.table];
    if (!t) throw new SqlRuntimeError(`Unknown table alias "${ref.table}".`);
    if (!(ref.column in t)) throw new SqlRuntimeError(`Unknown column "${ref.table}.${ref.column}".`);
    return t[ref.column];
  }
  // Unqualified column — search every joined table's row for a match.
  for (const alias of Object.keys(tables)) {
    if (ref.column in tables[alias]) return tables[alias][ref.column];
  }
  throw new SqlRuntimeError(`Unknown column "${ref.column}".`);
}

function coerceComparable(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  const s = String(v);
  if (/^-?\d+(\.\d+)?$/.test(s.trim())) return Number(s);
  return s;
}

function evalExpr(node, ctx) {
  switch (node.type) {
    case 'literal': return node.value;
    case 'star': return '*';
    case 'column': return resolveColumnValue(ctx.row, ctx.tables, node);
    case 'neg': return -evalExpr(node.value, ctx);
    case 'not': return !truthy(evalExpr(node.value, ctx));
    case 'and': return truthy(evalExpr(node.left, ctx)) && truthy(evalExpr(node.right, ctx));
    case 'or': return truthy(evalExpr(node.left, ctx)) || truthy(evalExpr(node.right, ctx));
    case 'arith': {
      const a = Number(evalExpr(node.left, ctx));
      const b = Number(evalExpr(node.right, ctx));
      if (node.op === '+') return a + b;
      if (node.op === '-') return a - b;
      if (node.op === '*') return a * b;
      if (node.op === '/') return b === 0 ? null : a / b;
      if (node.op === '%') return a % b;
      return null;
    }
    case 'compare': {
      const a = coerceComparable(evalExpr(node.left, ctx));
      const b = coerceComparable(evalExpr(node.right, ctx));
      switch (node.op) {
        case '=': return a === b;
        case '!=': case '<>': return a !== b;
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
        default: throw new SqlRuntimeError(`Unknown operator "${node.op}".`);
      }
    }
    case 'like': {
      const a = String(evalExpr(node.left, ctx) ?? '');
      const pattern = String(evalExpr(node.right, ctx) ?? '');
      const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i');
      return re.test(a);
    }
    case 'in': {
      const a = coerceComparable(evalExpr(node.left, ctx));
      return node.list.some((n) => coerceComparable(evalExpr(n, ctx)) === a);
    }
    case 'between': {
      const a = coerceComparable(evalExpr(node.left, ctx));
      const low = coerceComparable(evalExpr(node.low, ctx));
      const high = coerceComparable(evalExpr(node.high, ctx));
      return a >= low && a <= high;
    }
    case 'isnull': {
      const v = evalExpr(node.left, ctx);
      const isNull = v === null || v === undefined || v === '';
      return node.negate ? !isNull : isNull;
    }
    case 'call': return evalFunction(node, ctx);
    default: throw new SqlRuntimeError(`Cannot evaluate expression of type "${node.type}".`);
  }
}

function truthy(v) { return v === true || v === 1; }

const AGGREGATE_NAMES = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']);

function evalFunction(node, ctx) {
  const name = node.name;
  if (AGGREGATE_NAMES.has(name)) {
    if (!ctx.groupRows) throw new SqlRuntimeError(`${name}(...) can only be used with GROUP BY or as a whole-table aggregate.`);
    const arg = node.args[0];
    if (name === 'COUNT') {
      if (arg && arg.type === 'star') return ctx.groupRows.length;
      return ctx.groupRows.filter((tables) => { const v = evalExpr(arg, { ...ctx, tables }); return v != null && v !== ''; }).length;
    }
    const nums = ctx.groupRows.map((tables) => Number(evalExpr(arg, { ...ctx, tables }))).filter((n) => !Number.isNaN(n));
    if (name === 'SUM') return nums.reduce((a, b) => a + b, 0);
    if (name === 'AVG') return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    if (name === 'MIN') return nums.length ? Math.min(...nums) : null;
    if (name === 'MAX') return nums.length ? Math.max(...nums) : null;
  }
  const args = node.args.map((a) => evalExpr(a, ctx));
  switch (name) {
    case 'UPPER': return String(args[0] ?? '').toUpperCase();
    case 'LOWER': return String(args[0] ?? '').toLowerCase();
    case 'LENGTH': case 'LEN': return String(args[0] ?? '').length;
    case 'ROUND': return Number((Number(args[0]) || 0).toFixed(args[1] != null ? Number(args[1]) : 0));
    case 'ABS': return Math.abs(Number(args[0]) || 0);
    case 'CONCAT': return args.map((a) => (a == null ? '' : String(a))).join('');
    case 'TRIM': return String(args[0] ?? '').trim();
    case 'COALESCE': return args.find((a) => a !== null && a !== undefined) ?? null;
    default: throw new SqlRuntimeError(`Unsupported function "${name}(...)". Supported: COUNT, SUM, AVG, MIN, MAX, UPPER, LOWER, LENGTH, ROUND, ABS, CONCAT, TRIM, COALESCE.`);
  }
}

function requireTable(db, name) {
  const t = db[name];
  if (!t) throw new SqlRuntimeError(`Table "${name}" does not exist. Import a CSV/JSON/XLSX file first, or run CREATE TABLE.`);
  return t;
}

function exprColumnLabel(expr, alias) {
  if (alias) return alias;
  if (expr.type === 'column') return expr.column;
  if (expr.type === 'call') return `${expr.name.toLowerCase()}`;
  return 'expr';
}

function runSelect(stmt, db) {
  const fromTable = requireTable(db, stmt.from.name);
  const fromAlias = stmt.from.alias || stmt.from.name;

  let joined = fromTable.rows.map((row) => ({ [fromAlias]: row, [stmt.from.name]: row }));

  if (stmt.join) {
    const joinTable = requireTable(db, stmt.join.table.name);
    const joinAlias = stmt.join.table.alias || stmt.join.table.name;
    const next = [];
    for (const left of joined) {
      let matched = false;
      for (const rightRow of joinTable.rows) {
        const tables = { ...left, [joinAlias]: rightRow, [stmt.join.table.name]: rightRow };
        if (truthy(evalExpr(stmt.join.on, { tables, row: null }))) {
          matched = true;
          next.push(tables);
        }
      }
      if (!matched && stmt.join.type === 'LEFT') {
        const emptyRight = {};
        for (const c of joinTable.columns) emptyRight[c] = null;
        next.push({ ...left, [joinAlias]: emptyRight, [stmt.join.table.name]: emptyRight });
      }
    }
    joined = next;
  }

  let filtered = stmt.where ? joined.filter((tables) => truthy(evalExpr(stmt.where, { tables, row: null }))) : joined;

  let groups;
  if (stmt.groupBy.length) {
    const buckets = new Map();
    for (const tables of filtered) {
      const key = stmt.groupBy.map((c) => resolveColumnValue(null, tables, c)).join('\u0001');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(tables);
    }
    groups = [...buckets.values()];
  } else if (stmt.columns.some((c) => c.type === 'expr' && c.expr.type === 'call' && AGGREGATE_NAMES.has(c.expr.name))) {
    groups = filtered.length ? [filtered] : [[]];
  } else {
    groups = filtered.map((t) => [t]);
  }

  let resultRows = groups.map((groupTables) => {
    const representative = groupTables[0] || {};
    const ctx = { tables: representative, row: null, groupRows: groupTables };
    const out = {};
    let starTables = stmt.columns.some((c) => c.type === 'star') ? representative : null;
    if (starTables) {
      for (const alias of new Set([stmt.from.alias || stmt.from.name, ...(stmt.join ? [stmt.join.table.alias || stmt.join.table.name] : [])])) {
        const rowObj = starTables[alias];
        if (rowObj) for (const [k, v] of Object.entries(rowObj)) out[k] = v;
      }
    }
    for (const col of stmt.columns) {
      if (col.type === 'star') continue;
      out[exprColumnLabel(col.expr, col.alias)] = evalExpr(col.expr, ctx);
    }
    return out;
  });

  if (stmt.having) {
    resultRows = resultRows.filter((_, idx) => {
      const ctx = { tables: groups[idx][0] || {}, row: null, groupRows: groups[idx] };
      return truthy(evalExpr(stmt.having, ctx));
    });
  }

  if (stmt.distinct) {
    const seen = new Set();
    resultRows = resultRows.filter((r) => {
      const key = JSON.stringify(r);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  if (stmt.orderBy.length) {
    resultRows.sort((a, b) => {
      for (const ord of stmt.orderBy) {
        const av = coerceComparable(a[ord.col.column]);
        const bv = coerceComparable(b[ord.col.column]);
        if (av < bv) return ord.dir === 'ASC' ? -1 : 1;
        if (av > bv) return ord.dir === 'ASC' ? 1 : -1;
      }
      return 0;
    });
  }

  if (stmt.limit != null) resultRows = resultRows.slice(0, stmt.limit);

  const columns = resultRows.length ? Object.keys(resultRows[0]) : (stmt.columns[0] && stmt.columns[0].type !== 'star' ? stmt.columns.map((c) => exprColumnLabel(c.expr, c.alias)) : []);
  return { columns, rows: resultRows };
}

function cloneDb(db) {
  const out = {};
  for (const [name, t] of Object.entries(db)) out[name] = { columns: [...t.columns], rows: t.rows.map((r) => ({ ...r })) };
  return out;
}

// Returns { db, result }. `result` shape depends on statement type:
// SELECT -> { kind:'select', columns, rows, rowCount }
// INSERT/UPDATE/DELETE -> { kind:'mutation', message, affectedRows }
// CREATE_TABLE -> { kind:'ddl', message }
export function executeStatement(stmt, db) {
  if (stmt.type === 'SELECT') {
    const { columns, rows } = runSelect(stmt, db);
    return { db, result: { kind: 'select', columns, rows, rowCount: rows.length } };
  }

  const next = cloneDb(db);

  if (stmt.type === 'INSERT') {
    const table = requireTable(next, stmt.table);
    const columns = stmt.columns || table.columns;
    for (const values of stmt.valueRows) {
      if (values.length !== columns.length) throw new SqlRuntimeError(`INSERT has ${values.length} value(s) but ${columns.length} column(s) were specified.`);
      const row = {};
      for (const c of table.columns) row[c] = '';
      columns.forEach((c, i) => { row[c] = evalExpr(values[i], { tables: {}, row: null }); });
      table.rows.push(row);
    }
    return { db: next, result: { kind: 'mutation', message: `Inserted ${stmt.valueRows.length} row(s) into "${stmt.table}".`, affectedRows: stmt.valueRows.length } };
  }

  if (stmt.type === 'UPDATE') {
    const table = requireTable(next, stmt.table);
    let affected = 0;
    table.rows = table.rows.map((row) => {
      const tables = { [stmt.table]: row };
      if (stmt.where && !truthy(evalExpr(stmt.where, { tables, row: null }))) return row;
      affected++;
      const updated = { ...row };
      for (const a of stmt.assignments) updated[a.column] = evalExpr(a.expr, { tables: { [stmt.table]: updated }, row: null });
      return updated;
    });
    return { db: next, result: { kind: 'mutation', message: `Updated ${affected} row(s) in "${stmt.table}".`, affectedRows: affected } };
  }

  if (stmt.type === 'DELETE') {
    const table = requireTable(next, stmt.table);
    const before = table.rows.length;
    table.rows = table.rows.filter((row) => {
      if (!stmt.where) return false;
      const tables = { [stmt.table]: row };
      return !truthy(evalExpr(stmt.where, { tables, row: null }));
    });
    const affected = before - table.rows.length;
    return { db: next, result: { kind: 'mutation', message: `Deleted ${affected} row(s) from "${stmt.table}".`, affectedRows: affected } };
  }

  if (stmt.type === 'CREATE_TABLE') {
    if (next[stmt.table]) throw new SqlRuntimeError(`Table "${stmt.table}" already exists.`);
    next[stmt.table] = { columns: stmt.columns.map((c) => c.name), rows: [] };
    return { db: next, result: { kind: 'ddl', message: `Created table "${stmt.table}" with ${stmt.columns.length} column(s).` } };
  }

  throw new SqlRuntimeError(`Unsupported statement type "${stmt.type}".`);
}

// Runs every statement in `text` in order against `db`, stopping at the
// first runtime error (later statements in the same paste may depend on
// earlier ones — e.g. CREATE TABLE then INSERT). Returns the final db plus
// one result entry per statement that ran, and the error (if any) that
// stopped execution.
export function runSql(text, db) {
  const { statements, errors: parseErrors } = parseSql(text);
  if (parseErrors.length) {
    return { db, results: [], error: { message: parseErrors[0].message, phase: 'parse' } };
  }
  let currentDb = db;
  const results = [];
  const started = performance.now();
  for (const stmt of statements) {
    try {
      const { db: nextDb, result } = executeStatement(stmt, currentDb);
      currentDb = nextDb;
      results.push(result);
    } catch (e) {
      return { db: currentDb, results, error: { message: e.message || 'Query failed.', phase: 'execute' } };
    }
  }
  const elapsedMs = performance.now() - started;
  return { db: currentDb, results, error: null, elapsedMs };
}
