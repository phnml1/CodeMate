import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { LoginHeader } from "@/components/auth/LoginHeader"
import { LoginWelcome } from "@/components/auth/LoginWelcome"
import { GitHubLoginButton } from "@/components/auth/GitHubLoginButton"
import { FeatureGrid } from "@/components/auth/FeatureGrid"
import { LoginFooter } from "@/components/auth/LoginFooter"

export function LoginCard() {
  return (
    <Card className="p-12 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 hover:shadow-blue-500/20 transition-shadow duration-500">
      <CardHeader className="flex flex-col items-center mb-8">
        <LoginHeader />
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginWelcome />
        <GitHubLoginButton />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-4 text-slate-500 font-medium">
              무료로 시작하세요
            </span>
          </div>
        </div>
        <FeatureGrid />
        <LoginFooter />
      </CardContent>
    </Card>
  )
}
