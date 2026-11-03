import { Fragment } from "react";

interface InlineCodeTextProps {
  children: string;
}

const INLINE_CODE_PATTERN = /(`[^`\r\n]+`)/g;

export default function InlineCodeText({ children }: InlineCodeTextProps) {
  return children.split(INLINE_CODE_PATTERN).map((part, index) => {
    const isInlineCode = part.startsWith("`") && part.endsWith("`");

    if (!isInlineCode) {
      return <Fragment key={index}>{part}</Fragment>;
    }

    return (
      <code
        key={index}
        className="box-decoration-clone rounded-[3px] bg-slate-200/70 px-1 py-0.5 font-mono text-[0.9em] text-[#eb5757] dark:bg-slate-700/80 dark:text-rose-300"
      >
        {part.slice(1, -1)}
      </code>
    );
  });
}
