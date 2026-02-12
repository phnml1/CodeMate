'use client'
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import GitHubIcon from "./GitHubIcon"
import { signIn } from "next-auth/react"

export function GitHubLoginButton() {
  return (
    <Button onClick={() => signIn("github", { callbackUrl: "/dashboard" })} className="w-full h-14 bg-linear-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 hover:scale-[1.02] group">
      <GitHubIcon />
      GitHub로 시작하기
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </Button>
  )
}
