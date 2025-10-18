"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, Award, DollarSign } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
          <div className="flex items-center gap-6">
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
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices"
              width={150}
              height={150}
              className="mx-auto object-contain"
              unoptimized
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            True Services
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-primary">
            Easy, Reliable, 100% True
          </p>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Experience What We Trust
          </p>
          <div className="pt-6">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/services">
                See TRUE in Action <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-6 text-center space-y-4 hover:shadow-lg hover:shadow-primary/5 transition-all border-border/40 bg-card/50 backdrop-blur">
            <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Uninterrupted</h3>
            <p className="text-muted-foreground">
              Seamless service delivery with zero downtime. Your satisfaction is our priority.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover:shadow-lg hover:shadow-primary/5 transition-all border-border/40 bg-card/50 backdrop-blur">
            <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Undetected</h3>
            <p className="text-muted-foreground">
              Secure and private transactions. Your trust matters to us.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover:shadow-lg hover:shadow-primary/5 transition-all border-border/40 bg-card/50 backdrop-blur">
            <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Unmatched</h3>
            <p className="text-muted-foreground">
              Quality services that stand above the rest. Truly worth it.
            </p>
          </Card>
        </div>
      </section>

      {/* Motto Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto bg-primary/10 rounded-lg p-12 border border-primary/20 backdrop-blur">
          <blockquote className="text-2xl md:text-3xl font-semibold italic text-primary">
            "If we wouldn't use it, we wouldn't sell it."
          </blockquote>
          <p className="mt-4 text-muted-foreground">Our commitment to quality</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground">
            Browse our services and products to experience TRUE quality.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/food-services">Browse Food Services</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/40 hover:bg-primary/10">
              <Link href="/products">View Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 backdrop-blur mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrueServices. All rights reserved.</p>
          <p className="mt-2">Built on Trust. Powered by Experience.</p>
        </div>
      </footer>
    </div>
  );
}