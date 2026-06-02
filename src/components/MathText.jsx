import React from 'react';

// Questions are authored in plain text with a mix of ASCII and Unicode math
// notation (e.g. "x^2", "e^(2x)", "k_B", "2x*sqrt(x^2+1)", "lim(x->0)"). This
// renderer normalizes the look WITHOUT mutating the stored data: ASCII operators
// become their typographic symbols and ^/_ become real <sup>/<sub> elements, so
// questions already using Unicode (x², H₂O) and those using ASCII look the same.

// Unambiguous symbol swaps. Every occurrence in this STEM content is the math
// meaning (e.g. "*" is always multiplication, "sqrt" is always a square root).
const prettify = (s) =>
  String(s)
    .replace(/\*/g, '·')
    .replace(/->/g, '→')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\bsqrt\b/g, '√');

// Walk the text, turning ^x / ^(…) into <sup> and _x / _(…) into <sub>.
// A bare marker captures an optional sign plus a run of alphanumerics/dot;
// a parenthesized/braced group captures (and unwraps) everything inside.
function parseScripts(text, keyPrefix = 'm') {
  const nodes = [];
  let buf = '';
  let i = 0;
  const flush = () => {
    if (buf) {
      nodes.push(buf);
      buf = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];
    if (ch === '^' || ch === '_') {
      const open = text[i + 1];
      let content = '';
      let next = i + 1;

      if (open === '(' || open === '{') {
        const close = open === '(' ? ')' : '}';
        let depth = 0;
        let k = i + 1;
        for (; k < text.length; k++) {
          if (text[k] === open) depth++;
          else if (text[k] === close) {
            depth--;
            if (depth === 0) {
              k++;
              break;
            }
          }
        }
        content = text.slice(i + 2, k - 1); // unwrap the outer pair
        next = k;
      } else {
        let k = i + 1;
        if (text[k] === '-' || text[k] === '+') k++;
        while (k < text.length && /[A-Za-z0-9.]/.test(text[k])) k++;
        content = text.slice(i + 1, k);
        next = k;
      }

      if (content === '') {
        buf += ch; // a lone ^ or _ with nothing after it
        i += 1;
        continue;
      }

      flush();
      const Tag = ch === '^' ? 'sup' : 'sub';
      nodes.push(
        <Tag key={`${keyPrefix}-${nodes.length}`}>
          {parseScripts(content, `${keyPrefix}-${nodes.length}`)}
        </Tag>
      );
      i = next;
    } else {
      buf += ch;
      i += 1;
    }
  }
  flush();
  return nodes;
}

const MathText = ({ children }) => <>{parseScripts(prettify(children ?? ''))}</>;

export default MathText;
