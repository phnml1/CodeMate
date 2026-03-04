import { FileCode, FileBraces, FileText } from "lucide-react";

interface FileIconProps {
  filename: string;
  size?: number;
}

export default function FileIcon({ filename, size = 16 }: FileIconProps) {
  if (filename.endsWith(".json")) return <FileBraces size={size} className="text-amber-500" />;
  if (/\.(ts|tsx|js|jsx)$/.test(filename)) return <FileCode size={size} className="text-blue-500" />;
  return <FileText size={size} className="text-slate-400" />;
}
