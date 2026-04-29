"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SyntaxHighlightedCodeProps {
  code: string;
  language?: string;
}

const CODE_BLOCK_STYLE = {
  borderRadius: "0.5rem",
  fontSize: "12px",
  margin: 0,
  padding: "12px",
};

export default function SyntaxHighlightedCode({
  code,
  language = "typescript",
}: SyntaxHighlightedCodeProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      customStyle={CODE_BLOCK_STYLE}
      wrapLongLines
    >
      {code}
    </SyntaxHighlighter>
  );
}
