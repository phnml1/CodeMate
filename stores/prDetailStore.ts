import { create } from "zustand";

interface PRDetailState {
  // 현재 선택된 파일 (하이라이트 + 스크롤 연동)
  selectedFile: string | undefined;
  // 데스크탑 사이드바 접힘 여부
  sidebarCollapsed: boolean;
  // 모바일 파일 드롭다운 열림 여부
  mobileFileOpen: boolean;
  // 파일별 diff 접힘 상태 (filename → collapsed)
  collapsedDiffs: Record<string, boolean>;
}

interface PRDetailActions {
  selectFile: (filename: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileFileOpen: (open: boolean) => void;
  toggleDiff: (filename: string) => void;
  expandDiff: (filename: string) => void;
  // PR 이동 시 상태 초기화
  reset: (initialFile?: string) => void;
}

export const usePRDetailStore = create<PRDetailState & PRDetailActions>((set) => ({
  selectedFile: undefined,
  sidebarCollapsed: false,
  mobileFileOpen: false,
  collapsedDiffs: {},

  selectFile: (filename) =>
    set({ selectedFile: filename, mobileFileOpen: false }),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setMobileFileOpen: (open) =>
    set({ mobileFileOpen: open }),

  toggleDiff: (filename) =>
    set((state) => ({
      collapsedDiffs: {
        ...state.collapsedDiffs,
        [filename]: !state.collapsedDiffs[filename],
      },
    })),

  expandDiff: (filename) =>
    set((state) => ({
      collapsedDiffs: {
        ...state.collapsedDiffs,
        [filename]: false,
      },
    })),

  reset: (initialFile) =>
    set({
      selectedFile: initialFile,
      mobileFileOpen: false,
      collapsedDiffs: {},
    }),
}));
