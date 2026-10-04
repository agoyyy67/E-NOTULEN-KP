import { redirect } from "next/navigation";

export default function DirectLoginPage() {
  redirect("/auth/login");
}
