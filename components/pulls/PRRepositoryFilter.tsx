"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnectedRepositories } from "@/hooks/useConnectedRepositories";
import { controlStyles } from "@/lib/styles";
import { cn } from "@/lib/utils";

const ALL_REPOSITORIES_VALUE = "__all__";

export default function PRRepositoryFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRepoId = searchParams.get("repoId") ?? "";
  const { data, isLoading } = useConnectedRepositories();

  const repositories = data?.repositories ?? [];
  const selectedRepository = repositories.find((repo) => repo.id === selectedRepoId);
  const label = selectedRepository?.fullName ?? "모든 저장소";

  const handleValueChange = (repoId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (repoId === ALL_REPOSITORIES_VALUE) {
      params.delete("repoId");
    } else {
      params.set("repoId", repoId);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("gap-2 px-4 py-2.5 text-sm", controlStyles.secondaryAction)}
        >
          <span className="max-w-52 truncate">
            {isLoading ? "저장소 불러오는 중..." : label}
          </span>
          <ChevronDown className="text-slate-400" size={16} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onSelect={() => handleValueChange(ALL_REPOSITORIES_VALUE)}>
          모든 저장소
        </DropdownMenuItem>
        {repositories.map((repo) => (
          <DropdownMenuItem key={repo.id} onSelect={() => handleValueChange(repo.id)}>
            {repo.fullName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
