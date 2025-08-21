"use client";

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { href: "#dinov3", label: "What's New" },
    { href: "#features", label: "AI Models" },
    { href: "https://docs.geobase.app/geoai", label: "Docs" },
    { href: "#footer", label: "About" },
    { 
      href: "https://mailchi.mp/ece911e44b4e/new-geoaijs-models", 
      label: "Newsletter",
      external: true 
    },
  ];

  return (
    <div className={`lg:hidden ${className}`}>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Menu className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={toggleMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-900 border-l border-gray-600 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl">
            <div className="flex flex-col h-full bg-gray-900">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-600 bg-gray-900">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-6 bg-gray-900">
                <ul className="space-y-4">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={!item.external ? toggleMenu : undefined}
                        className="block px-4 py-3 rounded-lg text-white hover:bg-gray-700 transition-colors font-medium"
                      >
                        {item.label}
                        {item.external && (
                          <span className="ml-2 text-gray-400">↗</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Action Buttons */}
              <div className="p-6 border-t border-gray-600 space-y-3 bg-gray-900">
                <a
                  href="https://docs.geobase.app/geoai/"
                  className="block w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-center transition-colors"
                >
                  Get Started
                </a>
                <a
                  href="https://github.com/geobase-app/geoai.js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg text-center transition-colors"
                >
                  Star on GitHub
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
