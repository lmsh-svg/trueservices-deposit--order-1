"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { Bitcoin, ArrowLeft, Check, Loader2, Copy, AlertCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CryptoAddress {
  id: number;
  cryptocurrency: string;
  address: string;
  isActive: boolean;
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
        const response = await fetch("/api/crypto-addresses?isActive=true", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch addresses");
        }
        
        const data = await response.json();
        // API returns array directly, filter for active ones
        const activeAddresses = Array.isArray(data) ? data.filter((addr: CryptoAddress) => addr.isActive) : [];
        setCryptoAddresses(activeAddresses);
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
    const addressData = cryptoAddresses.find((addr) => addr.cryptocurrency === crypto);
    
    if (!addressData) {
      toast.error("No active address found for this cryptocurrency");
      return;
    }

    setCurrentAddress(addressData.address);

    // Format address as Bitcoin URI for Exodus wallet compatibility
    let formattedAddress = addressData.address;
    if (crypto === "bitcoin") {
      formattedAddress = `bitcoin:${addressData.address}`;
    }

    // Generate QR code with formatted URI
    try {
      const response = await fetch("/api/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: formattedAddress }),
      });
      const data = await response.json();
      if (data.success) {
        setQrCodeUrl(data.qrCode);
        setStep("scan");
      } else {
        throw new Error(data.message || "QR generation failed");
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
      
      // Submit transaction for verification
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          cryptocurrency: selectedCrypto,
          amount: amountNum,
          transactionHash: transactionId.trim(),
          status: "pending",
        }),
      });

      const data = await response.json();

      if (response.ok && data) {
        toast.success("Transaction submitted for verification!");
        setStep("verify");
        setTimeout(() => {
          router.push("/account");
        }, 2000);
      } else {
        // Check for duplicate transaction hash error
        if (data.code === "DUPLICATE_TRANSACTION_HASH") {
          toast.error("This transaction has already been submitted. Each transaction can only be credited once.");
        } else {
          toast.error(data.error || "Failed to submit transaction");
        }
      }
    } catch (error) {
      console.error("Error verifying transaction:", error);
      toast.error("Failed to verify transaction");
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!");
  };

  const copyFormattedUri = () => {
    const uri = selectedCrypto === "bitcoin" ? `bitcoin:${currentAddress}` : currentAddress;
    navigator.clipboard.writeText(uri);
    toast.success("Formatted address copied!");
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
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
              <h2 className="text-3xl font-bold mb-2">Select Cryptocurrency</h2>
              <p className="text-muted-foreground mb-6">
                Choose the cryptocurrency you want to deposit
              </p>

              {availableCryptos.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    There are no cryptocurrencies currently available for deposits. Please check back later or contact support.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {availableCryptos.map((crypto) => (
                    <Button
                      key={crypto}
                      variant="outline"
                      className="h-auto py-6 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary"
                      onClick={() => handleCryptoSelect(crypto)}
                    >
                      <Bitcoin className="h-8 w-8" />
                      <span className="font-semibold capitalize">{crypto}</span>
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

              <h2 className="text-3xl font-bold mb-2 capitalize">Deposit {selectedCrypto}</h2>
              <p className="text-muted-foreground mb-6">
                Scan the QR code or copy the address to send {selectedCrypto}
              </p>

              <div className="bg-white p-6 rounded-lg mb-6 flex justify-center">
                {qrCodeUrl ? (
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={256}
                    height={256}
                    className="rounded"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-muted">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>

              {selectedCrypto === "bitcoin" && (
                <Alert className="mb-6 bg-primary/10 border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <strong>Exodus Wallet Compatible:</strong> This QR code will automatically open your Exodus wallet app when scanned, with the address pre-filled.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-6">
                <Label>Wallet Address</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={currentAddress} readOnly className="font-mono text-sm" />
                  <Button onClick={() => copyToClipboard(currentAddress)} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {selectedCrypto === "bitcoin" && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs"
                    onClick={copyFormattedUri}
                  >
                    Copy formatted URI (bitcoin:{currentAddress.slice(0, 10)}...)
                  </Button>
                )}
              </div>

              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Please double-check the address before sending. Cryptocurrency transactions are non-refundable. Make sure you're sending to the correct address.
                </AlertDescription>
              </Alert>

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
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the USD value at the time you made the transaction
                  </p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    The transaction hash from your wallet
                  </p>
                </div>
              </div>

              <Button
                onClick={handleVerifyTransaction}
                disabled={isVerifying}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Transaction for Verification"
                )}
              </Button>

              <p className="text-sm text-muted-foreground mt-4 text-center">
                Your transaction will be verified using mempool data. Credits will be added based on the USD value at the time of your transaction. Each transaction can only be credited once.
              </p>
            </Card>
          )}

          {step === "verify" && (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Transaction Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your transaction has been submitted for verification. You will be notified once it's approved and funds are credited to your account based on the USD conversion rate at the time of your transaction.
              </p>
              <Button onClick={() => router.push("/account")} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Go to Account
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}