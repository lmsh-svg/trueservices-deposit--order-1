"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingCart, Upload, Info, ExternalLink, CheckCircle, X } from "lucide-react";
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

export default function FoodServices() {
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
      
      // Sort services: UberEats first, then DoorDash, then GrubHub
      const sortOrder = ['ubereats', 'doordash', 'grubhub'];
      const sorted = data.sort((a: Service, b: Service) => {
        const aKey = a.name.toLowerCase().replace(/\s+/g, '');
        const bKey = b.name.toLowerCase().replace(/\s+/g, '');
        
        const aIndex = sortOrder.findIndex(key => aKey.includes(key));
        const bIndex = sortOrder.findIndex(key => bKey.includes(key));
        
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      setServices(sorted);
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
      window.open(service.browseLink, '_blank', 'noopener,noreferrer');
    } else {
      toast.error("Browse link not available for this service");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <Navigation />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/70 border-b border-border/40">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-primary-foreground mb-6 tracking-tight">
            FOOD<span className="text-primary-foreground/80">4</span>LESS
          </h1>
          <p className="text-xl md:text-2xl lg:text-3xl text-primary-foreground/95 font-bold leading-relaxed max-w-4xl mx-auto">
            Get your favorite food for less with TRUE Services. Easy. Reliable. 100% TRUE. Save up to 50% on your next meal.
          </p>
        </div>
      </section>

      {/* How It Works Section - Without Cards */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">How It Works</h2>
        
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
              1
            </div>
            <h3 className="text-xl md:text-2xl font-bold">Cart Screenshot</h3>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Open your DoorDash cart, ensure all items are visible, and take a screenshot
            </p>
          </div>
          
          {/* Cart Image - No Card */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md h-[400px] md:h-[500px]">
              <Image
                src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/DD-2.682168432a3f96.74677364.png?md5=TWfuQePJMp7A_osAPJ97VQ&expires=1760753269"
                alt="Cart Screenshot Example"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
              2
            </div>
            <h3 className="text-xl md:text-2xl font-bold">Checkout Total Screenshot</h3>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Proceed to checkout, ensure the total is visible, and take a screenshot
            </p>
          </div>

          {/* Checkout Image - No Card */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md h-[400px] md:h-[500px]">
              <Image
                src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/DDS-2.68216812cd78e2.99249574.png?md5=SPJFI0HPsANa_kdQAEYg-w&expires=1760753270"
                alt="Checkout Screenshot Example"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>

          {/* Important Notice */}
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">Important</AlertTitle>
            <AlertDescription className="text-base">
              Any attempt to falsify your total will be detected and may result in a permanent ban from our services.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Available Services - Square App Icons */}
      <section className="container mx-auto px-4 py-12 md:py-16 bg-muted/30">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Available Services</h2>
          <p className="text-base md:text-lg text-muted-foreground">Choose your platform and start saving</p>
        </div>

        {loading ? (
          <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-24 h-24 md:w-32 md:h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-4 md:gap-6 flex-wrap max-w-2xl mx-auto">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleOrderClick(service)}
                disabled={!service.isAvailable}
                className="relative group"
              >
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl shadow-lg transition-all ${
                  service.isAvailable 
                    ? 'hover:scale-110 hover:shadow-xl hover:shadow-primary/20' 
                    : 'opacity-50'
                } bg-gradient-to-br from-card to-card/80 border-2 border-border hover:border-primary flex flex-col items-center justify-center p-3 md:p-4`}>
                  {service.imageUrl ? (
                    <div className="relative w-12 h-12 md:w-16 md:h-16 mb-2">
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <ShoppingCart className="w-12 h-12 md:w-16 md:h-16 mb-2 text-primary" />
                  )}
                  <span className="text-xs md:text-sm font-bold text-center line-clamp-2">
                    {service.name.split(' ')[0]}
                  </span>
                </div>
                <div className="absolute -top-2 -right-2">
                  <Badge className="text-xs font-bold bg-primary text-primary-foreground shadow-lg">
                    {service.discountPercentage}%
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Order Limits Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Order Limits</h2>
        
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Uber Eats - Small Order */}
          <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl md:text-2xl font-bold">Uber Eats - Small Order</CardTitle>
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl md:text-3xl font-black text-primary">
                Uber Eats - Small Order 40% OFF
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                $20-$30 Subtotal Limit • Delivery Only
              </p>
            </CardContent>
            <CardFooter className="gap-2 flex-col sm:flex-row">
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Place Order
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </CardFooter>
          </Card>

          {/* Uber Eats - Large Order */}
          <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl md:text-2xl font-bold">Uber Eats - Large Order</CardTitle>
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl md:text-3xl font-black text-primary">
                Uber Eats - Large Order 40% OFF
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                $30-$70 Total Limit • Delivery Only
              </p>
            </CardContent>
            <CardFooter className="gap-2 flex-col sm:flex-row">
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Place Order
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </CardFooter>
          </Card>

          {/* Uber Eats - $100+ Order */}
          <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl md:text-2xl font-bold">Uber Eats - $100+ Order</CardTitle>
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl md:text-3xl font-black text-primary">
                Uber Eats - $100+ Order 55% OFF
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                $100-$300 Total Max • Delivery Only
              </p>
            </CardContent>
            <CardFooter className="gap-2 flex-col sm:flex-row">
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Place Order
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </CardFooter>
          </Card>

          {/* DoorDash - Small Order */}
          <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl md:text-2xl font-bold">DoorDash - Small Order</CardTitle>
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl md:text-3xl font-black text-primary">
                DoorDash - Small Order 40% OFF
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                $35-$200 Subtotal Limit • Delivery Only
              </p>
            </CardContent>
            <CardFooter className="gap-2 flex-col sm:flex-row">
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Place Order
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </CardFooter>
          </Card>

          {/* DoorDash - Large Order */}
          <Card className="overflow-hidden border-border/40 bg-muted/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl md:text-2xl font-bold text-muted-foreground">DoorDash - Large Order</CardTitle>
                <Badge variant="destructive">
                  <X className="w-4 h-4 mr-1" />
                  Unavailable
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl md:text-3xl font-black text-muted-foreground">
                DoorDash - Large Order 40% OFF
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                $50-$999+ Total Limit • Delivery Only
              </p>
            </CardContent>
            <CardFooter className="gap-2 flex-col sm:flex-row">
              <Button disabled className="w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Place Order
              </Button>
              <Button variant="outline" disabled className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </CardFooter>
          </Card>

          {/* Grubhub - Order */}
          <Card className="overflow-hidden border-border/40 bg-muted/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-xl md:text-2xl font-bold text-muted-foreground">Grubhub - Order</CardTitle>
                <Badge variant="destructive">
                  <X className="w-4 h-4 mr-1" />
                  Unavailable
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl md:text-3xl font-black text-muted-foreground">
                Grubhub - Order 40% OFF
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                $20-$100 Total Limit • Delivery Only
              </p>
            </CardContent>
            <CardFooter className="gap-2 flex-col sm:flex-row">
              <Button disabled className="w-full sm:w-auto">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Place Order
              </Button>
              <Button variant="outline" disabled className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Place Your Order - {selectedService?.name}</DialogTitle>
            <DialogDescription className="text-base text-zinc-400">
              Upload both screenshots and complete your order details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cart Screenshot Upload */}
            <div className="space-y-3">
              <Label htmlFor="cartImage" className="text-base font-bold flex items-center gap-2 text-white">
                📸 Cart Screenshot <span className="text-red-400">*</span>
              </Label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-zinc-900/50">
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
                      <p className="text-base font-medium text-white">Click to upload cart screenshot</p>
                      <p className="text-sm text-zinc-500">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Checkout Screenshot Upload */}
            <div className="space-y-3">
              <Label htmlFor="checkoutImage" className="text-base font-bold flex items-center gap-2 text-white">
                📸 Checkout Total Screenshot <span className="text-red-400">*</span>
              </Label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-zinc-900/50">
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
                      <p className="text-base font-medium text-white">Click to upload checkout total screenshot</p>
                      <p className="text-sm text-zinc-500">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Order Amount */}
            <div className="space-y-2">
              <Label htmlFor="orderAmount" className="text-base font-bold text-white">
                Order Total Amount (USD) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="orderAmount"
                type="number"
                step="0.01"
                placeholder="Enter total from checkout screenshot"
                value={orderForm.orderAmount}
                onChange={(e) => setOrderForm({ ...orderForm, orderAmount: e.target.value })}
                className="text-lg h-12 bg-zinc-900 border-zinc-700 text-white"
              />
              {selectedService && orderForm.orderAmount && (
                <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <span className="font-medium text-zinc-300">You save: ${(parseFloat(orderForm.orderAmount) * selectedService.discountPercentage / 100).toFixed(2)}</span>
                  <span className="font-bold text-primary text-lg">
                    You pay: ${(parseFloat(orderForm.orderAmount) * (1 - selectedService.discountPercentage / 100)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className="text-base font-bold text-white">
                Delivery Address <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="deliveryAddress"
                placeholder="Enter your full delivery address including apartment/unit number"
                value={orderForm.deliveryAddress}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                rows={3}
                className="resize-none bg-zinc-900 border-zinc-700 text-white"
              />
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label htmlFor="specialInstructions" className="text-base font-bold text-white">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="specialInstructions"
                placeholder="Dietary restrictions, delivery notes, utensils requests, etc."
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                rows={2}
                className="resize-none bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)} className="border-zinc-700 hover:bg-zinc-900">
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
      <footer className="border-t border-border/40 bg-muted/20 backdrop-blur mt-12 md:mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrueServices. All rights reserved.</p>
          <p className="mt-2">Built on Trust. Powered by Experience.</p>
        </div>
      </footer>
    </div>
  );
}