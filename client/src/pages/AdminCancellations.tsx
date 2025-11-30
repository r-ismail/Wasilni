import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, TrendingUp, Users, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminCancellations() {
  const { t } = useTranslation();
  const [cancelledByFilter, setCancelledByFilter] = useState<"all" | "rider" | "driver" | "admin" | "system">("all");
  const [refundStatusFilter, setRefundStatusFilter] = useState<"all" | "pending" | "processed" | "rejected">("all");
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  const { data: stats } = trpc.admin.getCancellationStats.useQuery();
  const { data: cancelledRides, refetch } = trpc.admin.getCancelledRides.useQuery({
    cancelledBy: cancelledByFilter === "all" ? undefined : cancelledByFilter,
    refundStatus: refundStatusFilter === "all" ? undefined : refundStatusFilter,
  });

  const processRefundMutation = trpc.admin.processRefund.useMutation({
    onSuccess: () => {
      toast.success(t("admin.refundProcessed"));
      setShowRefundDialog(false);
      setSelectedRide(null);
      setRefundAmount("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleProcessRefund = (status: "processed" | "rejected") => {
    if (!selectedRide) return;

    const amount = status === "processed" ? parseInt(refundAmount) || 0 : 0;

    processRefundMutation.mutate({
      rideId: selectedRide.id,
      refundAmount: amount,
      refundStatus: status,
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">{t("admin.pending")}</Badge>;
    
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t("admin.pending")}</Badge>;
      case "processed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />{t("admin.processed")}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t("admin.rejected")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCancelledByBadge = (cancelledBy: string | null) => {
    if (!cancelledBy) return <Badge variant="outline">Unknown</Badge>;
    
    const colors: Record<string, string> = {
      rider: "bg-blue-100 text-blue-800",
      driver: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800",
      system: "bg-gray-100 text-gray-800",
    };

    return <Badge className={colors[cancelledBy] || ""}>{cancelledBy}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("admin.cancellationManagement")}</h1>
          <p className="text-muted-foreground">{t("admin.manageCancellations")}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.totalCancellations")}</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCancellations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.cancellationRate")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.cancellationRate || 0}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.byRider")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byUser?.rider || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("admin.byDriver")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byUser?.driver || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t("admin.filters")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.cancelledBy")}</Label>
                <Select value={cancelledByFilter} onValueChange={(v: any) => setCancelledByFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.all")}</SelectItem>
                    <SelectItem value="rider">{t("admin.rider")}</SelectItem>
                    <SelectItem value="driver">{t("admin.driver")}</SelectItem>
                    <SelectItem value="admin">{t("admin.admin")}</SelectItem>
                    <SelectItem value="system">{t("admin.system")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("admin.refundStatus")}</Label>
                <Select value={refundStatusFilter} onValueChange={(v: any) => setRefundStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.all")}</SelectItem>
                    <SelectItem value="pending">{t("admin.pending")}</SelectItem>
                    <SelectItem value="processed">{t("admin.processed")}</SelectItem>
                    <SelectItem value="rejected">{t("admin.rejected")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancelled Rides Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.cancelledRides")}</CardTitle>
            <CardDescription>{t("admin.viewAllCancelled")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.rideId")}</TableHead>
                    <TableHead>{t("admin.rider")}</TableHead>
                    <TableHead>{t("admin.driver")}</TableHead>
                    <TableHead>{t("admin.cancelledBy")}</TableHead>
                    <TableHead>{t("admin.reason")}</TableHead>
                    <TableHead>{t("admin.cancelledAt")}</TableHead>
                    <TableHead>{t("admin.fare")}</TableHead>
                    <TableHead>{t("admin.refundStatus")}</TableHead>
                    <TableHead>{t("admin.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cancelledRides && cancelledRides.length > 0 ? (
                    cancelledRides.map((ride) => (
                      <TableRow key={ride.id}>
                        <TableCell className="font-medium">#{ride.id}</TableCell>
                        <TableCell>{ride.rider?.name || "Unknown"}</TableCell>
                        <TableCell>{ride.driver?.name || "N/A"}</TableCell>
                        <TableCell>{getCancelledByBadge(ride.cancelledBy)}</TableCell>
                        <TableCell className="max-w-xs truncate">{ride.cancellationReason || "No reason"}</TableCell>
                        <TableCell>{formatDate(ride.cancelledAt)}</TableCell>
                        <TableCell>{formatCurrency(ride.estimatedFare)}</TableCell>
                        <TableCell>{getStatusBadge(ride.refundStatus)}</TableCell>
                        <TableCell>
                          {(!ride.refundStatus || ride.refundStatus === "pending") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRide(ride);
                                setRefundAmount((ride.estimatedFare / 100).toString());
                                setShowRefundDialog(true);
                              }}
                            >
                              {t("admin.processRefund")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        {t("admin.noCancelledRides")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Refund Processing Dialog */}
        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.processRefund")}</DialogTitle>
              <DialogDescription>
                {t("admin.processRefundDesc")}
              </DialogDescription>
            </DialogHeader>

            {selectedRide && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">{t("admin.rideId")}:</p>
                    <p>#{selectedRide.id}</p>
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.rider")}:</p>
                    <p>{selectedRide.rider?.name}</p>
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.originalFare")}:</p>
                    <p>{formatCurrency(selectedRide.estimatedFare)}</p>
                  </div>
                  <div>
                    <p className="font-medium">{t("admin.cancelledBy")}:</p>
                    <p>{selectedRide.cancelledBy}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refundAmount">{t("admin.refundAmount")}</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={() => handleProcessRefund("rejected")}>
                {t("admin.rejectRefund")}
              </Button>
              <Button onClick={() => handleProcessRefund("processed")}>
                {t("admin.approveRefund")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
