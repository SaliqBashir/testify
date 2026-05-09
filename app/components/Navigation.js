"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaSearch, FaExchangeAlt, FaChartLine } from "react-icons/fa";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Sourcing", icon: <FaSearch className="h-4 w-4" /> },
    { href: "/alternatives", label: "Alternatives", icon: <FaExchangeAlt className="h-4 w-4" /> },
    { href: "/predictor", label: "Predictor", icon: <FaChartLine className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 pb-2 flex justify-center w-full pointer-events-none">
      <nav className="pointer-events-auto bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-full px-6 py-3 flex items-center justify-between w-full max-w-6xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center gap-3 group">
          <div className="p-1 flex items-center justify-center h-10 w-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <img src="/favicon.ico" alt="Import.me Logo" className="object-contain h-full w-full" />
          </div>
          <Link href="/">
            <h1 className="text-xl font-poppins font-bold text-[#0a2540] tracking-tight cursor-pointer transition-colors group-hover:text-indigo-600">
              Import<span className="text-indigo-600 font-medium group-hover:text-[#0a2540] transition-colors">.me</span>
            </h1>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ease-out ${
                    isActive
                      ? "bg-slate-100 text-[#0a2540] shadow-sm ring-1 ring-slate-200/50"
                      : "text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-slate-100"
                  }`}
                >
                  <span className={`transition-transform duration-300 ${isActive ? 'scale-110 text-indigo-600' : 'group-hover:scale-110'}`}>
                    {link.icon}
                  </span>
                  {link.label}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
