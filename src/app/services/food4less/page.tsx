"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ShoppingCart, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const serviceIdParam = searchParams.get("serviceId");
  
  const [services, setServices] = useState<Service[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [orderForm, setOrderForm] = useState({
    orderAmount: "",
    cryptocurrency: "bitcoin",
    transactionHash: "",
    deliveryAddress: "",
    specialInstructions: "",
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (!service.isAvailable) return;
    setSelectedService(service);
    setOrderDialogOpen(true);
  };

  const handleOrderSubmit = async () => {
    if (!selectedService) return;
    
    const amount = parseFloat(orderForm.orderAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid order amount");
      return;
    }

    if (!orderForm.transactionHash.trim()) {
      alert("Please enter the transaction hash from your crypto payment");
      return;
    }

    if (!orderForm.deliveryAddress.trim()) {
      alert("Please enter your delivery address");
      return;
    }

    try {
      setSubmitting(true);
      
      // Create order
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 1, // Demo user ID - replace with actual auth user
          orderType: "service",
          serviceId: selectedService.id,
          totalAmount: amount,
          paymentStatus: "pending",
          deliveryStatus: "pending",
          transactionHash: orderForm.transactionHash,
          cryptocurrencyUsed: orderForm.cryptocurrency,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const order = await orderResponse.json();
      
      // Reset form
      setOrderForm({
        orderAmount: "",
        cryptocurrency: "bitcoin",
        transactionHash: "",
        deliveryAddress: "",
        specialInstructions: "",
      });
      setOrderDialogOpen(false);
      
      // Refresh orders
      fetchMyOrders();
      
      alert(`Order placed successfully! Order ID: ${order.id}\n\nYour order is being processed. You'll be notified once payment is confirmed.`);
    } catch (err) {
      alert("Failed to place order. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            True<span className="text-primary">Services</span>
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
      <section className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/services">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Link>
        </Button>
        
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg p-8 text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-2">FOOD4LESS</h1>
          <p className="text-lg text-black/80">Get massive discounts on your favorite food delivery services</p>
        </div>

        {/* Global Discount Banner */}
        <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/20">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Limited Time Offer!</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Save up to 70% on all food delivery services. Orders processed within 24 hours!
          </AlertDescription>
        </Alert>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold mb-6">Available Services</h2>
        
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
                className={`${!service.isAvailable ? "opacity-60" : "hover:shadow-lg transition-shadow cursor-pointer"}`}
                onClick={() => handleOrderClick(service)}
              >
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
                  <div className="relative h-40 w-full rounded-md overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
                    {service.imageUrl ? (
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <ShoppingCart className="h-16 w-16 text-yellow-600" />
                    )}
                    <div className="absolute top-2 right-2 bg-yellow-400 text-black px-3 py-1 rounded-full font-bold text-sm">
                      {service.discountPercentage}% OFF
                    </div>
                  </div>
                  {service.priceLimit && (
                    <p className="text-sm text-muted-foreground text-center">
                      Orders up to <span className="font-bold">${service.priceLimit}</span>
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-500 hover:to-orange-500"
                    disabled={!service.isAvailable}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderClick(service);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Order Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Order Status Section */}
      <section className="container mx-auto px-4 pb-20">
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Orders</h2>
            <Button variant="outline" size="sm" onClick={fetchMyOrders}>
              Refresh Status
            </Button>
          </div>

          {myOrders.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Orders Yet</AlertTitle>
              <AlertDescription>
                You haven't placed any orders yet. Start by ordering from one of our services above!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {myOrders.map((order) => (
                <Card key={order.id}>
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
                        <p className="font-bold">${order.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Status</p>
                        <Badge variant={order.paymentStatus === "confirmed" ? "default" : "secondary"}>
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      {order.cryptocurrencyUsed && (
                        <div>
                          <p className="text-muted-foreground">Cryptocurrency</p>
                          <p className="font-medium capitalize">{order.cryptocurrencyUsed}</p>
                        </div>
                      )}
                      {order.transactionHash && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Transaction Hash</p>
                          <p className="font-mono text-xs truncate">{order.transactionHash}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  {order.deliveryStatus === "delivered" && (
                    <CardFooter>
                      <Button variant="outline" className="w-full">
                        Leave a Review
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Place Order - {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Complete the payment using cryptocurrency and enter the transaction details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="orderAmount">Order Amount (USD)</Label>
              <Input
                id="orderAmount"
                type="number"
                placeholder="25.00"
                value={orderForm.orderAmount}
                onChange={(e) => setOrderForm({ ...orderForm, orderAmount: e.target.value })}
              />
              {selectedService?.priceLimit && (
                <p className="text-sm text-muted-foreground">
                  Maximum: ${selectedService.priceLimit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cryptocurrency">Cryptocurrency</Label>
              <Select
                value={orderForm.cryptocurrency}
                onValueChange={(value) => setOrderForm({ ...orderForm, cryptocurrency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                  <SelectItem value="dogecoin">Dogecoin (DOGE)</SelectItem>
                  <SelectItem value="litecoin">Litecoin (LTC)</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionHash">Transaction Hash</Label>
              <Input
                id="transactionHash"
                placeholder="Enter transaction hash after payment"
                value={orderForm.transactionHash}
                onChange={(e) => setOrderForm({ ...orderForm, transactionHash: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Make the payment first, then paste the transaction hash here
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                placeholder="Enter your full delivery address"
                value={orderForm.deliveryAddress}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                placeholder="Any special requests or instructions"
                value={orderForm.specialInstructions}
                onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOrderSubmit} disabled={submitting}>
              {submitting ? "Processing..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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