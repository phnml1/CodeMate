import Link from "next/link"

export function LoginDataNotice() {
  return (
    <section className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm leading-6 text-slate-700">
      <h3 className="mb-1 font-semibold text-slate-900">GitHub 연결 전 확인</h3>
      <p>로그인 시 프로필·이메일, 저장소 읽기/쓰기 및 웹훅 관리 권한을 요청합니다.</p>
      <p className="mt-1">
        AI 리뷰가 실행되면 비공개 저장소를 포함한 PR 제목·설명·변경 코드가 Anthropic API로 전송될 수 있습니다.
      </p>
      <Link className="mt-1 inline-block font-medium text-blue-700 underline underline-offset-2" href="/privacy">
        개인정보처리방침 자세히 보기
      </Link>
    </section>
  )
}
