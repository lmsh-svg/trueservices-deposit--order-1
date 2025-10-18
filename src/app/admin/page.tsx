"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  ArrowLeft, 
  Bitcoin, 
  CheckCircle, 
  Copy, 
  Edit, 
  LogOut, 
  Package, 
  Plus, 
  RefreshCw, 
  Settings, 
  ShoppingBag, 
  Trash2,
  Wallet,
  XCircle,
  Tag,
  Percent,
  DollarSign
} from "lucide-react";
import { useSession, authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface CryptoAddress {
  id: number;
  cryptocurrency: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: number;
  userId: number;
  orderType: string;
  serviceId: number | null;
  totalAmount: number;
  paymentStatus: string;
  deliveryStatus: string;
  transactionHash: string | null;
  cryptocurrencyUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: number;
  name: string;
  category: string;
  description: string | null;
  isAvailable: boolean;
  discountPercentage: number;
  priceLimit: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: number;
  userId: number;
  cryptocurrency: string;
  amount: number;
  transactionHash: string;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  expiresAt: string | null;
}

interface ProfitMargin {
  id: number;
  productId: number;
  adminDiscountPercentage: number;
  customerDiscountPercentage: number;
}

interface OrderAttachment {
  id: number;
  orderId: number;
  fileUrl: string;
  fileType: string;
  uploadedByAdminId: number | null;
}

export default function AdminDashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [cryptoAddresses, setCryptoAddresses] = useState<CryptoAddress[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [profitMargins, setProfitMargins] = useState<ProfitMargin[]>([]);
  const [orderAttachments, setOrderAttachments] = useState<OrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [cryptoDialogOpen, setCryptoDialogOpen] = useState(false);
  const [editingCrypto, setEditingCrypto] = useState<CryptoAddress | null>(null);
  const [cryptoForm, setCryptoForm] = useState({
    cryptocurrency: "bitcoin",
    address: "",
    isActive: true,
  });

  // Service dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    discountPercentage: 0,
    priceLimit: 0,
    imageUrl: "",
  });

  // Variant dialog state
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState({
    productId: 10, // Speedway Gas
    denomination: 0,
    customerPrice: 0,
    adminCost: 0,
    stockQuantity: 0,
  });

  // Discount code dialog state
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [discountForm, setDiscountForm] = useState({
    code: "",
    discountPercentage: 0,
    isActive: true,
    productId: null as number | null,
    expiresAt: null as string | null,
  });

  // Profit margin dialog state
  const [marginDialogOpen, setMarginDialogOpen] = useState(false);
  const [marginForm, setMarginForm] = useState({
    productId: 10,
    adminDiscountPercentage: 36,
    customerDiscountPercentage: 30,
  });

  // Attachment dialog state
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachmentForm, setAttachmentForm] = useState({
    orderId: 0,
    fileUrl: "",
    fileType: "pdf",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCryptoAddresses(),
        fetchOrders(),
        fetchServices(),
        fetchTransactions(),
        fetchProductVariants(),
        fetchDiscountCodes(),
        fetchProfitMargins(),
        fetchOrderAttachments(),
      ]);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCryptoAddresses = async () => {
    const response = await fetch("/api/crypto-addresses?limit=100");
    if (!response.ok) throw new Error("Failed to fetch crypto addresses");
    const data = await response.json();
    setCryptoAddresses(data);
  };

  const fetchOrders = async () => {
    const response = await fetch("/api/orders?limit=100");
    if (!response.ok) throw new Error("Failed to fetch orders");
    const data = await response.json();
    setOrders(data);
  };

  const fetchServices = async () => {
    const response = await fetch("/api/services?limit=100");
    if (!response.ok) throw new Error("Failed to fetch services");
    const data = await response.json();
    setServices(data);
  };

  const fetchTransactions = async () => {
    const response = await fetch("/api/transactions?limit=100");
    if (!response.ok) throw new Error("Failed to fetch transactions");
    const data = await response.json();
    setTransactions(data);
  };

  const fetchProductVariants = async () => {
    const response = await fetch("/api/product-variants?limit=100");
    if (!response.ok) throw new Error("Failed to fetch variants");
    const data = await response.json();
    setProductVariants(data);
  };

  const fetchDiscountCodes = async () => {
    const response = await fetch("/api/discount-codes?limit=100");
    if (!response.ok) throw new Error("Failed to fetch discount codes");
    const data = await response.json();
    setDiscountCodes(data);
  };

  const fetchProfitMargins = async () => {
    const response = await fetch("/api/profit-margins?limit=100");
    if (!response.ok) throw new Error("Failed to fetch profit margins");
    const data = await response.json();
    setProfitMargins(data);
  };

  const fetchOrderAttachments = async () => {
    const response = await fetch("/api/order-attachments?limit=100");
    if (!response.ok) throw new Error("Failed to fetch attachments");
    const data = await response.json();
    setOrderAttachments(data);
  };

  const handleSignOut = async () => {
    const token = localStorage.getItem("bearer_token");
    await authClient.signOut({
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  const handleSaveCryptoAddress = async () => {
    try {
      if (editingCrypto) {
        // Update existing
        const response = await fetch(`/api/crypto-addresses?id=${editingCrypto.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cryptoForm),
        });
        if (!response.ok) throw new Error("Failed to update");
      } else {
        // Create new
        const response = await fetch("/api/crypto-addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cryptoForm),
        });
        if (!response.ok) throw new Error("Failed to create");
      }
      await fetchCryptoAddresses();
      setCryptoDialogOpen(false);
      setEditingCrypto(null);
      setCryptoForm({ cryptocurrency: "bitcoin", address: "", isActive: true });
    } catch (err) {
      alert("Failed to save crypto address");
    }
  };

  const handleDeleteCryptoAddress = async (id: number) => {
    if (!confirm("Are you sure you want to delete this crypto address?")) return;
    try {
      const response = await fetch(`/api/crypto-addresses?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      await fetchCryptoAddresses();
    } catch (err) {
      alert("Failed to delete crypto address");
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: number,
    field: "paymentStatus" | "deliveryStatus",
    value: string
  ) => {
    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error("Failed to update");
      await fetchOrders();
    } catch (err) {
      alert("Failed to update order status");
    }
  };

  const handleToggleServiceAvailability = async (serviceId: number, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/services?id=${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });
      if (!response.ok) throw new Error("Failed to update");
      await fetchServices();
    } catch (err) {
      alert("Failed to update service availability");
    }
  };

  const handleVerifyTransaction = async (transactionId: number) => {
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "verified" }),
      });
      if (!response.ok) throw new Error("Failed to verify");
      await fetchTransactions();
    } catch (err) {
      alert("Failed to verify transaction");
    }
  };

  // Service handlers
  const handleSaveService = async () => {
    if (!editingService) return;
    
    try {
      const response = await fetch(`/api/services?id=${editingService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceForm.name,
          discountPercentage: serviceForm.discountPercentage,
          priceLimit: serviceForm.priceLimit || null,
          imageUrl: serviceForm.imageUrl || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast.success("Service updated successfully");
      await fetchServices();
      setServiceDialogOpen(false);
      setEditingService(null);
      setServiceForm({ name: "", discountPercentage: 0, priceLimit: 0, imageUrl: "" });
    } catch (err) {
      toast.error("Failed to save service");
    }
  };

  // Variant handlers
  const handleSaveVariant = async () => {
    try {
      if (editingVariant) {
        const response = await fetch(`/api/product-variants?id=${editingVariant.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variantForm),
        });
        if (!response.ok) throw new Error("Failed to update");
        toast.success("Variant updated successfully");
      } else {
        const response = await fetch("/api/product-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variantForm),
        });
        if (!response.ok) throw new Error("Failed to create");
        toast.success("Variant created successfully");
      }
      await fetchProductVariants();
      setVariantDialogOpen(false);
      setEditingVariant(null);
      setVariantForm({ productId: 10, denomination: 0, customerPrice: 0, adminCost: 0, stockQuantity: 0 });
    } catch (err) {
      toast.error("Failed to save variant");
    }
  };

  const handleDeleteVariant = async (id: number) => {
    if (!confirm("Are you sure you want to delete this variant?")) return;
    try {
      const response = await fetch(`/api/product-variants?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Variant deleted successfully");
      await fetchProductVariants();
    } catch (err) {
      toast.error("Failed to delete variant");
    }
  };

  // Discount code handlers
  const handleSaveDiscount = async () => {
    try {
      if (editingDiscount) {
        const response = await fetch(`/api/discount-codes?id=${editingDiscount.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discountForm),
        });
        if (!response.ok) throw new Error("Failed to update");
        toast.success("Discount code updated successfully");
      } else {
        const response = await fetch("/api/discount-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discountForm),
        });
        if (!response.ok) throw new Error("Failed to create");
        toast.success("Discount code created successfully");
      }
      await fetchDiscountCodes();
      setDiscountDialogOpen(false);
      setEditingDiscount(null);
      setDiscountForm({ code: "", discountPercentage: 0, isActive: true, productId: null, expiresAt: null });
    } catch (err) {
      toast.error("Failed to save discount code");
    }
  };

  const handleDeleteDiscount = async (id: number) => {
    if (!confirm("Are you sure you want to delete this discount code?")) return;
    try {
      const response = await fetch(`/api/discount-codes?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Discount code deleted successfully");
      await fetchDiscountCodes();
    } catch (err) {
      toast.error("Failed to delete discount code");
    }
  };

  // Profit margin handlers
  const handleSaveMargin = async () => {
    try {
      const existing = profitMargins.find(m => m.productId === marginForm.productId);
      if (existing) {
        const response = await fetch(`/api/profit-margins?id=${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(marginForm),
        });
        if (!response.ok) throw new Error("Failed to update");
        toast.success("Profit margin updated successfully");
      } else {
        const response = await fetch("/api/profit-margins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(marginForm),
        });
        if (!response.ok) throw new Error("Failed to create");
        toast.success("Profit margin created successfully");
      }
      await fetchProfitMargins();
      setMarginDialogOpen(false);
    } catch (err) {
      toast.error("Failed to save profit margin");
    }
  };

  // Attachment handlers
  const handleSaveAttachment = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/order-attachments", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...attachmentForm,
          uploadedByAdminId: session?.user?.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to upload");
      toast.success("Attachment uploaded successfully");
      await fetchOrderAttachments();
      setAttachmentDialogOpen(false);
      setAttachmentForm({ orderId: 0, fileUrl: "", fileType: "pdf" });
    } catch (err) {
      toast.error("Failed to upload attachment");
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <Badge variant="outline" className="border-primary/40 text-primary">Admin</Badge>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your TrueServices platform</p>
          </div>
          <Button onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </section>

      {/* Dashboard Content */}
      <section className="container mx-auto px-4 pb-20">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="orders">
              <Package className="mr-2 h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="variants">
              <Tag className="mr-2 h-4 w-4" />
              Variants
            </TabsTrigger>
            <TabsTrigger value="discounts">
              <Percent className="mr-2 h-4 w-4" />
              Discounts
            </TabsTrigger>
            <TabsTrigger value="margins">
              <DollarSign className="mr-2 h-4 w-4" />
              Margins
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Package className="mr-2 h-4 w-4" />
              Attachments
            </TabsTrigger>
            <TabsTrigger value="crypto">
              <Wallet className="mr-2 h-4 w-4" />
              Crypto
            </TabsTrigger>
            <TabsTrigger value="services">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>View and manage customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Delivery Status</TableHead>
                      <TableHead>Crypto Used</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Select
                            value={order.paymentStatus}
                            onValueChange={(value) =>
                              handleUpdateOrderStatus(order.id, "paymentStatus", value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.deliveryStatus}
                            onValueChange={(value) =>
                              handleUpdateOrderStatus(order.id, "deliveryStatus", value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="in_transit">In Transit</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.cryptocurrencyUsed || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Variants Tab */}
          <TabsContent value="variants" className="space-y-4">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>Manage different card denominations and pricing</CardDescription>
                  </div>
                  <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingVariant(null);
                        setVariantForm({ productId: 10, denomination: 0, customerPrice: 0, adminCost: 0, stockQuantity: 0 });
                      }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Variant
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingVariant ? "Edit" : "Add"} Product Variant</DialogTitle>
                        <DialogDescription>Configure card denomination and pricing</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Denomination ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variantForm.denomination}
                            onChange={(e) => setVariantForm({ ...variantForm, denomination: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Customer Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variantForm.customerPrice}
                            onChange={(e) => setVariantForm({ ...variantForm, customerPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Admin Cost ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variantForm.adminCost}
                            onChange={(e) => setVariantForm({ ...variantForm, adminCost: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stock Quantity</Label>
                          <Input
                            type="number"
                            value={variantForm.stockQuantity}
                            onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveVariant} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Denomination</TableHead>
                      <TableHead>Customer Price</TableHead>
                      <TableHead>Admin Cost</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productVariants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">${variant.denomination.toFixed(2)}</TableCell>
                        <TableCell className="text-primary">${variant.customerPrice.toFixed(2)}</TableCell>
                        <TableCell>${variant.adminCost.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={variant.stockQuantity > 0 ? "default" : "secondary"}>
                            {variant.stockQuantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingVariant(variant);
                                setVariantForm({
                                  productId: variant.productId,
                                  denomination: variant.denomination,
                                  customerPrice: variant.customerPrice,
                                  adminCost: variant.adminCost,
                                  stockQuantity: variant.stockQuantity,
                                });
                                setVariantDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteVariant(variant.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discount Codes Tab */}
          <TabsContent value="discounts" className="space-y-4">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Discount Codes</CardTitle>
                    <CardDescription>Create and manage promotional codes</CardDescription>
                  </div>
                  <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingDiscount(null);
                        setDiscountForm({ code: "", discountPercentage: 0, isActive: true, productId: null, expiresAt: null });
                      }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingDiscount ? "Edit" : "Add"} Discount Code</DialogTitle>
                        <DialogDescription>Configure promotional discount code</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input
                            placeholder="e.g., SAVE10"
                            value={discountForm.code}
                            onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Discount Percentage</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={discountForm.discountPercentage}
                            onChange={(e) => setDiscountForm({ ...discountForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={discountForm.isActive}
                            onCheckedChange={(checked) => setDiscountForm({ ...discountForm, isActive: checked })}
                          />
                          <Label>Active</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDiscount} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold text-primary">{code.code}</TableCell>
                        <TableCell>{code.discountPercentage}%</TableCell>
                        <TableCell>
                          <Badge variant={code.isActive ? "default" : "secondary"}>
                            {code.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDiscount(code);
                                setDiscountForm({
                                  code: code.code,
                                  discountPercentage: code.discountPercentage,
                                  isActive: code.isActive,
                                  productId: code.productId,
                                  expiresAt: code.expiresAt,
                                });
                                setDiscountDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteDiscount(code.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit Margins Tab */}
          <TabsContent value="margins" className="space-y-4">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Profit Margins</CardTitle>
                    <CardDescription>Adjust admin and customer discount percentages</CardDescription>
                  </div>
                  <Dialog open={marginDialogOpen} onOpenChange={setMarginDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Settings className="mr-2 h-4 w-4" />
                        Adjust Margins
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Profit Margin Settings</DialogTitle>
                        <DialogDescription>Configure discount percentages for Speedway Gas</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Admin Discount (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={marginForm.adminDiscountPercentage}
                            onChange={(e) => setMarginForm({ ...marginForm, adminDiscountPercentage: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Your discount from supplier</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Customer Discount (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={marginForm.customerDiscountPercentage}
                            onChange={(e) => setMarginForm({ ...marginForm, customerDiscountPercentage: parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-muted-foreground">Discount offered to customers</p>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg">
                          <p className="text-sm font-medium">Profit Margin:</p>
                          <p className="text-2xl font-bold text-primary">
                            {(marginForm.adminDiscountPercentage - marginForm.customerDiscountPercentage).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setMarginDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveMargin} className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Admin Discount</TableHead>
                      <TableHead>Customer Discount</TableHead>
                      <TableHead>Profit Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitMargins.map((margin) => (
                      <TableRow key={margin.id}>
                        <TableCell className="font-medium">Speedway Gas</TableCell>
                        <TableCell>{margin.adminDiscountPercentage}%</TableCell>
                        <TableCell>{margin.customerDiscountPercentage}%</TableCell>
                        <TableCell>
                          <Badge className="bg-primary text-primary-foreground">
                            {(margin.adminDiscountPercentage - margin.customerDiscountPercentage).toFixed(2)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Attachments Tab */}
          <TabsContent value="attachments" className="space-y-4">
            <Card className="border-border/40 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order Attachments</CardTitle>
                    <CardDescription>Upload PDFs for completed gift card orders</CardDescription>
                  </div>
                  <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Upload Attachment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Order Attachment</DialogTitle>
                        <DialogDescription>Attach PDF gift card to an order</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Order ID</Label>
                          <Input
                            type="number"
                            value={attachmentForm.orderId}
                            onChange={(e) => setAttachmentForm({ ...attachmentForm, orderId: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>File URL</Label>
                          <Input
                            placeholder="https://..."
                            value={attachmentForm.fileUrl}
                            onChange={(e) => setAttachmentForm({ ...attachmentForm, fileUrl: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">URL to the PDF gift card file</p>
                        </div>
                        <div className="space-y-2">
                          <Label>File Type</Label>
                          <Select
                            value={attachmentForm.fileType}
                            onValueChange={(value) => setAttachmentForm({ ...attachmentForm, fileType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAttachmentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAttachment} className="bg-primary text-primary-foreground hover:bg-primary/90">Upload</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>File Type</TableHead>
                      <TableHead>File URL</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderAttachments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No attachments uploaded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderAttachments.map((attachment) => (
                        <TableRow key={attachment.id}>
                          <TableCell className="font-medium">#{attachment.orderId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{attachment.fileType.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell>
                            <a
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              View File
                            </a>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {attachment.uploadedByAdminId ? `Admin #${attachment.uploadedByAdminId}` : "System"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Crypto Addresses Tab */}
          <TabsContent value="crypto" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cryptocurrency Addresses</CardTitle>
                    <CardDescription>Manage wallet addresses for payments</CardDescription>
                  </div>
                  <Dialog open={cryptoDialogOpen} onOpenChange={setCryptoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingCrypto(null);
                        setCryptoForm({ cryptocurrency: "bitcoin", address: "", isActive: true });
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Address
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCrypto ? "Edit" : "Add"} Crypto Address
                        </DialogTitle>
                        <DialogDescription>
                          Configure a cryptocurrency wallet address for receiving payments
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Cryptocurrency</Label>
                          <Select
                            value={cryptoForm.cryptocurrency}
                            onValueChange={(value) =>
                              setCryptoForm({ ...cryptoForm, cryptocurrency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                          <Label>Wallet Address</Label>
                          <Input
                            placeholder="Enter wallet address"
                            value={cryptoForm.address}
                            onChange={(e) =>
                              setCryptoForm({ ...cryptoForm, address: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={cryptoForm.isActive}
                            onCheckedChange={(checked) =>
                              setCryptoForm({ ...cryptoForm, isActive: checked })
                            }
                          />
                          <Label>Active</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCryptoDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCryptoAddress}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cryptocurrency</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptoAddresses.map((crypto) => (
                      <TableRow key={crypto.id}>
                        <TableCell className="font-medium capitalize">
                          {crypto.cryptocurrency}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {crypto.address.slice(0, 20)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(crypto.address);
                                alert("Address copied!");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={crypto.isActive ? "default" : "secondary"}>
                            {crypto.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCrypto(crypto);
                                setCryptoForm({
                                  cryptocurrency: crypto.cryptocurrency,
                                  address: crypto.address,
                                  isActive: crypto.isActive,
                                });
                                setCryptoDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCryptoAddress(crypto.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Management</CardTitle>
                <CardDescription>Control service availability and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Price Limit</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell className="capitalize">{service.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{service.discountPercentage}%</Badge>
                        </TableCell>
                        <TableCell>
                          {service.priceLimit ? `$${service.priceLimit}` : "No limit"}
                        </TableCell>
                        <TableCell>
                          {service.imageUrl ? (
                            <Badge variant="secondary">Set</Badge>
                          ) : (
                            <Badge variant="outline">None</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={service.isAvailable}
                            onCheckedChange={(checked) =>
                              handleToggleServiceAvailability(service.id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingService(service);
                              setServiceForm({
                                name: service.name,
                                discountPercentage: service.discountPercentage,
                                priceLimit: service.priceLimit || 0,
                                imageUrl: service.imageUrl || "",
                              });
                              setServiceDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Service Edit Dialog */}
            <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Service</DialogTitle>
                  <DialogDescription>Update service details and pricing</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Service Name</Label>
                    <Input
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Percentage (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={serviceForm.discountPercentage}
                      onChange={(e) => setServiceForm({ ...serviceForm, discountPercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Limit ($) - Optional</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Leave 0 for no limit"
                      value={serviceForm.priceLimit}
                      onChange={(e) => setServiceForm({ ...serviceForm, priceLimit: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL - Optional</Label>
                    <Input
                      placeholder="https://..."
                      value={serviceForm.imageUrl}
                      onChange={(e) => setServiceForm({ ...serviceForm, imageUrl: e.target.value })}
                    />
                    {serviceForm.imageUrl && (
                      <p className="text-xs text-muted-foreground">Preview image in services page</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveService} className="bg-primary text-primary-foreground hover:bg-primary/90">Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Verification</CardTitle>
                <CardDescription>Verify and manage cryptocurrency transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Crypto</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Transaction Hash</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">#{transaction.id}</TableCell>
                        <TableCell>User #{transaction.userId}</TableCell>
                        <TableCell className="capitalize">{transaction.cryptocurrency}</TableCell>
                        <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {transaction.transactionHash.slice(0, 16)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === "verified"
                                ? "default"
                                : transaction.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyTransaction(transaction.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Verify
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}