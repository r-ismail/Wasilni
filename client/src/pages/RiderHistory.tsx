import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, MapPin, Navigation, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function RiderHistory() {
  const { user } = useAuth();
  const { data: rides, isLoading } = trpc.rider.getRideHistory.useQuery();
  const [selectedRide, setSelectedRide] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const rateDriverMutation = trpc.rider.rateDriver.useMutation({
    onSuccess: () => {
      toast.success("Rating submitted successfully");
      setSelectedRide(null);
      setRating(5);
      setComment("");
    },
    onError: (error) => {
      toast.error(`Failed to submit rating: ${error.message}`);
    },
  });

  const handleSubmitRating = () => {
    if (selectedRide) {
      rateDriverMutation.mutate({
        rideId: selectedRide,
        rating,
        comment: comment || undefined,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      searching: "status-searching",
      accepted: "status-accepted",
      driver_arriving: "status-accepted",
      in_progress: "status-in-progress",
      completed: "status-completed",
      cancelled: "status-cancelled",
    };

    const statusLabels: Record<string, string> = {
      searching: "Searching",
      accepted: "Accepted",
      driver_arriving: "Driver Arriving",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return (
      <Badge className={statusClasses[status] || ""}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Ride History</h1>
            <p className="text-muted-foreground">View your past rides</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Ride History</h1>
          <p className="text-muted-foreground">View your past rides</p>
        </div>

        {!rides || rides.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No rides yet. Book your first ride!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <Card key={ride.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(ride.status)}
                        <span className="text-sm text-muted-foreground">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(ride.requestedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Pickup</p>
                            <p className="text-sm text-muted-foreground">{ride.pickupAddress}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Navigation className="h-4 w-4 mt-1 text-red-600" />
                          <div>
                            <p className="text-sm font-medium">Dropoff</p>
                            <p className="text-sm text-muted-foreground">{ride.dropoffAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {((ride.actualFare || ride.estimatedFare) / 100).toFixed(2)}
                        </span>
                        <Badge variant="outline">{ride.vehicleType}</Badge>
                      </div>
                    </div>

                    {ride.status === "completed" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedRide(ride.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            Rate Driver
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rate Your Driver</DialogTitle>
                            <DialogDescription>
                              How was your experience with this ride?
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Rating</Label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none"
                                  >
                                    <Star
                                      className={`h-8 w-8 ${
                                        star <= rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="comment">Comment (Optional)</Label>
                              <Textarea
                                id="comment"
                                placeholder="Share your experience..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={4}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button onClick={handleSubmitRating} disabled={rateDriverMutation.isPending}>
                              Submit Rating
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
