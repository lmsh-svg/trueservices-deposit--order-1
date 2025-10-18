"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X, DollarSign } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useEffect } from "react";

export function Navigation() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBalance();
    } else {
      setLoadingBalance(false);
    }
  }, [session]);

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/users?id=${session?.user?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  return (
    <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices Logo"
              width={50}
              height={50}
              className="object-contain"
              unoptimized
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              True<span className="text-primary">Services</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/services" className="text-sm font-medium hover:text-primary transition-colors">
              Services
            </Link>
            <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Products
            </Link>
            {session?.user ? (
              <>
                <Link href="/account" className="text-sm font-medium hover:text-primary transition-colors">
                  Account
                </Link>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href="/deposit">
                    <DollarSign className="h-4 w-4" />
                    {loadingBalance ? "..." : `${balance.toFixed(2)} credits`}
                  </Link>
                </Button>
                {session.user.role === "admin" && (
                  <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-border/40 pt-4">
            <Link
              href="/services"
              className="block text-sm font-medium hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Services
            </Link>
            <Link
              href="/products"
              className="block text-sm font-medium hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Products
            </Link>
            {session?.user ? (
              <>
                <Link
                  href="/account"
                  className="block text-sm font-medium hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="/deposit"
                  className="block text-sm font-medium hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {loadingBalance ? "..." : `${balance.toFixed(2)} credits`}
                  </div>
                </Link>
                {session.user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="block text-sm font-medium hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="block text-sm font-medium hover:text-primary transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Button asChild size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}