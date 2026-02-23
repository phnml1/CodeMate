/**
 * 공통 텍스트 스타일 상수
 * Tailwind 클래스를 문자열로 관리하여 일관성 유지
 */
export const textStyles = {
  /** 페이지 최상단 제목 (h1) */
  pageTitle: "text-3xl font-bold text-slate-900 tracking-tight",

  /** 페이지 제목 아래 설명 문구 */
  pageSubtitle: "text-sm text-slate-500 font-medium mt-1",

  /** 카드/섹션 제목 (h2 수준, 반응형) */
  sectionTitle: "text-base sm:text-lg font-bold text-slate-900",

  /** 테이블 헤더 셀 */
  tableHeader: "text-xs font-bold text-slate-700 uppercase tracking-wider",
} as const;
