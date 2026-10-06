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
  navigationTarget: {
    prId: string;
    filePath: string;
    lineNumber?: number;
    requestId: number;
  } | null;
  navigationRequestId: number;
}

interface PRDetailActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileFileOpen: (open: boolean) => void;
  toggleDiff: (filename: string) => void;
  navigateToFile: (prId: string, filePath: string, lineNumber?: number) => void;
  finishNavigation: (requestId: number) => void;
  // PR 이동 시 상태 초기화
  reset: (initialFile?: string) => void;
}

export const usePRDetailStore = create<PRDetailState & PRDetailActions>((set) => ({
  selectedFile: undefined,
  sidebarCollapsed: false,
  mobileFileOpen: false,
  collapsedDiffs: {},
  navigationTarget: null,
  navigationRequestId: 0,

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

  navigateToFile: (prId, filePath, lineNumber) =>
    set((state) => {
      const requestId = state.navigationRequestId + 1;
      return {
        selectedFile: filePath,
        mobileFileOpen: false,
        collapsedDiffs: lineNumber == null
          ? state.collapsedDiffs
          : { ...state.collapsedDiffs, [filePath]: false },
        navigationTarget: { prId, filePath, lineNumber, requestId },
        navigationRequestId: requestId,
      };
    }),

  finishNavigation: (requestId) =>
    set((state) =>
      state.navigationTarget?.requestId === requestId
        ? { navigationTarget: null }
        : state
    ),

  reset: (initialFile) =>
    set({
      selectedFile: initialFile,
      mobileFileOpen: false,
      collapsedDiffs: {},
      navigationTarget: null,
    }),
}));
