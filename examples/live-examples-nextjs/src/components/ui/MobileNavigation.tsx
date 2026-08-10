"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { GitHubStarsButton } from "@/components/ui/shadcn-io/github-stars-button";

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { href: "#models", label: "Models" },
    { href: "https://docs.geobase.app/geoai", label: "Docs" },
    { href: "#footer", label: "About" },
    {
      href: "https://decision-labs.com/newsletter/",
      label: "Newsletter",
      external: true,
    },
  ];

  return (
    <div className={`lg:hidden ${className}`}>
      <button
        onClick={toggleMenu}
        className="rounded-md p-2 text-stone-200 transition hover:bg-white/5"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={toggleMenu}
            aria-hidden
          />

          <div className="fixed right-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-l border-stone-800 bg-[#0c0f0d] shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
              <span className="text-sm font-semibold text-stone-100">Menu</span>
              <button
                onClick={toggleMenu}
                className="rounded-md p-2 text-stone-300 transition hover:bg-white/5"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      onClick={!item.external ? toggleMenu : undefined}
                      className="block rounded-md px-3 py-3 text-base font-medium text-stone-200 transition hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                      {item.external ? (
                        <span className="ml-2 text-stone-500" aria-hidden>
                          ↗
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-3 border-t border-stone-800 px-5 py-5">
              <a
                href="https://docs.geobase.app/geoai/"
                className="block w-full rounded-md bg-emerald-700 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-emerald-600"
              >
                Get Started
              </a>
              <div className="flex justify-center">
                <GitHubStarsButton
                  username="decision-labs"
                  repo="geoai.js"
                  formatted
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
