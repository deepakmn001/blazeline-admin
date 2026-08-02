import { ComingSoon } from "@/components/layout/coming-soon";
import { ShieldCheck } from "lucide-react";

export default function Page() {
  return <ComingSoon title="Admin Users" description="Manage team access, roles and permissions." icon={ShieldCheck} />;
}
