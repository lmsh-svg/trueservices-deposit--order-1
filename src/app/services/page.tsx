"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ExternalLink, ShoppingCart, UtensilsCrossed, Sparkles, ArrowRight, Shield, Zap, Award } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";

interface Service {
  id: number;
  name: string;
  category: string;
  description: string | null;
  isAvailable: boolean;
  discountPercentage: number;
  priceLimit: number | null;
  imageUrl: string | null;
  orderLink: string | null;
  browseLink: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, isPending } = useSession();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/services?limit=100");
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const foodDeliveryServices = groupedServices["food_delivery"] || [];
  const otherServices = services.filter(s => s.category !== "food_delivery");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <Navigation />

      {/* Header */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">Our Services</h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          Browse our collection of premium services with exclusive discounts
        </p>
      </section>

      {/* Services Content */}
      <section className="container mx-auto px-4 pb-12 md:pb-20">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-40 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {/* Featured Food Services Section */}
            {foodDeliveryServices.length > 0 && (
              <div className="space-y-6">
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="relative pb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
                      <div className="p-3 bg-primary/20 rounded-xl">
                        <UtensilsCrossed className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                          Food Services
                        </CardTitle>
                        <CardDescription className="text-sm md:text-base mt-1">
                          Exclusive discounts on your favorite food delivery platforms
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary text-primary-foreground px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold animate-pulse">
                        <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        Up to 50% OFF
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {foodDeliveryServices.slice(0, 4).map((service) => (
                        <div key={service.id} className="flex items-center gap-2 p-3 bg-card/50 rounded-lg border border-border/50">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-sm font-medium">{service.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs">45%</Badge>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>{foodDeliveryServices.length} services available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span>Fast processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span>Best prices guaranteed</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="relative bg-muted/30 backdrop-blur">
                    <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
                      <Link href="/food-services">
                        <ShoppingCart className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        <span className="text-sm md:text-base">Explore Food Services</span>
                        <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* Other Services */}
            {otherServices.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-bold">Other Services</h2>
                  <Badge variant="outline">{otherServices.length} available</Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {otherServices.map((service) => (
                    <Card key={service.id} className={!service.isAvailable ? "opacity-60" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg md:text-xl">{service.name}</CardTitle>
                          <Badge variant={service.isAvailable ? "default" : "secondary"} className="text-xs">
                            {service.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {service.imageUrl && (
                          <div className="relative h-40 w-full rounded-md overflow-hidden bg-muted">
                            <Image
                              src={service.imageUrl}
                              alt={service.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-base md:text-lg font-bold">
                            {service.discountPercentage}% OFF
                          </Badge>
                          {service.priceLimit && (
                            <span className="text-xs md:text-sm text-muted-foreground">
                              Up to ${service.priceLimit}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                          asChild
                          className="flex-1 w-full sm:w-auto text-sm"
                          disabled={!service.isAvailable}
                        >
                          <Link href={service.orderLink || "#"}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Order Now
                          </Link>
                        </Button>
                        {service.browseLink && (
                          <Button variant="outline" asChild className="w-full sm:w-auto">
                            <a href={service.browseLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {services.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Services</AlertTitle>
                <AlertDescription>
                  No services available at the moment.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-12 md:mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrueServices. All rights reserved.</p>
          <p className="mt-2">Built on Trust. Powered by Experience.</p>
        </div>
      </footer>
    </div>
  );
}