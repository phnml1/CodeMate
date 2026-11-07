import type { Metadata } from "next"
import { LegalPage } from "@/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "서비스 이용약관",
  description: "CodeMate 서비스 이용 조건과 사용자 책임",
}

export default function TermsPage() {
  return (
    <LegalPage
      title="서비스 이용약관"
      effectiveDate="2026년 11월 7일"
      sections={[
        {
          title: "1. 약관의 적용",
          paragraphs: [
            "이 약관은 CodeMate의 GitHub 연동 코드 리뷰 및 실시간 협업 기능 이용에 적용됩니다. GitHub로 로그인하거나 서비스를 사용하면 이 약관과 개인정보처리방침에 동의한 것으로 봅니다.",
          ],
        },
        {
          title: "2. 서비스의 성격",
          items: [
            "CodeMate는 Pull Request diff 조회, AI 분석, 리뷰 작성·게시, 협업방과 음성 연결 기능을 제공합니다.",
            "AI 분석 결과는 참고 자료이며 정확성·완전성·보안성을 보장하지 않습니다. 코드 병합과 배포 판단은 사용자가 직접 검토해야 합니다.",
            "시험 운영 중 기능, 한도 및 제공 방식이 변경되거나 일시 중단될 수 있습니다.",
          ],
        },
        {
          title: "3. 계정과 저장소 권한",
          items: [
            "사용자는 자신이 접근하고 처리할 권한이 있는 GitHub 계정과 저장소만 연결해야 합니다.",
            "조직 또는 저장소 정책이 외부 AI 분석을 금지하는 경우 해당 저장소에서 AI 분석을 사용하면 안 됩니다.",
            "계정과 OAuth 권한을 안전하게 관리하고, 의심스러운 접근이 있으면 GitHub 연결을 해제해야 합니다.",
          ],
        },
        {
          title: "4. 금지되는 이용",
          items: [
            "타인의 저장소·계정에 대한 무단 접근 또는 권한 우회",
            "요청 제한 회피, 자동화된 과도한 호출, 서비스 또는 외부 API에 부하를 주는 행위",
            "악성 코드, 개인정보, 비밀키 또는 공개 권한이 없는 자료의 전송",
            "관련 법령, GitHub 정책 또는 제3자의 권리를 침해하는 이용",
          ],
        },
        {
          title: "5. GitHub 게시와 외부 서비스",
          paragraphs: [
            "사용자가 게시를 실행하면 리뷰와 댓글이 연결된 GitHub Pull Request에 기록됩니다. 게시 전에 대상 저장소와 내용을 확인해야 하며, GitHub에 게시된 내용의 수정·삭제는 GitHub의 권한과 정책을 따릅니다.",
          ],
        },
        {
          title: "6. 책임 제한",
          paragraphs: [
            "법이 허용하는 범위에서 CodeMate는 AI 결과의 오류, 외부 서비스 장애, 데이터 손실 또는 서비스 이용으로 발생한 간접 손해를 보장하지 않습니다. 서비스 장애가 발생하면 가능한 범위에서 복구와 원인 확인을 진행합니다.",
          ],
        },
        {
          title: "7. 문의와 약관 변경",
          paragraphs: [
            "서비스 또는 약관 문의는 https://github.com/phnml1/CodeMate/issues 에서 접수합니다. 민감한 정보나 토큰은 공개 이슈에 작성하지 마세요. 중요한 약관 변경이 있을 때에는 서비스 화면 또는 저장소를 통해 시행일 전에 알립니다.",
          ],
        },
      ]}
    />
  )
}
