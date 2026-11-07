import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "CodeMate 개인정보 수집, 이용, 보관 및 삭제 정책",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보처리방침"
      effectiveDate="2026년 11월 7일"
      sections={[
        {
          title: "1. 처리하는 정보",
          paragraphs: [
            "CodeMate는 GitHub 로그인을 통해 서비스를 제공하며, 기능 수행에 필요한 범위에서 다음 정보를 처리합니다.",
          ],
          items: [
            "GitHub 사용자 식별자, 이름, 이메일, 프로필 이미지와 OAuth 권한 범위",
            "사용자가 연결한 저장소, Pull Request, 파일 변경 내역, 리뷰와 댓글 정보",
            "협업방의 메시지, 참여·퇴장 상태, 오류 및 보안 이벤트 로그",
            "GitHub API 호출에 필요한 OAuth 토큰. 토큰은 애플리케이션 수준에서 암호화하여 저장합니다.",
          ],
        },
        {
          title: "2. 이용 목적",
          items: [
            "GitHub 저장소 및 Pull Request 연결과 접근 권한 확인",
            "Pull Request diff 조회, AI 코드 분석, 리뷰 작성과 GitHub 게시",
            "실시간 협업방, 채팅, 알림과 음성 연결 제공",
            "오류 대응, 보안 감사, 요청 제한 및 서비스 안정성 개선",
          ],
        },
        {
          title: "3. 외부 서비스 제공",
          paragraphs: [
            "AI 리뷰를 요청하면 Pull Request 제목·설명과 코드 변경 내용이 분석을 위해 Anthropic API로 전송될 수 있습니다. 비공개 저장소의 코드 변경 내용도 포함될 수 있으므로, 조직 정책상 외부 AI 전송이 허용된 저장소만 연결해야 합니다.",
            "서비스 운영에는 GitHub, Anthropic, Vercel, Railway 및 데이터베이스·Redis 인프라 제공자가 사용됩니다. 각 제공자는 기능 제공에 필요한 범위에서 데이터를 처리할 수 있습니다.",
          ],
        },
        {
          title: "4. 보관 및 삭제",
          items: [
            "GitHub 연결을 해제하면 저장된 GitHub 토큰과 연결 계정 정보가 삭제됩니다.",
            "계정을 삭제하면 계정과 직접 연결된 세션 및 사용자 데이터가 삭제됩니다. 법적 의무나 보안 사고 대응에 필요한 최소 기록은 필요한 기간 동안 별도로 보관될 수 있습니다.",
            "GitHub에 이미 게시한 리뷰와 댓글은 GitHub에 남을 수 있으며, GitHub에서 별도로 삭제해야 합니다.",
          ],
        },
        {
          title: "5. 이용자의 선택과 주의사항",
          items: [
            "설정에서 GitHub 연결을 해제하거나 계정을 삭제할 수 있습니다.",
            "저장소 관리자에게 허용받지 않은 코드나 개인정보를 AI 분석에 제출해서는 안 됩니다.",
            "마이크 음성은 WebRTC로 참여자 사이에 전달되며 CodeMate가 녹음하거나 저장하지 않습니다.",
          ],
        },
        {
          title: "6. 문의",
          paragraphs: [
            "개인정보 처리와 삭제 요청은 CodeMate GitHub 저장소의 공개 이슈를 통해 문의할 수 있습니다. 민감한 정보나 토큰은 이슈에 작성하지 마세요: https://github.com/phnml1/CodeMate/issues",
          ],
        },
      ]}
    />
  )
}
