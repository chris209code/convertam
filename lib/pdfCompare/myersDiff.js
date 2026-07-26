// Myers O(ND) diff over two arrays of tokens, using a caller-supplied
// equality function. Standard greedy-forward-then-backtrack shape (same
// approach as git/diff-match-patch) — chosen over a plain O(n*m) LCS table
// because compare-pdf inputs are lines of an entire document (can be
// thousands of tokens), where an O(n*m) table would blow up memory; Myers is
// O((n+m)*D) where D is the edit distance, which stays small for two
// versions of "the same" document.
export function diffArrays(a, b, isEqual = (x, y) => x === y) {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) return [];
  const max = n + m;
  const trace = [];
  let v = new Map([[1, 0]]);
  let finalD = -1;

  outer:
  for (let d = 0; d <= max; d++) {
    trace.push(v);
    const nextV = new Map(v);
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) {
        x = v.get(k + 1) ?? 0;
      } else {
        x = (v.get(k - 1) ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && isEqual(a[x], b[y])) { x++; y++; }
      nextV.set(k, x);
      if (x >= n && y >= m) {
        finalD = d;
        v = nextV;
        break outer;
      }
    }
    v = nextV;
  }

  if (finalD === -1) {
    // Should be unreachable (d = max always finds x>=n && y>=m), but guard anyway.
    finalD = max;
  }

  // Backtrack through the recorded traces to build the edit script.
  const script = [];
  let x = n;
  let y = m;
  for (let d = finalD; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK;
    if (k === -d || (k !== d && (vPrev.get(k - 1) ?? -1) < (vPrev.get(k + 1) ?? -1))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vPrev.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      script.push({ type: 'equal', aIndex: x - 1, bIndex: y - 1 });
      x--; y--;
    }
    if (x === prevX) {
      script.push({ type: 'insert', aIndex: -1, bIndex: y - 1 });
      y--;
    } else {
      script.push({ type: 'delete', aIndex: x - 1, bIndex: -1 });
      x--;
    }
  }
  while (x > 0 && y > 0) {
    script.push({ type: 'equal', aIndex: x - 1, bIndex: y - 1 });
    x--; y--;
  }
  script.reverse();
  return script;
}
