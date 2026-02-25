"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PR_STATUS_TABS, type PRFilterTab } from "@/constants";
import { cn } from "@/lib/utils";

export default function PRStatusTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get("status") as PRFilterTab) ?? "All";

  const handleTabChange = (tab: PRFilterTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "All") {
      params.delete("status");
    } else {
      params.set("status", tab);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center p-1 bg-slate-50 rounded-[18px] w-full md:w-auto">
      {PR_STATUS_TABS.map((tab) => (
        <Button
          key={tab}
          onClick={() => handleTabChange(tab)}
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
  );
}
