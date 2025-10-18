"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ShoppingCart, DollarSign } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";

interface Product {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
    if (session?.user?.id) {
      fetchBalance();
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
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products?limit=100");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const electronicsProducts = groupedProducts["electronics"] || [];
  const accessoriesProducts = groupedProducts["accessories"] || [];
  const giftCardsProducts = groupedProducts["gift_cards"] || [];

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
            <Link href="/products" className="text-sm font-medium text-primary transition-colors">
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
                    {balance.toFixed(2)} credits
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

      {/* Header */}
      <section className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Products</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Browse our collection of premium products with exclusive discounts
        </p>
        <Input
          type="search"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </section>

      {/* Products Content */}
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
          <Tabs defaultValue="gift_cards" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="gift_cards">Gift Cards</TabsTrigger>
              <TabsTrigger value="electronics">Electronics</TabsTrigger>
              <TabsTrigger value="accessories">Accessories</TabsTrigger>
              <TabsTrigger value="all">All Products</TabsTrigger>
            </TabsList>

            <TabsContent value="gift_cards" className="space-y-6">
              {giftCardsProducts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Products</AlertTitle>
                  <AlertDescription>
                    No gift cards available at the moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {giftCardsProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="electronics" className="space-y-6">
              {electronicsProducts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Products</AlertTitle>
                  <AlertDescription>
                    No electronics products available at the moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {electronicsProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="accessories" className="space-y-6">
              {accessoriesProducts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Products</AlertTitle>
                  <AlertDescription>
                    No accessories products available at the moment.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {accessoriesProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              {filteredProducts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Products</AlertTitle>
                  <AlertDescription>
                    No products match your search criteria.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
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

function ProductCard({ product }: { product: Product }) {
  // Calculate discount from product name or fetch from profit margins API
  const isSpeedway = product.name.toLowerCase().includes("speedway");
  const discountPercentage = isSpeedway ? 30 : 0;
  
  return (
    <Card className={`${!product.isAvailable ? "opacity-60" : ""} border-border/40 bg-card/50 backdrop-blur hover:shadow-lg hover:shadow-primary/5 transition-all`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{product.name}</CardTitle>
          <Badge variant={product.isAvailable ? "default" : "secondary"} className="bg-primary/20 text-primary hover:bg-primary/30">
            {product.isAvailable ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
        {discountPercentage > 0 && (
          <Badge className="w-fit bg-primary text-primary-foreground">
            {discountPercentage}% OFF - You Save Big!
          </Badge>
        )}
        <CardDescription className="text-muted-foreground line-clamp-2">{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {product.imageUrl && (
          <div className="relative h-40 w-full rounded-md overflow-hidden bg-muted/30">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          {discountPercentage > 0 ? (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground line-through">${product.price.toFixed(2)}</span>
              <span className="text-2xl font-bold text-primary">${(product.price * (1 - discountPercentage / 100)).toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</span>
          )}
          <span className="text-sm text-muted-foreground">
            Stock: {product.stockQuantity}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          asChild
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!product.isAvailable}
        >
          <Link href={`/products/${product.id}`}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}