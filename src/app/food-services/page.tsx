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
import { Upload, Check, X, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    streetAddress: "",
    streetAddress2: "",
    city: "",
    state: "",
    postalCode: "",
    restaurantName: "",
    driverTip: "0.00",
    orderAmount: "",
    orderNotes: "",
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

    if (!orderForm.streetAddress.trim() || !orderForm.city.trim() || !orderForm.state.trim() || !orderForm.postalCode.trim()) {
      toast.error("Please fill in all address fields");
      return;
    }

    if (!orderForm.restaurantName.trim()) {
      toast.error("Please enter the restaurant name");
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

    try {
      setSubmitting(true);
      const token = localStorage.getItem("bearer_token");
      
      const discountedAmount = amount * (1 - selectedService.discountPercentage / 100);
      const driverTipAmount = parseFloat(orderForm.driverTip) || 0;
      
      const fullAddress = `${orderForm.streetAddress}${orderForm.streetAddress2 ? ', ' + orderForm.streetAddress2 : ''}, ${orderForm.city}, ${orderForm.state} ${orderForm.postalCode}`;
      
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
          totalAmount: discountedAmount + driverTipAmount,
          paymentStatus: "pending",
          deliveryStatus: "pending",
          specialInstructions: `Restaurant: ${orderForm.restaurantName}\nCart Screenshot: ${cartImageUrl}\nCheckout Screenshot: ${checkoutImageUrl}\nOriginal Amount: $${amount}\nDriver Tip: $${driverTipAmount}\nDelivery Address: ${fullAddress}\nOrder Notes: ${orderForm.orderNotes}`,
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
        streetAddress: "",
        streetAddress2: "",
        city: "",
        state: "",
        postalCode: "",
        restaurantName: "",
        driverTip: "0.00",
        orderAmount: "",
        orderNotes: "",
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
      // Default browse links based on service name
      const serviceName = service.name.toLowerCase();
      if (serviceName.includes('ubereats') || serviceName.includes('uber eats')) {
        window.open('https://www.ubereats.com', '_blank', 'noopener,noreferrer');
      } else if (serviceName.includes('doordash')) {
        window.open('https://www.doordash.com', '_blank', 'noopener,noreferrer');
      } else if (serviceName.includes('grubhub')) {
        window.open('https://www.grubhub.com', '_blank', 'noopener,noreferrer');
      } else {
        toast.error("Browse link not available for this service");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone FOOD4LESS Header */}
      <header className="w-full bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#d4af37] py-6 px-4 text-center shadow-lg">
        <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight">FOOD4LESS</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
          <span className="text-sm md:text-base font-semibold text-zinc-800">Service is currently OPEN</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-xl md:text-2xl font-semibold text-foreground mb-2">
          Get your favorite food for less with TRUE Services.
        </p>
        <p className="text-lg md:text-xl text-primary font-bold mb-2">
          Easy. Reliable. 100% TRUE.
        </p>
        <p className="text-base md:text-lg text-muted-foreground">
          Save up to 50% on your next meal.
        </p>
      </section>

      {/* How It Works - 2 Steps */}
      <section className="container max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Step 1 */}
          <div className="bg-card border-2 border-primary/20 rounded-xl p-6 hover:shadow-lg transition-all">
            <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-black text-primary-foreground">1</span>
            </div>
            <h3 className="font-bold text-xl mb-3 text-center">Browse & Add to Cart</h3>
            <p className="text-muted-foreground text-center text-sm">
              Browse your favorite delivery app (DoorDash, Uber Eats, etc.) and add items to your cart
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-card border-2 border-primary/20 rounded-xl p-6 hover:shadow-lg transition-all">
            <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-black text-primary-foreground">2</span>
            </div>
            <h3 className="font-bold text-xl mb-3 text-center">Screenshot & Save!</h3>
            <p className="text-muted-foreground text-center text-sm">
              Take screenshots of your cart and checkout, submit your order, and we'll apply massive discounts!
            </p>
          </div>
        </div>
      </section>

      {/* Available Services */}
      <section className="container max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Available Services</h2>
        
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-card rounded-xl border-2 overflow-hidden transition-all ${
                  service.isAvailable 
                    ? 'border-border hover:border-primary hover:shadow-xl shadow-primary/10' 
                    : 'border-border/30 opacity-50'
                }`}
              >
                {/* Header with Status */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-center justify-between">
                  <h3 className="font-bold text-base flex-1">{service.name}</h3>
                  <Badge 
                    className={service.isAvailable 
                      ? "bg-green-600 hover:bg-green-600 text-white" 
                      : "bg-red-600 hover:bg-red-600 text-white"
                    }
                  >
                    {service.isAvailable ? (
                      <><Check className="h-3 w-3 mr-1" />Available</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" />Unavailable</>
                    )}
                  </Badge>
                </div>

                {/* Discount Badge */}
                <div className="bg-primary text-primary-foreground text-center py-3">
                  <p className="text-2xl font-black">{service.discountPercentage}% OFF</p>
                </div>

                {/* Service Limit */}
                <div className="px-4 py-3 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    {service.priceLimit ? `$${service.priceLimit} Subtotal Max` : 'No Limit'} • Delivery Only
                  </p>
                </div>

                {/* Buttons */}
                <div className="p-4 space-y-2">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 font-bold h-11"
                    onClick={() => handleOrderClick(service)}
                    disabled={!service.isAvailable}
                  >
                    Place Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground h-11"
                    onClick={() => handleBrowseClick(service)}
                  >
                    Browse
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Service Status */}
      <section className="container max-w-3xl mx-auto px-4 py-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold text-center mb-6">Status</h2>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">{service.name}:</span>
                <Badge className={service.isAvailable ? "bg-green-600" : "bg-red-600"}>
                  {service.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Terms */}
      <section className="container max-w-4xl mx-auto px-4 py-6">
        <div className="bg-yellow-500/10 border-l-4 border-yellow-500 rounded p-4">
          <p className="text-sm">
            <span className="font-bold">🔔 Terms:</span> Not liable for restaurant/driver errors. No refunds unless order is incorrect due to our mistake. Full policy applies.
          </p>
        </div>
      </section>

      {/* Order Dialog - Updated with separate fields */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold">
              {selectedService?.name} Order Form
            </DialogTitle>
            <DialogDescription>
              {selectedService?.name} - {selectedService?.discountPercentage}% OFF • ${selectedService?.priceLimit} Subtotal Max • Delivery Only
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Need Help Link */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">Need Help?</span>{" "}
                <a href="#" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
                  Click Here
                </a>
              </AlertDescription>
            </Alert>

            {/* Browse Button */}
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleBrowseClick(selectedService!)}
                className="w-full font-bold"
              >
                🔍 Browse {selectedService?.name.split(' - ')[0]} First
              </Button>
            </div>

            {/* Address Section */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-bold">Address *</Label>
              
              <div>
                <Input
                  placeholder="Street Address"
                  value={orderForm.streetAddress}
                  onChange={(e) => setOrderForm({ ...orderForm, streetAddress: e.target.value })}
                  className="mb-2"
                />
                <Input
                  placeholder="Street Address Line 2"
                  value={orderForm.streetAddress2}
                  onChange={(e) => setOrderForm({ ...orderForm, streetAddress2: e.target.value })}
                  className="mb-2"
                />
                <Input
                  placeholder="City"
                  value={orderForm.city}
                  onChange={(e) => setOrderForm({ ...orderForm, city: e.target.value })}
                  className="mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="State / Province"
                    value={orderForm.state}
                    onChange={(e) => setOrderForm({ ...orderForm, state: e.target.value })}
                  />
                  <Input
                    placeholder="Postal / Zip Code"
                    value={orderForm.postalCode}
                    onChange={(e) => setOrderForm({ ...orderForm, postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Restaurant Name */}
            <div>
              <Label htmlFor="restaurant" className="text-base font-bold">Restaurant Name *</Label>
              <Input
                id="restaurant"
                placeholder="Enter restaurant name"
                value={orderForm.restaurantName}
                onChange={(e) => setOrderForm({ ...orderForm, restaurantName: e.target.value })}
                className="mt-2"
              />
            </div>

            {/* Driver Tip */}
            <div>
              <Label htmlFor="tip" className="text-base font-bold">Driver Tip:</Label>
              <Input
                id="tip"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={orderForm.driverTip}
                onChange={(e) => setOrderForm({ ...orderForm, driverTip: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: 100% of your tip goes directly to the driver, with no deductions.
              </p>
            </div>

            {/* Screenshots Section */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="font-bold text-base mb-2">Upload Your {selectedService?.name.split(' - ')[0]} Screenshots</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  To process your order, we need two screenshots from your {selectedService?.name.split(' - ')[0]} app: one showing your cart items and another showing the checkout total.
                </p>
              </div>

              {/* Cart Screenshot */}
              <div>
                <Label className="text-base font-bold block mb-2">1. Cart Screenshot</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Open your {selectedService?.name.split(' - ')[0]} cart, ensure all items are visible, and take a screenshot.
                </p>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
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
                        <p className="text-sm text-primary font-medium">✓ Uploaded - Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-6">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="font-medium">Upload Screenshot</p>
                        <p className="text-xs text-muted-foreground">Drag and drop files here</p>
                        <p className="text-xs text-muted-foreground">No file chosen</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Checkout Screenshot */}
              <div>
                <Label className="text-base font-bold block mb-2">2. Checkout Total Screenshot</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Proceed to the {selectedService?.name.split(' - ')[0]} checkout page, ensure the total (including fees and taxes) is visible, and take a screenshot.
                </p>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
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
                        <p className="text-sm text-primary font-medium">✓ Uploaded - Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-6">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="font-medium">Upload Screenshot</p>
                        <p className="text-xs text-muted-foreground">Drag and drop files here</p>
                        <p className="text-xs text-muted-foreground">No file chosen</p>
                      </div>
                    )}
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Please provide a screenshot of your {selectedService?.name.split(' - ')[0]} checkout page, ensuring the total (including taxes and fees) is clearly visible.
                </p>
              </div>

              {/* Order Amount */}
              <div>
                <Label htmlFor="amount" className="text-base font-bold">Order Subtotal (from cart screenshot) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={orderForm.orderAmount}
                  onChange={(e) => setOrderForm({ ...orderForm, orderAmount: e.target.value })}
                  className="mt-2 text-lg h-12"
                />
                {selectedService && orderForm.orderAmount && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Original Subtotal:</span>
                      <span className="line-through">${parseFloat(orderForm.orderAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="font-semibold text-green-700 dark:text-green-400">Your Savings ({selectedService.discountPercentage}%):</span>
                      <span className="font-bold text-green-700 dark:text-green-400">
                        -${(parseFloat(orderForm.orderAmount) * selectedService.discountPercentage / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-base font-bold mt-2 pt-2 border-t border-green-300 dark:border-green-800">
                      <span>You Pay:</span>
                      <span className="text-primary text-xl">
                        ${(parseFloat(orderForm.orderAmount) * (1 - selectedService.discountPercentage / 100) + parseFloat(orderForm.driverTip || "0")).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Important Warning */}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Important:</strong> Any attempt to falsify your total will be detected and may result in a permanent ban from our services. Please provide accurate screenshots to avoid delays.
                </AlertDescription>
              </Alert>

              {/* Tip */}
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-xs">
                  <strong>🔔 Tip:</strong> For best results, take screenshots in a well-lit environment and ensure all text is legible. Use the {selectedService?.name.split(' - ')[0]} app, not the website.
                </AlertDescription>
              </Alert>
            </div>

            {/* Order Notes */}
            <div>
              <Label htmlFor="notes" className="text-base font-bold">Order Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Notes about your order, e.g. special notes for delivery."
                value={orderForm.orderNotes}
                onChange={(e) => setOrderForm({ ...orderForm, orderNotes: e.target.value })}
                rows={3}
                className="mt-2 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOrderSubmit} 
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 font-bold px-8"
              size="lg"
            >
              {submitting ? "Processing..." : "PLACE ORDER"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer with TrueServices Logo */}
      <footer className="border-t border-border/40 bg-muted/20 mt-12">
        <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground mb-4">
            © 2025 Affordable Eats. Powered by passion. Not affiliated with any third-party delivery services.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Need Help? Message Support on Telegram
          </p>
          
          {/* Back to TrueServices with Logo */}
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <Image
              src="https://files.jotform.com/jufs/TRUEServiceSupport/form_files/trueservicestransparent.67f010b8679bd1.07484258.png?md5=iFg1NnHrukcAtXkiT2Ci5Q&expires=1760754468"
              alt="TrueServices Logo"
              width={80}
              height={80}
              className="object-contain group-hover:scale-110 transition-transform"
              unoptimized
            />
            <span className="text-sm font-medium text-primary group-hover:underline">
              ← Return to TrueServices
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}