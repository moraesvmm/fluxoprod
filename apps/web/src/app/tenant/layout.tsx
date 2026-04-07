import { TenantLayout } from "@/components/layout/TenantLayout";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return <TenantLayout>{children}</TenantLayout>;
}
