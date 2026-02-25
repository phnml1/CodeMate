"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export default function PRSearchInput() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  return (
    <div className="relative flex-1 md:max-w-xs lg:max-w-md">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        aria-hidden
      />
      <Input
        type="text"
        placeholder="PR 제목, 작성자 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border-slate-200 rounded-[18px] text-xs sm:text-sm focus:ring-4 focus:ring-blue-700/5 focus:border-blue-700 placeholder:text-slate-400"
      />
    </div>
  );
}
