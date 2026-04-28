import ReviewProgressSteps from "./ReviewProgressSteps";
import type { ReviewStage } from "@/types/review";

interface ReviewProgressStateProps {
  stage: ReviewStage;
}

export default function ReviewProgressState({
  stage,
}: ReviewProgressStateProps) {
  return (
    <div className="space-y-4 py-2">
      <ReviewProgressSteps stage={stage} />
    </div>
  );
}
