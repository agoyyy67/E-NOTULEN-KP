import { redirect } from "next/navigation";

/**
 * Root page — redirect ke /dashboard
 * Role-based guard ditangani di middleware.ts
 */
export default function RootPage() {
  redirect("/dashboard");
}
