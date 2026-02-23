import { FileCode } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface PRCardAuthor {
  name: string;
  initial: string;
  avatarUrl?: string;
}

interface PRCardMetaProps {
  repoName: string;
  relativeTime: string;
  author?: PRCardAuthor;
}

export default function PRCardMeta({
  repoName,
  relativeTime,
  author,
}: PRCardMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-500 font-medium">
      <div className="flex items-center gap-1.5 text-blue-700 font-bold">
        <FileCode size={14} aria-hidden />
        <span className="truncate max-w-30 sm:max-w-none">{repoName}</span>
      </div>

      {author && (
        <>
          <span className="hidden sm:block w-1 h-1 bg-slate-200 rounded-full" />
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              {author.avatarUrl && (
                <AvatarImage src={author.avatarUrl} alt={author.name} />
              )}
              <AvatarFallback className="bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-bold border border-slate-200">
                {author.initial}
              </AvatarFallback>
            </Avatar>
            <span className="text-slate-700">{author.name}</span>
          </div>
        </>
      )}

      <span className="hidden sm:block w-1 h-1 bg-slate-200 rounded-full" />
      <span className="text-slate-400 italic text-[11px] sm:text-xs">
        {relativeTime}
      </span>
    </div>
  );
}
