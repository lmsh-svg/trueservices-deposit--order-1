"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ExternalLink, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";

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

  const categories = Object.keys(groupedServices);
  const foodDeliveryServices = groupedServices["food_delivery"] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            True<span className="text-primary">Services</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/services" className="text-sm font-medium text-primary transition-colors">
              Services
            </Link>
            <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Products
            </Link>
            <Link href="/deposit" className="text-sm font-medium hover:text-primary transition-colors">
              Deposit
            </Link>
            <Link href="/account" className="text-sm font-medium hover:text-primary transition-colors">
              Account
            </Link>
            <Button asChild size="sm">
              <Link href="/admin">Admin</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
        <p className="text-xl text-muted-foreground">
          Browse our collection of premium services with exclusive discounts
        </p>
      </section>

      {/* Services Content */}
      <section className="container mx-auto px-4 pb-20">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <Tabs defaultValue="food_delivery" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="food_delivery">Food Delivery</TabsTrigger>
              <TabsTrigger value="all">All Services</TabsTrigger>
            </TabsList>

            <TabsContent value="food_delivery" className="space-y-6">
              {foodDeliveryServices.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Services</AlertTitle>
                  <AlertDescription>
                    No food delivery services available at the moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {foodDeliveryServices.map((service) => (
                    <Card key={service.id} className={!service.isAvailable ? "opacity-60" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-xl">{service.name}</CardTitle>
                          <Badge variant={service.isAvailable ? "default" : "secondary"}>
                            {service.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        <CardDescription>{service.description}</CardDescription>
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
                          <Badge variant="outline" className="text-lg font-bold">
                            {service.discountPercentage}% OFF
                          </Badge>
                          {service.priceLimit && (
                            <span className="text-sm text-muted-foreground">
                              Up to ${service.priceLimit}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button
                          asChild
                          className="flex-1"
                          disabled={!service.isAvailable}
                        >
                          <Link href={`/services/food4less?serviceId=${service.id}`}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Order Now
                          </Link>
                        </Button>
                        {service.browseLink && (
                          <Button variant="outline" asChild>
                            <a href={service.browseLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              {services.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Services</AlertTitle>
                  <AlertDescription>
                    No services available at the moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <Card key={service.id} className={!service.isAvailable ? "opacity-60" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-xl">{service.name}</CardTitle>
                          <Badge variant={service.isAvailable ? "default" : "secondary"}>
                            {service.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                        <CardDescription>{service.description}</CardDescription>
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
                          <Badge variant="outline" className="text-lg font-bold">
                            {service.discountPercentage}% OFF
                          </Badge>
                          {service.priceLimit && (
                            <span className="text-sm text-muted-foreground">
                              Up to ${service.priceLimit}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button
                          asChild
                          className="flex-1"
                          disabled={!service.isAvailable}
                        >
                          <Link href={`/services/food4less?serviceId=${service.id}`}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Order Now
                          </Link>
                        </Button>
                        {service.browseLink && (
                          <Button variant="outline" asChild>
                            <a href={service.browseLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrueServices. All rights reserved.</p>
          <p className="mt-2">Built on Trust. Powered by Experience.</p>
        </div>
      </footer>
    </div>
  );
}