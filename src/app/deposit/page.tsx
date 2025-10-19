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
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedAmount, setDetectedAmount] = useState<number | null>(null);
  const [detectedConfirmations, setDetectedConfirmations] = useState<number>(0);

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
        const activeAddresses = Array.isArray(data) ? data.filter((addr: CryptoAddress) => addr.isActive) : [];
        setCryptoAddresses(activeAddresses);
      } catch (error) {
        console.error("Error fetching crypto addresses:", error);
        toast.error("Failed to load cryptocurrency addresses");
      } finally {
        setIsLoading(false);
      }
    };

    if (!session?.user) {
      setIsLoading(false);
      return;
    }
    
    fetchAddresses();
  }, [session]);

  const handleCryptoSelect = async (crypto: string) => {
    setSelectedCrypto(crypto);
    const addressData = cryptoAddresses.find((addr) => addr.cryptocurrency === crypto);
    
    if (!addressData) {
      toast.error("No active address found for this cryptocurrency");
      return;
    }

    setCurrentAddress(addressData.address);

    let formattedAddress = addressData.address;
    if (crypto === "bitcoin") {
      formattedAddress = `bitcoin:${addressData.address}`;
    }

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
    if (!transactionId.trim()) {
      toast.error("Please enter transaction ID");
      return;
    }

    setIsVerifying(true);
    setDetectedAmount(null);
    setDetectedConfirmations(0);

    try {
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/transactions/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionHash: transactionId.trim(),
          cryptocurrency: selectedCrypto,
          userId: session?.user?.id,
          targetAddress: currentAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDetectedAmount(data.usdAmount);
        setDetectedConfirmations(data.confirmations);
        
        if (data.confirmations >= 2) {
          toast.success(`Transaction verified! ${data.usdAmount.toFixed(2)} USD will be credited to your account.`);
          setStep("verify");
          setTimeout(() => {
            router.push("/account");
          }, 2000);
        } else {
          toast.info(`Transaction detected with ${data.confirmations} confirmation(s). Waiting for 2+ confirmations...`);
        }
      } else {
        if (data.code === "DUPLICATE_TRANSACTION") {
          toast.error("This transaction has already been submitted.");
        } else if (data.code === "INSUFFICIENT_CONFIRMATIONS") {
          toast.error(`Transaction needs ${data.required - data.current} more confirmation(s).`);
        } else {
          toast.error(data.error || "Failed to verify transaction");
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
                    <strong>Exodus Wallet Compatible:</strong> This QR code will automatically open your Exodus wallet app when scanned.
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
                  <strong>Important:</strong> Cryptocurrency transactions are non-refundable. Double-check the address before sending.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 mb-6">
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

                {detectedAmount !== null && (
                  <Alert className="bg-primary/10 border-primary/20">
                    <Check className="h-4 w-4 text-primary" />
                    <AlertDescription>
                      <strong>Detected:</strong> ${detectedAmount.toFixed(2)} USD • {detectedConfirmations} confirmation(s)
                    </AlertDescription>
                  </Alert>
                )}
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
                    Verifying Transaction...
                  </>
                ) : (
                  "Verify & Submit Transaction"
                )}
              </Button>

              <p className="text-sm text-muted-foreground mt-4 text-center">
                Amount automatically detected from blockchain. Credits based on USD value at transaction time. Requires 2+ confirmations.
              </p>
            </Card>
          )}

          {step === "verify" && (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Transaction Verified!</h2>
              <p className="text-muted-foreground mb-6">
                Your transaction has been verified and credited to your account based on the USD value at transaction time.
              </p>
              {detectedAmount && (
                <div className="bg-primary/10 rounded-lg p-4 mb-6">
                  <p className="text-2xl font-bold text-primary">${detectedAmount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">credited to your account</p>
                </div>
              )}
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