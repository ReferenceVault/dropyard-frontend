"use client";

import { useRouter } from "next/navigation";
import HowItWorksLanding from "@/components/HowItWorksLanding";

export default function HowItWorksRoute() {
  const router = useRouter();
  const goBuyer  = () => router.push("/for-buyers");
  // BUG-074 — generic seller CTA defaults to signin (was forcing signup).
  // as=seller survives /join, which sends every signed-in user to /buyer —
  // without it this seller CTA opened the buyer dashboard.
  const goSeller = () => router.push("/join?mode=signin&as=seller");

  return <HowItWorksLanding {...({ onBuyerCta: goBuyer, onSellerCta: goSeller } as any)} />;
}
