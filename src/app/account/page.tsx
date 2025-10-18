"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import {
  ArrowLeft,
  Loader2,
  Wallet,
  ShoppingBag,
  Receipt,
  Award,
  Plus,
  Eye,
  Star,
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: number;
  cryptocurrency: string;
  amount: number;
  transaction_hash: string;
  status: string;
  created_at: string;
}

interface Order {
  id: number;
  service_type: string;
  total_amount: number;
  payment_status: string;
  delivery_status: string;
  created_at: string;
}

interface LoyaltyReward {
  id: number;
  points_earned: number;
  points_spent: number;
  description: string;
  created_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [balance, setBalance] = useState<number>(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in?redirect=/account");
    }
  }, [session, isPending, router]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");

        // Fetch user profile to get balance
        const userResponse = await fetch(`/api/users?id=${session.user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const userData = await userResponse.json();
        if (userData.success && userData.data.length > 0) {
          setBalance(userData.data[0].balance || 0);
          setLoyaltyPoints(userData.data[0].loyalty_points || 0);
        }

        // Fetch transactions
        const txResponse = await fetch(`/api/transactions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const txData = await txResponse.json();
        if (txData.success) {
          const userTx = txData.data.filter(
            (tx: Transaction) => tx.user_id === session.user.id
          );
          setTransactions(userTx);
        }

        // Fetch orders
        const ordersResponse = await fetch(`/api/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const ordersData = await ordersResponse.json();
        if (ordersData.success) {
          const userOrders = ordersData.data.filter(
            (order: Order) => order.user_id === session.user.id
          );
          setOrders(userOrders);
        }

        // Fetch loyalty rewards
        const rewardsResponse = await fetch(`/api/loyalty-rewards`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const rewardsData = await rewardsResponse.json();
        if (rewardsData.success) {
          const userRewards = rewardsData.data.filter(
            (reward: LoyaltyReward) => reward.user_id === session.user.id
          );
          setRewards(userRewards);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load account data");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
      case "completed":
      case "delivered":
        return "default";
      case "pending":
      case "processing":
        return "secondary";
      case "rejected":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const hasReview = async (orderId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/reviews`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data.some((review: any) => review.order_id === orderId);
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-xl font-bold">My Account</h1>
          <div className="w-24"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        {/* Account Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Balance</p>
                <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/deposit")}
              size="sm"
              className="w-full mt-4"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/services")}
              size="sm"
              className="w-full mt-4"
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Browse Services
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
                <p className="text-2xl font-bold">{loyaltyPoints}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Earn points with every purchase!
            </p>
          </Card>
        </div>

        {/* User Info */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{session.user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline">{session.user.role || "user"}</Badge>
            </div>
          </div>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <Receipt className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="rewards">
              <Award className="h-4 w-4 mr-2" />
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Order History</h3>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <Button
                    onClick={() => router.push("/services")}
                    className="mt-4"
                    variant="outline"
                  >
                    Browse Services
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{order.service_type}</p>
                          <Badge variant={getStatusColor(order.delivery_status)}>
                            {order.delivery_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()} at{" "}
                          {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                        {order.delivery_status === "delivered" && (
                          <Button
                            onClick={() => router.push(`/orders/${order.id}/review`)}
                            size="sm"
                            variant="outline"
                            className="mt-2"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Leave Review
                          </Button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${order.total_amount.toFixed(2)}</p>
                        <Badge variant={getStatusColor(order.payment_status)} className="mt-1">
                          {order.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Button
                    onClick={() => router.push("/deposit")}
                    className="mt-4"
                    variant="outline"
                  >
                    Make a Deposit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{tx.cryptocurrency} Deposit</p>
                          <Badge variant={getStatusColor(tx.status)}>{tx.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {tx.transaction_hash.substring(0, 20)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.created_at).toLocaleDateString()} at{" "}
                          {new Date(tx.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          +${tx.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Loyalty Rewards</h3>
              <div className="bg-primary/5 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-3xl font-bold">{loyaltyPoints}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Earn 1 point for every $1 spent on TrueServices!
                </p>
              </div>

              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No reward activity yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start making purchases to earn loyalty points!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Recent Activity</h4>
                  {rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{reward.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reward.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p
                        className={`font-bold ${
                          reward.points_earned > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {reward.points_earned > 0 ? "+" : "-"}
                        {reward.points_earned || reward.points_spent} pts
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}