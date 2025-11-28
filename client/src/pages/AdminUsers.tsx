import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Shield, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

export default function AdminUsers() {
  const { data: users, isLoading } = trpc.admin.getAllUsers.useQuery();
  const utils = trpc.useUtils();

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const verifyDriverMutation = trpc.admin.verifyDriver.useMutation({
    onSuccess: () => {
      toast.success("Driver verification status updated");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update verification: ${error.message}`);
    },
  });

  const handleRoleChange = (userId: number, role: "rider" | "driver" | "admin") => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handleVerifyDriver = (userId: number, isVerified: boolean) => {
    verifyDriverMutation.mutate({ userId, isVerified });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage users and drivers</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and drivers</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              Total: {users?.length || 0} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!users || users.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{user.name || "Unnamed User"}</p>
                          <Badge variant={user.role === "admin" ? "default" : "outline"}>
                            {user.role}
                          </Badge>
                          {user.role === "driver" && (
                            <Badge variant={user.isVerified ? "default" : "secondary"}>
                              {user.isVerified ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Unverified
                                </>
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.phone && (
                          <p className="text-sm text-muted-foreground">{user.phone}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {user.id} | Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                        {user.role === "driver" && (
                          <p className="text-xs text-muted-foreground">
                            Total Rides: {user.totalRides || 0} | Rating:{" "}
                            {user.averageRating ? (user.averageRating / 100).toFixed(1) : "N/A"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Role:</span>
                        <Select
                          value={user.role}
                          onValueChange={(value: any) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rider">Rider</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {user.role === "driver" && (
                        <Button
                          variant={user.isVerified ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleVerifyDriver(user.id, !user.isVerified)}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {user.isVerified ? "Unverify" : "Verify"} Driver
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
