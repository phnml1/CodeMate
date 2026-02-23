import { MOCK_PRS } from "@/constants";
import PRCard from "./PRCard";
import PREmptyState from "./PREmptyState";
import PRListFooter from "./PRListFooter";

export default function PRList() {
  if (MOCK_PRS.length === 0) {
    return <PREmptyState />;
  }

  return (
    <div className="space-y-4">
      {MOCK_PRS.map((pr, index) => (
        <PRCard key={pr.id} {...pr} animationDelay={index * 75} />
      ))}
      <PRListFooter />
    </div>
  );
}
