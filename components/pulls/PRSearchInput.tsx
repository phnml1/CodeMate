"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

const SEARCH_SYNC_DELAY_MS = 300;

export default function PRSearchInput() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(searchQuery);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = search.trim();

      if (normalizedSearch === searchQuery) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (normalizedSearch) {
        params.set("search", normalizedSearch);
      } else {
        params.delete("search");
      }

      params.delete("page");

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl);
    }, SEARCH_SYNC_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, router, search, searchParams, searchQuery]);

  return (
    <div className="relative flex-1 md:max-w-xs lg:max-w-md">
      <Search
        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <Input
        type="text"
        placeholder="PR 제목, 설명 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-[18px] border-slate-200 bg-white py-2.5 pr-4 pl-10 text-xs placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/5 sm:py-3 sm:text-sm"
      />
    </div>
  );
}
