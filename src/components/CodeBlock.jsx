import React from 'react';
import './CodeBlock.css';

// Renders a code snippet for bug/crux/complexity cards. Plain monospace with
// preserved whitespace; React escapes the text so it's injection-safe.
// (Syntax highlighting is a later enhancement — kept dependency-free for now.)
const CodeBlock = ({ code }) => {
  if (!code) return null;
  return (
    <pre className="code-block">
      <code>{code}</code>
    </pre>
  );
};

export default CodeBlock;
