-- PENDING 또는 IN_PROGRESS 상태인 Review는 pullRequestId당 하나만 허용
-- COMPLETED / FAILED 레코드는 이 제약에 포함되지 않으므로 리뷰 이력은 그대로 보존됨
CREATE UNIQUE INDEX "review_active_unique"
  ON "Review" ("pullRequestId")
  WHERE status IN ('PENDING', 'IN_PROGRESS');
