import type { Metadata } from "next"
import RepositoriesClient from "@/components/repositories/RepositoriesClient"

export const metadata: Metadata = {
  title: "저장소",
  description: "GitHub 저장소를 연동하고 관리하세요",
}

export default function Page() {
  return <RepositoriesClient />
}
