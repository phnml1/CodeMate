import PRDetailLayout from "@/components/pulls/detail/PRDetailLayout";
import type { PRFile, PullRequest } from "@/types/pulls";

const DUMMY_PR: PullRequest = {
  id: "1",
  githubId: 45,
  number: 45,
  title: "feat: Implement real-time monitoring",
  description: "",
  status: "OPEN",
  baseBranch: "main",
  headBranch: "feature/monitoring",
  additions: 142,
  deletions: 12,
  changedFiles: 3,
  repoId: "1",
  repo: { id: "1", name: "김개발", fullName: "kimdev/codemate" },
  mergedAt: null,
  closedAt: null,
  createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
};

const DUMMY_FILES: PRFile[] = [
  {
    filename: "src/services/monitor.ts",
    status: "added", additions: 85, deletions: 0, changes: 85,
    patch: `@@ -0,0 +1,5 @@\n+import { EventEmitter } from "events";\n+\n+export class Monitor extends EventEmitter {\n+  // ...\n+}`,
  },
  {
    filename: "src/App.tsx",
    status: "modified", additions: 45, deletions: 8, changes: 53,
    patch: `@@ -10,6 +10,7 @@\n import Sidebar from "./components/Sidebar";\n import Header from "./components/Header";\n import StatsCard from "./components/StatsCard";\n+import { Monitor } from "./services/monitor";\n \n const App: React.FC = () => {\n-  const [data, setData] = useState([]);\n+  const [data, setData] = useState<any[]>([]);`,
  },
  {
    filename: "package.json",
    status: "modified", additions: 12, deletions: 4, changes: 16,
    patch: `@@ -15,5 +15,6 @@\n   "dependencies": {\n     "react": "^18.2.0",\n-    "lucide-react": "^0.284.0",\n+    "lucide-react": "^0.300.0",\n+    "events": "^3.3.0"\n   }`,
  },
  { filename: "src/utils/logger.ts", status: "removed",  additions: 0, deletions: 22, changes: 22, patch: null },
  { filename: "README.md",           status: "renamed",  additions: 3, deletions: 1,  changes: 4,  patch: null },
];

export default function PRDetailPage() {
  return <PRDetailLayout pr={DUMMY_PR} files={DUMMY_FILES} />;
}
