"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type PRStatus = "All" | "Open" | "Merged" | "Closed" | "Draft";

const tabs: PRStatus[] = ["All", "Open", "Merged", "Closed", "Draft"];

export default function PRStatusFilter() {
  const [active, setActive] = useState<PRStatus>("All");
  const [search, setSearch] = useState("");

  return (
    <>
      <div className="flex items-center p-1 bg-slate-50 rounded-[18px] w-full md:w-auto">
        {tabs.map((tab) => (
          <Button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "flex-1 md:flex-none md:px-6 py-2 rounded-[14px] text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
              active === tab
                ? "bg-blue-700 text-white shadow-md hover:bg-blue-700"
                : "bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 shadow-none"
            )}
          >
            {tab}
          </Button>
        ))}
      </div>
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
    </>
  );
}
