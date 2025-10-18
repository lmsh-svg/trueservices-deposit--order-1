"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, Award } from "lucide-react";
import { Navigation } from "@/components/navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
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
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight">
            True Services
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-primary">
            Easy, Reliable, 100% True
          </p>
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground">
            Experience What We Trust
          </p>
          <div className="pt-6">
            <Button asChild size="lg" className="text-base md:text-lg px-6 md:px-8 py-5 md:py-6 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/services">
                See TRUE in Action <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          <Card className="p-6 text-center space-y-4 hover:shadow-lg hover:shadow-primary/5 transition-all border-border/40 bg-card/50 backdrop-blur">
            <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Uninterrupted</h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Seamless service delivery with zero downtime. Your satisfaction is our priority.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover:shadow-lg hover:shadow-primary/5 transition-all border-border/40 bg-card/50 backdrop-blur">
            <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Undetected</h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Secure and private transactions. Your trust matters to us.
            </p>
          </Card>

          <Card className="p-6 text-center space-y-4 hover:shadow-lg hover:shadow-primary/5 transition-all border-border/40 bg-card/50 backdrop-blur sm:col-span-2 md:col-span-1">
            <div className="w-12 h-12 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Unmatched</h3>
            <p className="text-muted-foreground text-sm md:text-base">
              Quality services that stand above the rest. Truly worth it.
            </p>
          </Card>
        </div>
      </section>

      {/* Motto Section */}
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <div className="max-w-3xl mx-auto bg-primary/10 rounded-lg p-8 md:p-12 border border-primary/20 backdrop-blur">
          <blockquote className="text-xl md:text-2xl lg:text-3xl font-semibold italic text-primary">
            "If we wouldn't use it, we wouldn't sell it."
          </blockquote>
          <p className="mt-4 text-muted-foreground">Our commitment to quality</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Browse our services and products to experience TRUE quality.
          </p>
          <div className="flex flex-col gap-4 items-center">
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
              <Button asChild size="lg" variant="outline" className="border-border hover:bg-muted w-full sm:w-auto">
                <Link href="/services">View Services</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border hover:bg-muted w-full sm:w-auto">
                <Link href="/products">View Products</Link>
              </Button>
            </div>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
              <Link href="/food-services">
                Browse Food Services <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 backdrop-blur mt-12 md:mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrueServices. All rights reserved.</p>
          <p className="mt-2">Built on Trust. Powered by Experience.</p>
        </div>
      </footer>
    </div>
  );
}