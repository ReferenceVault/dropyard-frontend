"use client";

import Image from "next/image";
import Link from "next/link";
import { SELL_HREF } from "./GlobalHeader";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/buyer", label: "Browse" },
      { href: "/#the-drop", label: "The Drop" },
      { href: "/how-it-works", label: "How it Works" },
      { href: "/for-buyers", label: "For Buyers" },
      { href: "/for-sellers", label: "For Sellers" },
    ],
  },
  {
    title: "For Sellers",
    links: [
      { href: SELL_HREF, label: "Weekly Drop" },
      { href: SELL_HREF, label: "The Shelf" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact us" },
      { href: "/community-guidelines", label: "Community Guidelines" },
    ],
  },
  {
    title: "Join Free",
    links: [
      { href: "/join?mode=signup", label: "Sign up" },
      { href: "/join?mode=signin", label: "Log in" },
      { href: "/help-center", label: "Help center" },
    ],
  },
];

const LEGAL_LINKS = [
  { href: "/terms-of-service", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/faq", label: "FAQs" },
];

const linkClass = "dy-focus rounded transition-colors hover:text-dy-forest";

export function GlobalFooter() {
  return (
    <footer className="bg-white font-dy text-[clamp(15px,1.15vw,22px)] text-dy-muted">
      <div className="dy-wrap pb-8 pt-[clamp(48px,6vw,115px)]">
        <div className="grid gap-x-[clamp(32px,5.2vw,100px)] gap-y-10 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,auto)]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="dy-focus block w-[clamp(200px,19.5vw,376px)] rounded">
              <Image src="/logo-wordmark.png" alt="DropYard home" width={1520} height={376} className="h-auto w-full" />
              {/* Lines up with the wordmark, which starts 35% across the artwork. */}
              <span className="mt-1 block whitespace-nowrap pl-[35%] text-[clamp(11px,1vw,20px)] italic text-black">From one home to another</span>
            </Link>
            <p className="mt-4">A more sustainable neighbourhood.</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="font-semibold text-dy-forest">{col.title}</h2>
              <ul className="mt-5 space-y-[clamp(10px,1.1vw,22px)]">
                {col.links.map((l) => (
                  <li key={l.label}><Link href={l.href} className={linkClass}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-[clamp(36px,3vw,58px)] flex flex-col gap-4 border-t border-dy-line pt-7 md:flex-row md:items-center md:justify-between">
          <p>© 2026 DropYard. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-[clamp(20px,4vw,80px)] gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* BUG-070 — Required CC BY 4.0 attribution for the Geonames postal
            code dataset used to compute neighbor distance. */}
        <p className="mt-5 text-[12px]">
          Postal code data: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="dy-focus underline hover:text-dy-forest">Geonames</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="dy-focus underline hover:text-dy-forest">CC BY 4.0</a>.
        </p>
      </div>
    </footer>
  );
}
