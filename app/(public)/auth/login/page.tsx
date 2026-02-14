import { LoginCard } from "@/components/auth/LoginCard"
import { BackToHomeButton } from "@/components/auth/LoginFooter"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-50 via-blue-50 to-slate-100 items-center justify-center p-6 relative overflow-hidden">
      <LoginCard />
      <BackToHomeButton />
    </div>
  )
}
