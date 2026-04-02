export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col gap-4 items-center md:items-start">
          <div className="text-lg font-bold text-slate-900 dark:text-white font-headline">CodeMate</div>
          <p className="font-body text-sm text-slate-500 dark:text-slate-400">
            © 2026 CodeMate. 무료로 시작하세요. 신용카드가 필요 없습니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <a
            className="font-body text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all hover:underline"
            href="#features"
          >
            기능
          </a>
          <a
            className="font-body text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all hover:underline"
            href="#how-it-works"
          >
            사용 방법
          </a>
          <a
            className="font-body text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all hover:underline"
            href="#"
          >
            개인정보 처리방침
          </a>
          <a
            className="font-body text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all hover:underline"
            href="#"
          >
            이용약관
          </a>
        </div>
      </div>
    </footer>
  )
}
