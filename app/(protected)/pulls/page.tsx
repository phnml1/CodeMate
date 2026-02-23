import { Suspense } from "react";
import PRFilterBar from "@/components/pulls/PRFilterBar";
import PRList from "@/components/pulls/PRList";
import PRPageHeader from "@/components/pulls/PRPageHeader";

export default function Page() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PRPageHeader />
      <PRFilterBar />
      <Suspense>
        <PRList />
      </Suspense>
    </div>
  );
}
