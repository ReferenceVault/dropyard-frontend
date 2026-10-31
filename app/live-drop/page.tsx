import type { Metadata } from "next";
import { LiveDropContent } from "@/components/home/LiveDropContent";

export const metadata: Metadata = {
  title: "The Next Drop · DropYard",
  description: "A new neighbourhood yard sale, every Saturday.",
};

export default function LiveDropPage() {
  return <LiveDropContent />;
}
