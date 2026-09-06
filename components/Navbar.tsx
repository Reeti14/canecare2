"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-5">

        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="CANECARE Logo"
            className="w-14 h-14"
          />

          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              <span className="text-gray-800">CANE</span>
              <span className="text-[#5EAF2D]">CARE</span>
            </h1>

            <p className="text-gray-500 text-sm">
              Smart Sugarcane Health
            </p>
          </div>
        </div>

        <nav className="hidden md:flex gap-10 font-medium text-gray-700">
          <Link href="#" className="text-[#5EAF2D] border-b-2 border-[#5EAF2D] pb-1">
            Home
          </Link>

          <Link href="#">About</Link>

          <Link href="#">Features</Link>

          <Link href="#">How It Works</Link>

          <Link href="/chat">AI Coach</Link>

          <Link href="#advisory">Advisory</Link>
        </nav>

        <div className="flex gap-4">

          <button className="border-2 border-[#5EAF2D] text-[#5EAF2D] px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition">
            👤 Login
          </button>

          <button className="bg-[#5EAF2D] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#4E9726] transition">
            👤 Sign Up
          </button>

        </div>

      </div>
    </header>
  );
}