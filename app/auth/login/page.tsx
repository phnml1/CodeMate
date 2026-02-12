import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginCard } from "@/components/auth/LoginCard"
import { BackToHomeButton } from "@/components/auth/LoginFooter"

export default async function LoginPage() {
  const session = await auth();
  // 이미 로그인되어 있으면 대시보드로
  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 via-blue-50 to-slate-100 items-center justify-center p-6 relative overflow-hidden">
      <LoginCard />
      <BackToHomeButton />
    </div>
  )
}
