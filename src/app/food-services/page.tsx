"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ShoppingCart, Package, Truck, CheckCircle, Clock, Upload, Info, ExternalLink, Check, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
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

export default function Food4LessPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  
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
  const [myOrders, setMyOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchServices();
    fetchMyOrders();
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

  const fetchMyOrders = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/orders?userId=${session.user.id}&status=any`, {
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setMyOrders(data);
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

  const getDeliveryStatusColor = (status: string) => {
    const colors = {
      pending: "secondary",
      "in-transit": "warning",
      delivered: "default",
      cancelled: "destructive"
    };
    return colors[status] || "secondary";
  };

  const getDeliveryStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      "in-transit": <Truck className="h-4 w-4" />,
      delivered: <CheckCircle className="h-4 w-4" />,
      cancelled: <X className="h-4 w-4" />
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
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
            <Link href="/deposit" className="text-sm font-medium hover:text-primary transition-colors">
              Deposit
            </Link>
            {session?.user ? (
              <>
                <Link href="/account" className="text-sm font-medium hover:text-primary transition-colors">
                  Account
                </Link>
                {session.user.role === "admin" && (
                  <Button asChild size="sm">
                    <Link href="/admin">Admin</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Banner - More Prominent for Standalone Feel */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Link>
        </Button>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 rounded-3xl p-16 md:p-20 text-center shadow-2xl shadow-primary/30 border-4 border-primary/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <div className="relative space-y-6">
            <h1 className="text-6xl md:text-8xl font-black text-primary-foreground tracking-tighter">
              FOOD<span className="text-primary-foreground/90">4</span>LESS
            </h1>
            <p className="text-xl md:text-3xl text-primary-foreground font-bold max-w-4xl mx-auto leading-relaxed">
              Get your favorite food for less with TRUE Services. Easy. Reliable. 100% TRUE. Save up to 50% on your next meal.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 pb-12">
        <Alert className="border-primary/30 bg-primary/5 shadow-lg">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-2xl font-bold text-primary mb-4">How It Works</AlertTitle>
          <AlertDescription className="text-base space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">1</span>
              <p className="font-semibold">Add items to your cart on the food delivery app</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">2</span>
              <p className="font-semibold">Take a screenshot of your cart and submit your order</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">3</span>
              <p className="font-semibold">We process it with exclusive discounts—you save big!</p>
            </div>
          </AlertDescription>
        </Alert>
      </section>

      {/* Available Services - App Icon Style WITH Info */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-4xl font-bold mb-8 text-center">Available Services</h2>
        
        {loading ? (
          <div className="flex justify-center gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                className="group relative"
              >
                <div
                  className={`relative w-28 h-28 md:w-32 md:h-32 rounded-3xl shadow-xl ${
                    service.isAvailable
                      ? "bg-gradient-to-br from-primary/90 to-primary cursor-pointer hover:scale-110 transition-transform"
                      : "bg-muted/50 opacity-50"
                  } flex items-center justify-center overflow-hidden border-4 border-background`}
                  onClick={() => service.isAvailable && handleOrderClick(service)}
                >
                  {service.imageUrl ? (
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ShoppingCart className="h-12 w-12 md:h-14 md:w-14 text-primary-foreground" />
                  )}
                  <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                    {service.discountPercentage}%
                  </div>
                </div>
                <div className="text-center mt-3 max-w-[140px]">
                  <p className="font-bold text-sm truncate">{service.name}</p>
                  <Badge variant={service.isAvailable ? "default" : "secondary"} className="mt-1 text-xs">
                    {service.isAvailable ? "✔ Available" : "✖ Unavailable"}
                  </Badge>
                  {service.priceLimit && (
                    <p className="text-xs text-muted-foreground mt-1">Up to ${service.priceLimit}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Order Limits Section - Detailed Format */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-4xl font-bold mb-8 text-center">Order Limits & Pricing</h2>
        
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Uber Eats - Small Order */}
          <Card className="border-2 border-green-500/30 bg-card/80 backdrop-blur hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">Uber Eats - Small Order</h3>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-primary mb-2">40% OFF</p>
                  <p className="text-sm text-muted-foreground">$20-$30 Subtotal Limit • Delivery Only</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => {
                  const service = services.find(s => s.name.includes("Uber") && s.priceLimit === 30);
                  if (service) handleOrderClick(service);
                }}>
                  Place Order
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://ubereats.com" target="_blank" rel="noopener noreferrer">
                    Browse <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Uber Eats - Large Order */}
          <Card className="border-2 border-green-500/30 bg-card/80 backdrop-blur hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">Uber Eats - Large Order</h3>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-primary mb-2">40% OFF</p>
                  <p className="text-sm text-muted-foreground">$30-$70 Total Limit • Delivery Only</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => {
                  const service = services.find(s => s.name.includes("Uber") && s.priceLimit === 70);
                  if (service) handleOrderClick(service);
                }}>
                  Place Order
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://ubereats.com" target="_blank" rel="noopener noreferrer">
                    Browse <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Uber Eats - $100+ Order */}
          <Card className="border-2 border-green-500/30 bg-card/80 backdrop-blur hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">Uber Eats - $100+ Order</h3>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-primary mb-2">55% OFF</p>
                  <p className="text-sm text-muted-foreground">$100-$300 Total Max • Delivery Only</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => {
                  const service = services.find(s => s.name.includes("Uber") && s.priceLimit === 300);
                  if (service) handleOrderClick(service);
                }}>
                  Place Order
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://ubereats.com" target="_blank" rel="noopener noreferrer">
                    Browse <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* DoorDash - Small Order */}
          <Card className="border-2 border-green-500/30 bg-card/80 backdrop-blur hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">DoorDash - Small Order</h3>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-primary mb-2">40% OFF</p>
                  <p className="text-sm text-muted-foreground">$35-$200 Subtotal Limit • Delivery Only</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => {
                  const service = services.find(s => s.name.includes("DoorDash") && s.priceLimit === 200);
                  if (service) handleOrderClick(service);
                }}>
                  Place Order
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://doordash.com" target="_blank" rel="noopener noreferrer">
                    Browse <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* DoorDash - Large Order */}
          <Card className="border-2 border-red-500/30 bg-card/80 backdrop-blur opacity-70">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">DoorDash - Large Order</h3>
                    <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                      <X className="h-3 w-3 mr-1" />
                      Unavailable
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-muted-foreground mb-2">40% OFF</p>
                  <p className="text-sm text-muted-foreground">$50-$999+ Total Limit • Delivery Only</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="flex-1" disabled>
                  Place Order
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://doordash.com" target="_blank" rel="noopener noreferrer">
                    Browse <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grubhub - Order */}
          <Card className="border-2 border-red-500/30 bg-card/80 backdrop-blur opacity-70">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">Grubhub - Order</h3>
                    <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                      <X className="h-3 w-3 mr-1" />
                      Unavailable
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-muted-foreground mb-2">40% OFF</p>
                  <p className="text-sm text-muted-foreground">$20-$100 Total Limit • Delivery Only</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button className="flex-1" disabled>
                  Place Order
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href="https://grubhub.com" target="_blank" rel="noopener noreferrer">
                    Browse <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* My Orders Section */}
      {session?.user && myOrders.length > 0 && (
        <section className="container mx-auto px-4 pb-20">
          <div className="bg-muted/30 backdrop-blur rounded-xl p-8 border border-border/40">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">My Orders</h2>
              <Button variant="outline" size="sm" onClick={fetchMyOrders}>
                Refresh Status
              </Button>
            </div>

            <div className="space-y-4">
              {myOrders.map((order) => (
                <Card key={order.id} className="border-border/40 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                        <CardDescription>
                          Placed {new Date(order.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={getDeliveryStatusColor(order.deliveryStatus)}>
                        <span className="mr-2">{getDeliveryStatusIcon(order.deliveryStatus)}</span>
                        {order.deliveryStatus.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-bold text-lg text-primary">${order.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Status</p>
                        <Badge variant={order.paymentStatus === "confirmed" ? "default" : "secondary"}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  {order.deliveryStatus === "delivered" && (
                    <CardFooter className="bg-muted/30">
                      <Button variant="outline" className="w-full">
                        Leave a Review
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

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
      <footer className="border-t border-border/40 bg-muted/20 backdrop-blur mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrueServices FOOD4LESS. All rights reserved.</p>
          <p className="mt-2">Easy. Reliable. 100% TRUE.</p>
        </div>
      </footer>
    </div>
  );
}