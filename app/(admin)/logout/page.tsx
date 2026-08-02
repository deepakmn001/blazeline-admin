"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/services/auth.service";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    logoutAdmin();
    router.push("/login");
  }, [router]);

  return null;
}