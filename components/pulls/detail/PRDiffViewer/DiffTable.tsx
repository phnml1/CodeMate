import { DIFF_ROW_CLASS, DIFF_CODE_CLASS, DIFF_SYMBOL } from "@/constants/diff";
import type { DiffLine } from "@/lib/diff";

interface DiffTableProps {
  lines: DiffLine[];
}

export default function DiffTable({ lines }: DiffTableProps) {
  return (
    <table className="w-full border-collapse font-mono text-[11px] md:text-xs leading-relaxed table-fixed min-w-full">
      <colgroup>
        <col className="w-10" />
        <col className="w-10" />
        <col className="w-6" />
        <col />
      </colgroup>
      <tbody>
        {lines.map((line, i) => (
          <tr
            key={i}
            className={`${DIFF_ROW_CLASS[line.type]} hover:brightness-95 dark:hover:brightness-110 transition-all`}
          >
            <td className="px-2 py-0.5 text-right border-r border-slate-200 dark:border-slate-800 select-none opacity-40 text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
              {line.oldNum ?? ""}
            </td>
            <td className="px-2 py-0.5 text-right border-r border-slate-200 dark:border-slate-800 select-none opacity-40 text-[10px] bg-slate-50/50 dark:bg-slate-800/30">
              {line.newNum ?? ""}
            </td>
            <td className="px-2 py-0.5 text-center border-r border-slate-200 dark:border-slate-800 select-none opacity-60 font-black">
              {DIFF_SYMBOL[line.type]}
            </td>
            <td className={`px-4 py-0.5 whitespace-pre overflow-visible ${DIFF_CODE_CLASS[line.type]}`}>
              {line.content}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
