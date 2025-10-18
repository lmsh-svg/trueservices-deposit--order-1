"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ShoppingCart, Package, Truck, CheckCircle, Clock, Upload, Info } from "lucide-react";
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

interface Order {
  id: number;
  userId: number;
  orderType: string;
  serviceId: number;
  totalAmount: number;
  paymentStatus: string;
  deliveryStatus: string;
  transactionHash: string | null;
  cryptocurrencyUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Food4LessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const serviceIdParam = searchParams.get("serviceId");
  
  const [services, setServices] = useState<Service[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderForm, setOrderForm] = useState({
    cartImageUrl: "",
    orderAmount: "",
    deliveryAddress: "",
    specialInstructions: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      setServices(data);
      
      if (serviceIdParam) {
        const service = data.find((s: Service) => s.id === parseInt(serviceIdParam));
        if (service) {
          setSelectedService(service);
          setOrderDialogOpen(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    try {
      // For demo purposes, fetching all orders. In production, filter by userId
      const response = await fetch("/api/orders?orderType=service&limit=10");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setMyOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      // In a real implementation, you would upload to your storage service
      // For now, we'll create a local URL
      const imageUrl = URL.createObjectURL(file);
      setOrderForm({ ...orderForm, cartImageUrl: imageUrl });
      toast.success("Cart image uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload image");
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOrderSubmit = async () => {
    if (!selectedService) return;
    
    if (!session?.user?.id) {
      toast.error("Please sign in to place an order");
      router.push("/sign-in");
      return;
    }

    // Validation
    if (!orderForm.cartImageUrl.trim()) {
      toast.error("Please upload an image of your cart");
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
          specialInstructions: `Cart Image: ${orderForm.cartImageUrl}\nDelivery Address: ${orderForm.deliveryAddress}\nSpecial Instructions: ${orderForm.specialInstructions}`,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const order = await orderResponse.json();
      
      // Reset form
      setOrderForm({
        cartImageUrl: "",
        orderAmount: "",
        deliveryAddress: "",
        specialInstructions: "",
      });
      setOrderDialogOpen(false);
      
      // Refresh orders
      fetchMyOrders();
      
      toast.success(`Order placed successfully! Order #${order.id}`, {
        description: "Your order is being processed. You'll be notified once it's ready."
      });
    } catch (err) {
      toast.error("Failed to place order. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5" />;
      case "processing":
        return <Package className="h-5 w-5" />;
      case "in_transit":
        return <Truck className="h-5 w-5" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "processing":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in_transit":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "delivered":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

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

      {/* Header with FOOD4LESS Branding */}
      <section className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Link>
        </Button>
        
        <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/70 rounded-2xl p-12 text-center mb-8 shadow-2xl shadow-primary/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-black text-primary-foreground mb-3 tracking-tight">
              FOOD<span className="text-primary-foreground/80">4</span>LESS
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 font-semibold">
              Get massive discounts on your favorite food delivery services
            </p>
            <Badge className="mt-4 bg-primary-foreground text-primary px-6 py-2 text-lg font-bold shadow-lg">
              Save up to 45% on every order
            </Badge>
          </div>
        </div>

        {/* How It Works Banner */}
        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-bold text-primary">How It Works</AlertTitle>
          <AlertDescription className="text-base mt-2 space-y-2">
            <p className="font-medium">1️⃣ Add items to your cart on the food delivery app</p>
            <p className="font-medium">2️⃣ Take a screenshot of your cart</p>
            <p className="font-medium">3️⃣ Upload the screenshot and enter order details</p>
            <p className="font-medium">4️⃣ We'll process your order with our exclusive discounts!</p>
          </AlertDescription>
        </Alert>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Available Delivery Services</h2>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {services.length} services
          </Badge>
        </div>
        
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
        ) : services.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Services Available</AlertTitle>
            <AlertDescription>
              No food delivery services are currently available. Please check back later.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card 
                key={service.id} 
                className={`${!service.isAvailable ? "opacity-60" : "hover:shadow-xl hover:shadow-primary/10 transition-all cursor-pointer border-border/40 bg-card/50 backdrop-blur"}`}
                onClick={() => handleOrderClick(service)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <Badge variant={service.isAvailable ? "default" : "secondary"} className="bg-primary/20 text-primary">
                      {service.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative h-48 w-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background flex items-center justify-center border border-border/40">
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
                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-base shadow-lg">
                      {service.discountPercentage}% OFF
                    </div>
                  </div>
                  {service.priceLimit && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Orders up to</span>
                      <span className="text-lg font-bold text-primary">${service.priceLimit}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/30">
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
                    disabled={!service.isAvailable}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderClick(service);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Order Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Order Status Section */}
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

      {/* Order Dialog with Cart Upload */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Place Order - {selectedService?.name}</DialogTitle>
            <DialogDescription className="text-base">
              Upload your cart screenshot and complete the order details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cart Image Upload */}
            <div className="space-y-3">
              <Label htmlFor="cartImage" className="text-base font-semibold">
                Cart Screenshot <span className="text-destructive">*</span>
              </Label>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors bg-primary/5">
                <input
                  id="cartImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label htmlFor="cartImage" className="cursor-pointer block">
                  {orderForm.cartImageUrl ? (
                    <div className="space-y-3">
                      <div className="relative h-40 w-full rounded-md overflow-hidden">
                        <Image
                          src={orderForm.cartImageUrl}
                          alt="Cart preview"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <p className="text-sm text-primary font-medium">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-12 w-12 mx-auto text-primary" />
                      <div>
                        <p className="text-base font-medium text-foreground">Click to upload cart screenshot</p>
                        <p className="text-sm text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Instructions:</strong> Take a screenshot of your cart in the {selectedService?.name} app showing all items and the total amount.
                </AlertDescription>
              </Alert>
            </div>

            {/* Order Amount */}
            <div className="space-y-2">
              <Label htmlFor="orderAmount" className="text-base font-semibold">
                Order Amount (USD) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orderAmount"
                type="number"
                step="0.01"
                placeholder="25.00"
                value={orderForm.orderAmount}
                onChange={(e) => setOrderForm({ ...orderForm, orderAmount: e.target.value })}
                className="text-lg"
              />
              {selectedService?.priceLimit && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Maximum: ${selectedService.priceLimit}</span>
                  {orderForm.orderAmount && (
                    <span className="font-bold text-primary">
                      You save: ${(parseFloat(orderForm.orderAmount) * selectedService.discountPercentage / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className="text-base font-semibold">
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
              <Label htmlFor="specialInstructions" className="text-base font-semibold">
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any special requests, dietary restrictions, or delivery instructions"
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Order Summary */}
            {orderForm.orderAmount && selectedService && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-lg">Order Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Original Amount:</span>
                    <span className="line-through text-muted-foreground">${parseFloat(orderForm.orderAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold">
                    <span>Discount ({selectedService.discountPercentage}%):</span>
                    <span>-${(parseFloat(orderForm.orderAmount) * selectedService.discountPercentage / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>You Pay:</span>
                    <span className="text-primary">${(parseFloat(orderForm.orderAmount) * (1 - selectedService.discountPercentage / 100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOrderSubmit} 
              disabled={submitting || uploadingImage}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? "Processing..." : uploadingImage ? "Uploading..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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