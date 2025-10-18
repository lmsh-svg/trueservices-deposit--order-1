"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { ArrowLeft, Loader2, Star, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Order {
  id: number;
  service_type: string;
  total_amount: number;
  delivery_status: string;
  created_at: string;
}

export default function ReviewOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { data: session, isPending } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in?redirect=/account");
    }
  }, [session, isPending, router]);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!session?.user) return;

      try {
        const token = localStorage.getItem("bearer_token");
        const response = await fetch(`/api/orders?id=${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          const orderData = data.data[0];
          
          // Verify order belongs to user
          if (orderData.user_id !== session.user.id) {
            toast.error("Unauthorized access");
            router.push("/account");
            return;
          }

          // Verify order is delivered
          if (orderData.delivery_status !== "delivered") {
            toast.error("You can only review delivered orders");
            router.push("/account");
            return;
          }

          setOrder(orderData);
        } else {
          toast.error("Order not found");
          router.push("/account");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Failed to load order");
        router.push("/account");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user && orderId) {
      fetchOrder();
    }
  }, [session, orderId, router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be less than 5MB");
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please write a review");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");

      // Convert photo to base64 if exists
      let photoUrl = "";
      if (photoFile) {
        photoUrl = photoPreview; // In a real app, you'd upload to a storage service
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: parseInt(orderId),
          user_id: session?.user?.id,
          rating,
          comment,
          photo_url: photoUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Review submitted successfully!");
        
        // Award loyalty points for leaving a review (bonus points)
        await fetch("/api/loyalty-rewards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: session?.user?.id,
            points_earned: 10,
            points_spent: 0,
            description: "Review submitted for order",
          }),
        });

        setTimeout(() => {
          router.push("/account");
        }, 1500);
      } else {
        toast.error(data.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user || !order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/account")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Account
          </Button>
          <h1 className="text-xl font-bold">Leave a Review</h1>
          <div className="w-32"></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            {/* Order Summary */}
            <div className="mb-8 pb-6 border-b">
              <h2 className="text-lg font-semibold mb-2">Order Details</h2>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Service:</span>{" "}
                  <span className="font-medium">{order.service_type}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">${order.total_amount.toFixed(2)}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Delivered:</span>{" "}
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div>
                <Label className="text-base mb-3 block">How would you rate your experience?</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-10 w-10 ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <Label htmlFor="comment" className="text-base mb-2 block">
                  Tell us about your experience
                </Label>
                <Textarea
                  id="comment"
                  placeholder="Share details about the service quality, delivery time, etc..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <Label className="text-base mb-2 block">
                  Upload a photo (optional)
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Share a photo of your order for voucher proof
                </p>

                {photoPreview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                    <Image
                      src={photoPreview}
                      alt="Order photo"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-2 hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label htmlFor="photo" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </label>
                  </div>
                )}
              </div>

              {/* Loyalty Bonus Notice */}
              <div className="bg-primary/5 rounded-lg p-4">
                <p className="text-sm font-medium">🎁 Earn 10 bonus loyalty points for leaving a review!</p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}