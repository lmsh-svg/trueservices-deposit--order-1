"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Upload, ExternalLink, Check, X, ArrowLeft } from "lucide-react";

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

export default function Food4LessPage() {
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
      
      const discountedAmount = amount * (1 - selectedService.discountPercentage / 100);
      
      const cartImageUrl = orderForm.cartImagePreview;
      const checkoutImageUrl = orderForm.checkoutImagePreview;
      
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
    <div className="min-h-screen bg-background">
      {/* Standalone FOOD4LESS Header - No TrueServices Navigation */}
      <header className="w-full bg-gradient-to-r from-primary via-[#ffae42] to-primary py-5 px-4 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">FOOD4LESS</h1>
        <p className="text-sm md:text-base text-primary-foreground/90 mt-1">
          Get your favorite food for less with TRUE Services
        </p>
        <div className="mt-3">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm font-medium text-primary-foreground hover:underline group relative"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to True Services
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Return to main TrueServices site
            </span>
          </Link>
        </div>
      </header>

      {/* Global Discount Banner */}
      <div className="w-full max-w-lg mx-auto mt-3 px-4">
        <div className="bg-primary text-primary-foreground text-center py-2 px-4 rounded-lg font-semibold text-sm md:text-base animate-pulse">
          🎉 SAVE UP TO 50% ON ALL ORDERS! 🎉
        </div>
      </div>

      {/* Service Status Banner */}
      <div className="w-full max-w-lg mx-auto mt-3 px-4">
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted/50 rounded-full">
          <span className="text-sm font-medium">Service Status:</span>
          <Badge className="bg-green-500 text-white">OPEN</Badge>
        </div>
      </div>

      {/* Available Services Section - Combined Info in Single Boxes */}
      <section className="w-full max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-card rounded-lg p-3 shadow-md transition-all ${
                  service.isAvailable ? 'hover:shadow-lg' : 'opacity-60 bg-muted'
                }`}
              >
                {/* Service Header */}
                <div className="flex justify-between items-center mb-2 relative">
                  <h3 className="text-sm md:text-base font-bold text-primary">{service.name}</h3>
                  <Badge 
                    className={service.isAvailable 
                      ? "bg-green-500 text-white" 
                      : "bg-red-500 text-white"
                    }
                  >
                    {service.isAvailable ? (
                      <><Check className="h-3 w-3 mr-1" />Available</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" />Unavailable</>
                    )}
                  </Badge>
                  {!service.isAvailable && (
                    <div className="hidden group-hover:block absolute top-full right-0 mt-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded max-w-[200px] text-center z-10">
                      This service is temporarily unavailable. Check back soon!
                    </div>
                  )}
                </div>

                {/* Service Image with Discount Badge */}
                <div className="flex justify-center mb-2">
                  <div className="relative inline-block">
                    {service.imageUrl ? (
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        width={130}
                        height={130}
                        className="rounded-md object-cover transition-transform hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="w-32 h-32 bg-muted rounded-md flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-bold shadow-md">
                      {service.discountPercentage}% OFF
                    </div>
                  </div>
                </div>

                {/* Price Limit */}
                {service.priceLimit && (
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    Price Limit: ${service.priceLimit} max
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm"
                    onClick={() => handleOrderClick(service)}
                    disabled={!service.isAvailable}
                  >
                    Order
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm"
                    onClick={() => handleBrowseClick(service)}
                    disabled={!service.isAvailable}
                  >
                    Browse
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section with Images */}
      <section className="w-full max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl md:text-2xl font-bold text-center mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-full h-40 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/3299d121-6898-45fe-872a-243b96ec8846/generated_images/clean%2c-modern-illustration-showing-a-s-b220bc0e-20251018190902.jpg"
                alt="Step 1: Add items to cart"
                width={400}
                height={200}
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="text-sm font-medium">1. Add items to your cart on the food delivery app</p>
          </div>
          
          <div className="text-center">
            <div className="w-full h-40 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/3299d121-6898-45fe-872a-243b96ec8846/generated_images/modern-digital-illustration-showing-a-ha-f1e8a11c-20251018190909.jpg"
                alt="Step 2: Take screenshot"
                width={400}
                height={200}
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="text-sm font-medium">2. Take a screenshot of your cart and submit your order</p>
          </div>
          
          <div className="text-center">
            <div className="w-full h-40 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/3299d121-6898-45fe-872a-243b96ec8846/generated_images/celebratory-illustration-showing-stacks--a02d2a26-20251018190917.jpg"
                alt="Step 3: Save money"
                width={400}
                height={200}
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="text-sm font-medium">3. We process it with exclusive discounts—you save big!</p>
          </div>
        </div>
      </section>

      {/* Status Section */}
      <section className="w-full max-w-lg mx-auto px-4 py-6">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <h2 className="text-lg font-semibold mb-3">Service Availability Status</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchServices}
            className="mb-3"
          >
            Refresh Status
          </Button>
          <div className="space-y-1 text-sm">
            {services.map((service) => (
              <div key={service.id} className="flex justify-between items-center">
                <span>{service.name}:</span>
                <Badge className={service.isAvailable ? "bg-green-500" : "bg-red-500"}>
                  {service.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </div>
            ))}
          </div>
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
                📸 Cart Screenshot <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
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
                📸 Checkout Total Screenshot <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
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
                Order Total Amount (USD) <span className="text-red-500">*</span>
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
                <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg border border-primary/30">
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
                Delivery Address <span className="text-red-500">*</span>
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
      <footer className="w-full text-center py-4 px-4 text-sm text-muted-foreground border-t border-border/40 mt-8">
        <p className="text-xs mb-1">By using this service, you agree to our Terms of Service and Privacy Policy.</p>
        <p>&copy; 2024 FOOD4LESS. All rights reserved.</p>
        <p className="mt-1">
          <Link href="/" className="text-primary hover:underline">
            Return to TrueServices
          </Link>
        </p>
      </footer>
    </div>
  );
}