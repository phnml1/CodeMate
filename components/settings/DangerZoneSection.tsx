"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { AlertTriangle } from "lucide-react"
import { surfaceStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

export default function DangerZoneSection() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDisconnectGitHub = async () => {
    if (!confirm("GitHub 연결을 해제하면 서비스 이용이 불가합니다. 계속하시겠습니까?")) return
    setIsDisconnecting(true)
    try {
      const res = await fetch("/api/settings/disconnect-github", { method: "DELETE" })
      if (res.ok) {
        await signOut({ callbackUrl: "/login" })
      }
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch("/api/settings/account", { method: "DELETE" })
      if (res.ok) {
        await signOut({ callbackUrl: "/login" })
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "border-red-200")}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h2 className="text-base font-semibold text-red-600">위험 구역</h2>
      </div>

      <div className="space-y-4">
        {/* GitHub 연결 해제 */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">GitHub 연결 해제</p>
            <p className="text-xs text-slate-500 mt-0.5">
              GitHub 연결을 해제하면 즉시 로그아웃됩니다.
            </p>
          </div>
          <button
            onClick={handleDisconnectGitHub}
            disabled={isDisconnecting}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isDisconnecting ? "처리 중..." : "연결 해제"}
          </button>
        </div>

        {/* 계정 삭제 */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">계정 삭제</p>
            <p className="text-xs text-slate-500 mt-0.5">
              계정과 모든 데이터가 영구적으로 삭제됩니다.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shrink-0"
          >
            계정 삭제
          </button>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={cn(surfaceStyles.panel, surfaceStyles.panelPadding, "w-full max-w-sm shadow-xl")}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-semibold text-slate-900">계정 삭제</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              계정을 삭제하면 모든 저장소 연결, PR, 댓글, 리뷰 데이터가 영구적으로 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "삭제 중..." : "영구 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
