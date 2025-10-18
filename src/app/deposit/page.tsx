"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { Bitcoin, ArrowLeft, Check, Loader2, Copy } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface CryptoAddress {
  id: number;
  cryptocurrency: string;
  address: string;
  is_active: boolean;
}

export default function DepositPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [step, setStep] = useState<"select" | "scan" | "verify">("select");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [cryptoAddresses, setCryptoAddresses] = useState<CryptoAddress[]>([]);
  const [currentAddress, setCurrentAddress] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in?redirect=/deposit");
    }
  }, [session, isPending, router]);

  // Fetch active crypto addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const response = await fetch("/api/crypto-addresses", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          setCryptoAddresses(data.data.filter((addr: CryptoAddress) => addr.is_active));
        }
      } catch (error) {
        console.error("Error fetching crypto addresses:", error);
        toast.error("Failed to load cryptocurrency addresses");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user) {
      fetchAddresses();
    }
  }, [session]);

  const handleCryptoSelect = async (crypto: string) => {
    setSelectedCrypto(crypto);
    const address = cryptoAddresses.find((addr) => addr.cryptocurrency === crypto);
    
    if (!address) {
      toast.error("No active address found for this cryptocurrency");
      return;
    }

    setCurrentAddress(address.address);

    // Generate QR code
    try {
      const response = await fetch("/api/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: address.address }),
      });
      const data = await response.json();
      if (data.success) {
        setQrCodeUrl(data.qrCode);
        setStep("scan");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const handleVerifyTransaction = async () => {
    if (!transactionId.trim() || !amount.trim()) {
      toast.error("Please enter both transaction ID and amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsVerifying(true);

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: session?.user?.id,
          cryptocurrency: selectedCrypto,
          amount: amountNum,
          transaction_hash: transactionId,
          status: "pending",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Transaction submitted for verification!");
        setStep("verify");
        setTimeout(() => {
          router.push("/account");
        }, 2000);
      } else {
        toast.error(data.message || "Failed to submit transaction");
      }
    } catch (error) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentAddress);
    toast.success("Address copied to clipboard!");
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

  const availableCryptos = Array.from(
    new Set(cryptoAddresses.map((addr) => addr.cryptocurrency))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-xl font-bold">Deposit Funds</h1>
          <div className="w-24"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {step === "select" && (
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-2">Select Cryptocurrency</h2>
              <p className="text-muted-foreground mb-6">
                Choose the cryptocurrency you want to deposit
              </p>

              {availableCryptos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No cryptocurrencies available at the moment
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {availableCryptos.map((crypto) => (
                    <Button
                      key={crypto}
                      variant="outline"
                      className="h-auto py-6 flex flex-col gap-2"
                      onClick={() => handleCryptoSelect(crypto)}
                    >
                      <Bitcoin className="h-8 w-8" />
                      <span className="font-semibold">{crypto}</span>
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {step === "scan" && (
            <Card className="p-8">
              <Button
                variant="ghost"
                onClick={() => setStep("select")}
                className="mb-4 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <h2 className="text-2xl font-bold mb-2">Scan QR Code</h2>
              <p className="text-muted-foreground mb-6">
                Scan this QR code with your {selectedCrypto} wallet
              </p>

              <div className="bg-white p-6 rounded-lg mb-6 flex justify-center">
                {qrCodeUrl && (
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={256}
                    height={256}
                    className="rounded"
                  />
                )}
              </div>

              <div className="mb-6">
                <Label>Wallet Address</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={currentAddress} readOnly className="font-mono text-sm" />
                  <Button onClick={copyToClipboard} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="amount">Amount Sent (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="txid">Transaction ID</Label>
                  <Input
                    id="txid"
                    placeholder="Enter transaction hash"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="mt-2 font-mono text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleVerifyTransaction}
                disabled={isVerifying}
                className="w-full"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Submit Transaction"
                )}
              </Button>

              <p className="text-sm text-muted-foreground mt-4 text-center">
                After submitting, your transaction will be verified and funds will be credited to
                your account
              </p>
            </Card>
          )}

          {step === "verify" && (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Transaction Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your transaction has been submitted for verification. You will be notified once it's
                approved and funds are credited to your account.
              </p>
              <Button onClick={() => router.push("/account")} size="lg">
                Go to Account
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}