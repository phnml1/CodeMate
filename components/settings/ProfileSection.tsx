import Image from "next/image"
import { User } from "lucide-react"
import { surfaceStyles, textStyles } from "@/lib/styles"
import { cn } from "@/lib/utils"

interface ProfileSectionProps {
  name: string | null
  email: string | null
  image: string | null
}

export default function ProfileSection({ name, email, image }: ProfileSectionProps) {
  return (
    <section className={cn(surfaceStyles.panel, surfaceStyles.panelPadding)}>
      <h2 className={cn(textStyles.sectionTitle, "mb-4")}>프로필</h2>
      <div className="flex items-center gap-4">
        {image ? (
          <Image
            src={image}
            alt={name ?? "사용자"}
            width={64}
            height={64}
            className="rounded-full ring-2 ring-slate-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800">{name ?? "이름 없음"}</p>
          <p className="text-sm text-slate-500">{email ?? "이메일 없음"}</p>
          <p className="text-xs text-slate-400">GitHub에서 가져온 정보입니다. 직접 수정이 불가합니다.</p>
        </div>
      </div>
    </section>
  )
}
