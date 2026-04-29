interface PlainCodeBlockProps {
  code: string;
}

export default function PlainCodeBlock({ code }: PlainCodeBlockProps) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 font-mono text-[12px] leading-relaxed text-slate-100 dark:bg-black">
      <code>{code}</code>
    </pre>
  );
}
