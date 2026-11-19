import Link from "next/link"

type LegalSection = {
  title: string
  paragraphs?: string[]
  items?: string[]
  email?: string
}

export function LegalPage({
  title,
  effectiveDate,
  sections,
}: {
  title: string
  effectiveDate: string
  sections: LegalSection[]
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="mb-10 border-b border-slate-200 pb-6 dark:border-slate-800">
          <Link className="text-sm font-medium text-blue-600 hover:underline" href="/">
            ← CodeMate로 돌아가기
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            시행일: {effectiveDate}
          </p>
        </div>

        <div className="space-y-9">
          {sections.map((section) => (
            <section className="space-y-3" key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p className="leading-7 text-slate-600 dark:text-slate-300" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              {section.email ? (
                <a className="inline-block text-blue-600 underline-offset-2 hover:underline focus-visible:underline" href={`mailto:${section.email}`}>
                  {section.email}
                </a>
              ) : null}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5 leading-7 text-slate-600 dark:text-slate-300">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
