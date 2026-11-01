"use client";

import { useEffect, useRef } from "react";

/**
 * Fades the wrapper's sections in the first time each one scrolls into view.
 *
 * The server HTML carries none of this: sections are only hidden from here, on
 * the client, and only those still below the fold. So content is never
 * invisible without JavaScript, and nothing on screen flashes out at load. The
 * hidden state is opacity alone, leaving layout and scroll targets untouched.
 */
export function useSectionReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const below = [...wrapper.querySelectorAll<HTMLElement>(":scope > section")]
      .filter((section) => section.getBoundingClientRect().top >= window.innerHeight);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const section = entry.target as HTMLElement;
        observer.unobserve(section);
        section.classList.remove("dy-reveal-pending");
        section.classList.add("dy-reveal-in");
        section.addEventListener("animationend", () => section.classList.remove("dy-reveal-in"), { once: true });
      }
    }, { rootMargin: "0px 0px -8% 0px" });

    for (const section of below) {
      section.classList.add("dy-reveal-pending");
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
      for (const section of below) section.classList.remove("dy-reveal-pending", "dy-reveal-in");
    };
  }, []);

  return ref;
}
