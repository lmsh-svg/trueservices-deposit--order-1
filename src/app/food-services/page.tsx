"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingCart, Upload, Info, ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

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

export default function FoodServicesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderForm, setOrderForm] = useState({
    cartImageFile: null as File | null,
    cartImagePreview: "",
    checkoutImageFile: null as File | null,
    checkoutImagePreview: "",
    orderAmount: "",
    deliveryAddress: "",
    specialInstructions: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/services?category=food_delivery&limit=100");
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (service: Service) => {
    if (!service.isAvailable) {
      toast.error("This service is currently unavailable");
      return;
    }
    
    if (!session?.user) {
      toast.error("Please sign in to place an order");
      router.push("/sign-in");
      return;
    }
    
    setSelectedService(service);
    setOrderDialogOpen(true);
  };

  const handleCartImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const preview = URL.createObjectURL(file);
    setOrderForm({ ...orderForm, cartImageFile: file, cartImagePreview: preview });
    toast.success("Cart screenshot uploaded");
  };

  const handleCheckoutImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const preview = URL.createObjectURL(file);
    setOrderForm({ ...orderForm, checkoutImageFile: file, checkoutImagePreview: preview });
    toast.success("Checkout screenshot uploaded");
  };

  const handleOrderSubmit = async () => {
    if (!selectedService || !session?.user?.id) return;

    // Validation
    if (!orderForm.cartImageFile || !orderForm.checkoutImageFile) {
      toast.error("Please upload both cart and checkout screenshots");
      return;
    }

    const amount = parseFloat(orderForm.orderAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid order amount");
      return;
    }

    if (selectedService.priceLimit && amount > selectedService.priceLimit) {
      toast.error(`Order amount cannot exceed $${selectedService.priceLimit}`);
      return;
    }

    if (!orderForm.deliveryAddress.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      
      // Calculate discounted amount
      const discountedAmount = amount * (1 - selectedService.discountPercentage / 100);
      
      // In production, upload images to storage first
      const cartImageUrl = orderForm.cartImagePreview;
      const checkoutImageUrl = orderForm.checkoutImagePreview;
      
      // Create order
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: session.user.id,
          orderType: "service",
          serviceId: selectedService.id,
          totalAmount: discountedAmount,
          paymentStatus: "pending",
          deliveryStatus: "pending",
          specialInstructions: `Cart Screenshot: ${cartImageUrl}\nCheckout Screenshot: ${checkoutImageUrl}\nOriginal Amount: $${amount}\nDelivery Address: ${orderForm.deliveryAddress}\nSpecial Instructions: ${orderForm.specialInstructions}`,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const order = await orderResponse.json();
      
      // Reset form
      setOrderForm({
        cartImageFile: null,
        cartImagePreview: "",
        checkoutImageFile: null,
        checkoutImagePreview: "",
        orderAmount: "",
        deliveryAddress: "",
        specialInstructions: "",
      });
      setOrderDialogOpen(false);
      
      toast.success(`Order placed successfully! Order #${order.id}`, {
        description: "Your order is being processed. You'll be notified once it's ready."
      });
      
      router.push(`/orders/${order.id}`);
    } catch (err) {
      toast.error("Failed to place order. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBrowseClick = (service: Service) => {
    if (service.browseLink) {
      window.open(service.browseLink, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary/80">
      {/* Top Navigation Bar - Minimal True Services Link */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices"
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
            <span className="text-xs text-white font-medium">powered by TrueServices</span>
          </Link>
          <div className="flex items-center gap-4">
            {session?.user ? (
              <Link href="/account" className="text-xs text-white/80 hover:text-white transition-colors">
                My Account
              </Link>
            ) : (
              <Link href="/sign-in" className="text-xs text-white/80 hover:text-white transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner - Food For Less Branding */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-block mb-6 px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
            <p className="text-white/90 text-sm font-semibold tracking-wide">🔥 LIMITED TIME OFFER</p>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter drop-shadow-2xl">
            FOOD<span className="text-white/80">4</span>LESS
          </h1>
          
          <p className="text-2xl md:text-3xl text-white/95 font-bold mb-6 drop-shadow-lg">
            Save BIG on Every Food Delivery Order
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Badge className="bg-white text-primary px-6 py-3 text-xl font-black shadow-2xl hover:scale-105 transition-transform">
              <Sparkles className="mr-2 h-5 w-5" />
              Up to 70% OFF
            </Badge>
            <Badge className="bg-black/30 text-white border-white/30 px-6 py-3 text-lg font-bold backdrop-blur">
              All Major Platforms
            </Badge>
          </div>
          
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Order from your favorite restaurants on DoorDash, Uber Eats, and more — we'll process it with our exclusive wholesale discounts!
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">Follow these simple steps to get massive discounts on your food orders</p>
            
            <div className="grid md:grid-cols-2 gap-12 mb-12">
              {/* Step 1: Cart Screenshot */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">1</div>
                    <CardTitle className="text-2xl">Upload Cart Screenshot</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Open your DoorDash cart, ensure all items are visible, and take a screenshot. Upload it when placing your order.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border-2 border-border bg-muted">
                      <Image
                        src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/DD-2.682168432a3f96.74677364.png?md5=TWfuQePJMp7A_osAPJ97VQ&expires=1760753269"
                        alt="Cart Screenshot Example"
                        width={400}
                        height={600}
                        className="w-full h-auto object-contain"
                        unoptimized
                      />
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Example:</strong> Make sure all items, quantities, and subtotal are clearly visible in your screenshot.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Checkout Screenshot */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">2</div>
                    <CardTitle className="text-2xl">Upload Checkout Total</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Proceed to checkout, ensure the total (including fees and taxes) is visible, and take a screenshot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border-2 border-border bg-muted">
                      <Image
                        src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/DDS-2.68216812cd78e2.99249574.png?md5=SPJFI0HPsANa_kdQAEYg-w&expires=1760753270"
                        alt="Checkout Total Screenshot Example"
                        width={400}
                        height={600}
                        className="w-full h-auto object-contain"
                        unoptimized
                      />
                    </div>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Example:</strong> Capture the complete checkout screen showing the final total with all fees, taxes, and delivery charges.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Important Notice */}
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <AlertTitle className="text-lg font-bold">Important Notice</AlertTitle>
              <AlertDescription className="text-base mt-2">
                <strong>Any attempt to falsify your total will be detected and may result in a permanent ban from our services.</strong> Please provide accurate screenshots to avoid delays in processing your order.
              </AlertDescription>
            </Alert>

            {/* Tips */}
            <div className="mt-8 bg-primary/5 border border-primary/20 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Pro Tips for Best Results
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Take screenshots in a well-lit environment and ensure all text is legible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Use the DoorDash app, not the website, for most accurate screenshots</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Make sure your device's battery/time indicators don't cover important information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Double-check that the total amount matches what you enter in the order form</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Available Delivery Services</h2>
            <p className="text-xl text-muted-foreground">Choose your favorite platform and start saving today</p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : services.length === 0 ? (
            <Alert className="max-w-3xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Services Available</AlertTitle>
              <AlertDescription>
                No food delivery services are currently available. Please check back later.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {services.map((service) => (
                <Card 
                  key={service.id} 
                  className={`${!service.isAvailable ? "opacity-60" : "hover:shadow-2xl hover:shadow-primary/20 transition-all cursor-pointer border-2 hover:border-primary/50"}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl">{service.name}</CardTitle>
                      <Badge variant={service.isAvailable ? "default" : "secondary"} className="bg-primary text-primary-foreground">
                        {service.isAvailable ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative h-48 w-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-background flex items-center justify-center border-2 border-border">
                      {service.imageUrl ? (
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <ShoppingCart className="h-20 w-20 text-primary/30" />
                      )}
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-4 py-2 rounded-full font-black text-lg shadow-2xl animate-pulse">
                        {service.discountPercentage}% OFF
                      </div>
                    </div>
                    {service.priceLimit && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg border border-border">
                        <span className="text-sm font-medium text-muted-foreground">Maximum order:</span>
                        <span className="text-lg font-bold text-primary">${service.priceLimit}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg h-12"
                      disabled={!service.isAvailable}
                      onClick={() => handleOrderClick(service)}
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Order Now
                    </Button>
                    {service.browseLink && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleBrowseClick(service)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Browse Menu
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Place Your Order - {selectedService?.name}</DialogTitle>
            <DialogDescription className="text-base">
              Upload both screenshots and complete your order details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cart Screenshot Upload */}
            <div className="space-y-3">
              <Label htmlFor="cartImage" className="text-base font-bold flex items-center gap-2">
                📸 Cart Screenshot <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-primary/5">
                <input
                  id="cartImage"
                  type="file"
                  accept="image/*"
                  onChange={handleCartImageUpload}
                  className="hidden"
                />
                <label htmlFor="cartImage" className="cursor-pointer block">
                  {orderForm.cartImagePreview ? (
                    <div className="space-y-2">
                      <div className="relative h-32 w-full rounded-md overflow-hidden">
                        <Image
                          src={orderForm.cartImagePreview}
                          alt="Cart preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <p className="text-sm text-primary font-medium">✓ Cart screenshot uploaded - Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Upload className="h-10 w-10 mx-auto text-primary" />
                      <p className="text-base font-medium">Click to upload cart screenshot</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Checkout Screenshot Upload */}
            <div className="space-y-3">
              <Label htmlFor="checkoutImage" className="text-base font-bold flex items-center gap-2">
                📸 Checkout Total Screenshot <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-primary/5">
                <input
                  id="checkoutImage"
                  type="file"
                  accept="image/*"
                  onChange={handleCheckoutImageUpload}
                  className="hidden"
                />
                <label htmlFor="checkoutImage" className="cursor-pointer block">
                  {orderForm.checkoutImagePreview ? (
                    <div className="space-y-2">
                      <div className="relative h-32 w-full rounded-md overflow-hidden">
                        <Image
                          src={orderForm.checkoutImagePreview}
                          alt="Checkout preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <p className="text-sm text-primary font-medium">✓ Checkout screenshot uploaded - Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Upload className="h-10 w-10 mx-auto text-primary" />
                      <p className="text-base font-medium">Click to upload checkout total screenshot</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Order Amount */}
            <div className="space-y-2">
              <Label htmlFor="orderAmount" className="text-base font-bold">
                Order Total Amount (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orderAmount"
                type="number"
                step="0.01"
                placeholder="Enter total from checkout screenshot"
                value={orderForm.orderAmount}
                onChange={(e) => setOrderForm({ ...orderForm, orderAmount: e.target.value })}
                className="text-lg h-12"
              />
              {selectedService && orderForm.orderAmount && (
                <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
                  <span className="font-medium">You save: ${(parseFloat(orderForm.orderAmount) * selectedService.discountPercentage / 100).toFixed(2)}</span>
                  <span className="font-bold text-primary text-lg">
                    You pay: ${(parseFloat(orderForm.orderAmount) * (1 - selectedService.discountPercentage / 100)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className="text-base font-bold">
                Delivery Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="deliveryAddress"
                placeholder="Enter your full delivery address including apartment/unit number"
                value={orderForm.deliveryAddress}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label htmlFor="specialInstructions" className="text-base font-bold">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="specialInstructions"
                placeholder="Dietary restrictions, delivery notes, utensils requests, etc."
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOrderSubmit} 
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              {submitting ? "Processing Order..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 opacity-60 hover:opacity-100 transition-opacity">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices"
              width={32}
              height={32}
              className="object-contain"
              unoptimized
            />
            <span className="text-white font-bold">Back to TrueServices</span>
          </Link>
          <p className="text-white/60 text-sm">&copy; 2024 Food4Less - Powered by TrueServices</p>
          <p className="text-white/40 text-xs mt-2">Save more. Eat better.</p>
        </div>
      </footer>
    </div>
  );
}