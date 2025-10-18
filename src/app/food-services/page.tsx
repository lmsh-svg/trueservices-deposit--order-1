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
    <div className="min-h-screen bg-black">
      {/* Top Navigation Bar - Ultra Dark */}
      <div className="bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices"
              width={20}
              height={20}
              className="object-contain opacity-60"
              unoptimized
            />
            <span className="text-xs font-medium">TrueServices</span>
          </Link>
          <div className="flex items-center gap-4">
            {session?.user ? (
              <Link href="/account" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium">
                Account
              </Link>
            ) : (
              <Link href="/sign-in" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-medium">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner - Premium Dark Design */}
      <section className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-40" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAyIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
        
        <div className="container mx-auto px-4 py-16 text-center relative">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter">
            Get Your Food For <span className="text-primary">Less</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-300 font-bold mb-4">
            Easy, Reliable, 100% True
          </p>
          
          <p className="text-lg md:text-xl text-zinc-400 mb-10">
            Save up to 50% on your next meal
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-black shadow-2xl shadow-primary/30">
              <Link href="#services">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Start Saving Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-zinc-700 hover:bg-zinc-900 text-white px-8 py-6 text-lg font-bold">
              <Link href="#how-it-works">
                <Info className="mr-2 h-5 w-5" />
                How It Works
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section - Ultra Compact */}
      <section id="how-it-works" className="bg-zinc-950 py-12 border-b border-zinc-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-8 text-white">How It Works</h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800/80">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">1</div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-black text-white">Upload Your Cart Screenshot</h3>
                    <p className="text-base text-zinc-300 leading-relaxed">
                      Take a clear screenshot of your cart showing all items, quantities, and item names. Make sure everything is visible and legible. This helps us verify your order accurately.
                    </p>
                    <ul className="text-sm text-zinc-400 space-y-1 pl-4">
                      <li>• Show all food items in your cart</li>
                      <li>• Include quantities and item names</li>
                      <li>• Make sure the screenshot is clear and readable</li>
                    </ul>
                  </div>
                  <div className="relative w-48 h-64 md:w-40 md:h-56 rounded-lg border-2 border-zinc-700 overflow-hidden flex-shrink-0 shadow-2xl">
                    <Image
                      src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/DD-2.682168432a3f96.74677364.png?md5=TWfuQePJMp7A_osAPJ97VQ&expires=1760753269"
                      alt="Cart Screenshot Example"
                      fill
                      className="object-contain bg-white"
                      unoptimized
                    />
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-zinc-900/80 rounded-xl p-6 border border-zinc-800/80">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">2</div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-black text-white">Upload Checkout Total Screenshot</h3>
                    <p className="text-base text-zinc-300 leading-relaxed">
                      Capture your complete checkout screen with the final total amount, including all fees, taxes, tips, and delivery charges. This is what we base your discount on.
                    </p>
                    <ul className="text-sm text-zinc-400 space-y-1 pl-4">
                      <li>• Must show the final total amount</li>
                      <li>• Include all fees, taxes, and delivery charges</li>
                      <li>• Ensure the total is clearly visible</li>
                    </ul>
                  </div>
                  <div className="relative w-48 h-64 md:w-40 md:h-56 rounded-lg border-2 border-zinc-700 overflow-hidden flex-shrink-0 shadow-2xl">
                    <Image
                      src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/DDS-2.68216812cd78e2.99249574.png?md5=SPJFI0HPsANa_kdQAEYg-w&expires=1760753270"
                      alt="Checkout Total Screenshot Example"
                      fill
                      className="object-contain bg-white"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-red-950/40 border-2 border-red-900/50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-200 mb-1">⚠️ Important Warning</p>
                <p className="text-sm text-red-300 leading-relaxed">
                  Falsified or edited screenshots will result in immediate and permanent account ban. All submissions are verified. Please be accurate and honest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid - Premium Dark Cards */}
      <section id="services" className="bg-black py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2">Available Services</h2>
            <p className="text-base text-zinc-400">Choose your platform and start saving</p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 bg-zinc-800" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-40 w-full bg-zinc-800" />
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Skeleton className="h-10 w-full bg-zinc-800" />
                    <Skeleton className="h-9 w-full bg-zinc-800" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : services.length === 0 ? (
            <Alert className="max-w-3xl mx-auto bg-zinc-900 border-zinc-800">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Services Available</AlertTitle>
              <AlertDescription>
                No food delivery services are currently available. Please check back later.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {services.map((service) => (
                <Card 
                  key={service.id} 
                  className={`group bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-800 hover:border-primary/50 transition-all duration-300 ${!service.isAvailable ? "opacity-50" : "hover:shadow-2xl hover:shadow-primary/10"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg font-black text-white">{service.name}</CardTitle>
                      <Badge variant={service.isAvailable ? "default" : "secondary"} className="text-xs font-bold">
                        {service.isAvailable ? "Active" : "Unavailable"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-zinc-400">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:border-primary/30 transition-colors">
                      {service.imageUrl ? (
                        <Image
                          src={service.imageUrl}
                          alt={service.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <ShoppingCart className="h-14 w-14 text-zinc-700" />
                      )}
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full font-black text-sm shadow-xl">
                        {service.discountPercentage}% OFF
                      </div>
                    </div>
                    {service.priceLimit && (
                      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 rounded-md border border-zinc-800 text-xs">
                        <span className="text-zinc-500 font-medium">Max:</span>
                        <span className="font-black text-primary">${service.priceLimit}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-0">
                    <Button
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black h-10 shadow-lg shadow-primary/20"
                      disabled={!service.isAvailable}
                      onClick={() => handleOrderClick(service)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Order Now
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-9 text-sm font-bold border-zinc-700 hover:border-primary/50 hover:bg-primary/10 text-zinc-300 hover:text-white"
                      onClick={() => handleBrowseClick(service)}
                      disabled={!service.browseLink}
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Browse {service.name.split(' ')[0]}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
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
      <footer className="bg-zinc-950 backdrop-blur border-t border-zinc-800/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices"
              width={24}
              height={24}
              className="object-contain opacity-50"
              unoptimized
            />
            <span className="font-semibold text-sm">Back to TrueServices</span>
          </Link>
          <p className="text-zinc-600 text-xs">&copy; 2024 Food4Less - Powered by TrueServices</p>
        </div>
      </footer>
    </div>
  );
}