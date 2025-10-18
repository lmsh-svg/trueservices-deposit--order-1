"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingCart, AlertCircle, CheckCircle, DollarSign, Tag } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  imageUrl: string | null;
  stockQuantity: number;
}

interface ProductVariant {
  id: number;
  productId: number;
  denomination: number;
  customerPrice: number;
  adminCost: number;
  stockQuantity: number;
}

interface DiscountCode {
  id: number;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  productId: number | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (params.id) {
      fetchProductData();
    }
  }, [params.id]);

  useEffect(() => {
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

  const fetchProductData = async () => {
    try {
      setLoading(true);
      
      // Fetch product details
      const productRes = await fetch(`/api/products?id=${params.id}`);
      if (!productRes.ok) throw new Error("Product not found");
      const productData = await productRes.json();
      setProduct(productData);

      // Fetch product variants
      const variantsRes = await fetch(`/api/product-variants?productId=${params.id}&limit=100`);
      if (variantsRes.ok) {
        const variantsData = await variantsRes.json();
        setVariants(variantsData);
        if (variantsData.length > 0) {
          setSelectedVariant(variantsData[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code");
      return;
    }

    try {
      const response = await fetch(`/api/discount-codes?code=${encodeURIComponent(discountCode.trim())}`);
      if (!response.ok) {
        toast.error("Invalid discount code");
        return;
      }

      const codes = await response.json();
      if (codes.length === 0) {
        toast.error("Invalid discount code");
        return;
      }

      const code = codes[0];
      
      if (!code.isActive) {
        toast.error("This discount code is no longer active");
        return;
      }

      if (code.productId && code.productId !== product?.id) {
        toast.error("This discount code is not valid for this product");
        return;
      }

      if (code.expiresAt) {
        const expiryDate = new Date(code.expiresAt);
        if (expiryDate < new Date()) {
          toast.error("This discount code has expired");
          return;
        }
      }

      setAppliedDiscount(code);
      toast.success(`Discount code applied! ${code.discountPercentage}% off`);
    } catch (error) {
      toast.error("Failed to apply discount code");
    }
  };

  const calculateTotal = () => {
    if (!selectedVariant) return 0;
    
    let total = selectedVariant.customerPrice * quantity;
    
    if (appliedDiscount) {
      total = total * (1 - appliedDiscount.discountPercentage / 100);
    }
    
    return total;
  };

  const handlePurchase = async () => {
    if (!session?.user) {
      toast.error("Please sign in to make a purchase");
      router.push(`/sign-in?redirect=/products/${params.id}`);
      return;
    }

    if (!selectedVariant) {
      toast.error("Please select a card value");
      return;
    }

    const total = calculateTotal();
    
    if (balance < total) {
      toast.error("Insufficient credits. Please add funds to your account.");
      router.push("/deposit");
      return;
    }

    if (quantity > selectedVariant.stockQuantity) {
      toast.error(`Only ${selectedVariant.stockQuantity} units available`);
      return;
    }

    try {
      // Create order
      const token = localStorage.getItem("bearer_token");
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
          orderType: "product",
          totalAmount: total,
          paymentStatus: "confirmed",
          deliveryStatus: "pending",
        }),
      });

      if (!orderResponse.ok) throw new Error("Failed to create order");
      const order = await orderResponse.json();

      // Create order items
      await fetch("/api/order-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          productId: product?.id,
          quantity,
          priceAtPurchase: selectedVariant.customerPrice,
        }),
      });

      // Update user balance
      const newBalance = balance - total;
      await fetch(`/api/users?id=${session.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ balance: newBalance }),
      });

      // Update variant stock
      await fetch(`/api/product-variants?id=${selectedVariant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockQuantity: selectedVariant.stockQuantity - quantity,
        }),
      });

      toast.success("Purchase successful! Check your account for order details.");
      router.push("/account");
    } catch (error) {
      toast.error("Purchase failed. Please try again.");
      console.error("Purchase error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Product not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

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

      {/* Product Details */}
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Image & Info */}
          <div className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-3xl">{product.name}</CardTitle>
                  <Badge className="bg-primary text-primary-foreground">-30% OFF</Badge>
                </div>
                <CardDescription>
                  <Badge variant="outline" className="mt-2">BEST SELLER</Badge>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">PDF</Badge>
                    <Badge variant="secondary">PIN</Badge>
                    <Badge variant="secondary">YMMV</Badge>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.imageUrl && (
                  <div className="relative h-64 w-full rounded-md overflow-hidden bg-muted/30">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                
                <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold text-lg">Description</h3>
                  <div className="text-sm text-muted-foreground space-y-2">
                    {product.description?.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Form */}
          <div className="space-y-6">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Purchase Details</CardTitle>
                <CardDescription>Select card value and quantity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Variant Selection */}
                <div className="space-y-2">
                  <Label>Select Card Value</Label>
                  <Select
                    value={selectedVariant?.id.toString()}
                    onValueChange={(value) => {
                      const variant = variants.find((v) => v.id.toString() === value);
                      setSelectedVariant(variant || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a denomination" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id.toString()}>
                          ${variant.denomination.toFixed(2)} - ${variant.customerPrice.toFixed(2)} (Stock: {variant.stockQuantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedVariant?.stockQuantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {selectedVariant?.stockQuantity || 0} units
                  </p>
                </div>

                {/* Discount Code */}
                <div className="space-y-2">
                  <Label>Discount Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      disabled={!!appliedDiscount}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyDiscount}
                      disabled={!!appliedDiscount}
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  {appliedDiscount && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      <span>{appliedDiscount.discountPercentage}% discount applied</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAppliedDiscount(null);
                          setDiscountCode("");
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Price Summary */}
                <div className="border-t border-border/40 pt-4 space-y-2">
                  {selectedVariant && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Unit Price:</span>
                        <span>${selectedVariant.customerPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Quantity:</span>
                        <span>{quantity}</span>
                      </div>
                      {appliedDiscount && (
                        <div className="flex justify-between text-sm text-primary">
                          <span>Discount ({appliedDiscount.discountPercentage}%):</span>
                          <span>-${((selectedVariant.customerPrice * quantity * appliedDiscount.discountPercentage) / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-border/40">
                        <span>Total:</span>
                        <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Balance Info */}
                {session?.user && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Your Balance:</span>
                      <span className={balance >= calculateTotal() ? "text-primary" : "text-destructive"}>
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                    {balance < calculateTotal() && (
                      <p className="text-xs text-destructive mt-2">
                        Insufficient credits. Please add funds.
                      </p>
                    )}
                  </div>
                )}

                {/* Purchase Button */}
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  onClick={handlePurchase}
                  disabled={!selectedVariant || !product.isAvailable || (session?.user && balance < calculateTotal())}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {!session?.user ? "Sign In to Purchase" : "Purchase Now"}
                </Button>

                {!session?.user && (
                  <p className="text-xs text-center text-muted-foreground">
                    <Link href="/sign-in" className="text-primary hover:underline">
                      Sign in
                    </Link>
                    {" "}or{" "}
                    <Link href="/sign-up" className="text-primary hover:underline">
                      create an account
                    </Link>
                    {" "}to purchase
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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