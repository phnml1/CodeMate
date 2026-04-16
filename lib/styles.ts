/**
 * Shared text style tokens.
 * Keeping repeated Tailwind class groups here makes page-level UI consistent.
 */
export const textStyles = {
  /** Top-level page title. */
  pageTitle: "text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50",

  /** Short descriptive text under a page title. */
  pageSubtitle: "mt-1 text-sm font-medium text-slate-500 dark:text-slate-400",

  /** Card and section title text. */
  sectionTitle: "text-base font-bold text-slate-900 dark:text-slate-50 sm:text-lg",

  /** Table header text. */
  tableHeader:
    "text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300",
} as const;

/**
 * Protected page layout tokens.
 * - page: default list/workflow pages
 * - narrowPage: settings and notification pages
 * - widePage: dashboard and analytics pages
 */
export const layoutStyles = {
  page:
    "mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
  narrowPage:
    "mx-auto flex w-full max-w-3xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
  widePage:
    "mx-auto flex w-full max-w-7xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
  sectionStack: "flex flex-col gap-4 sm:gap-6",
  listStack: "flex flex-col gap-4",
  gridGap: "gap-4 sm:gap-6",
  detailFrame:
    "mt-2 flex h-[calc(100svh-6.5rem)] min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 md:h-[calc(100svh-8.5rem)] lg:h-[calc(100svh-9.5rem)]",
} as const;

/** Reusable surface and card styles. */
export const surfaceStyles = {
  panel:
    "rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
  panelPadding: "p-4 sm:p-6 md:p-8",
  card:
    "rounded-md border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 sm:p-5",
  interactiveCard:
    "rounded-md border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 sm:p-5",
  toolbar:
    "rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950",
  emptyState:
    "py-16 text-center text-sm font-medium text-slate-400 dark:text-slate-500 sm:py-20",
} as const;

/** Shared controls and action styles. */
export const controlStyles = {
  filterButton:
    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
  iconButton:
    "inline-flex size-9 items-center justify-center rounded-md border border-transparent transition-colors",
  primaryAction:
    "rounded-md bg-blue-700 font-bold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800",
  secondaryAction:
    "rounded-md border border-slate-200 bg-white font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900",
} as const;
