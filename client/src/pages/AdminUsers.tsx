import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Shield, CheckCircle, XCircle, Edit, Trash2, Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function AdminUsers() {
  const { t } = useTranslation();
  const { data: users, isLoading } = trpc.admin.getAllUsers.useQuery();
  const utils = trpc.useUtils();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "rider" as "rider" | "driver" | "admin",
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success(t("admin.users.roleUpdated"));
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`${t("admin.users.roleUpdateFailed")}: ${error.message}`);
    },
  });

  const verifyDriverMutation = trpc.admin.verifyDriver.useMutation({
    onSuccess: () => {
      toast.success(t("admin.users.verificationUpdated"));
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(`${t("admin.users.verificationFailed")}: ${error.message}`);
    },
  });
  
  const updateUserMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success(t("admin.users.userUpdated"));
      utils.admin.getAllUsers.invalidate();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`${t("admin.users.updateFailed")}: ${error.message}`);
    },
  });
  
  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success(t("admin.users.userDeleted"));
      utils.admin.getAllUsers.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`${t("admin.users.deleteFailed")}: ${error.message}`);
    },
  });

  const handleRoleChange = (userId: number, role: "rider" | "driver" | "admin") => {
    updateRoleMutation.mutate({ userId, role });
  };

  const handleVerifyDriver = (userId: number, isVerified: boolean) => {
    verifyDriverMutation.mutate({ userId, isVerified });
  };
  
  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
    });
    setEditDialogOpen(true);
  };
  
  const handleEditSubmit = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      ...editForm,
    });
  };
  
  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate({ userId: selectedUser.id });
  };
  
  const filteredUsers = users?.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("admin.users.title")}</h1>
            <p className="text-muted-foreground">{t("admin.users.subtitle")}</p>
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
          <h1 className="text-3xl font-bold">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground">{t("admin.users.subtitle")}</p>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.users.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("admin.users.allUsers")}
            </CardTitle>
            <CardDescription>
              {t("admin.users.total")}: {filteredUsers?.length || 0} {t("admin.users.users")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!filteredUsers || filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {t("admin.users.noUsers")}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
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
                          <p className="font-medium">{user.name || t("admin.users.unnamedUser")}</p>
                          <Badge variant={user.role === "admin" ? "default" : "outline"}>
                            {user.role}
                          </Badge>
                          {user.role === "driver" && (
                            <Badge variant={user.isVerified ? "default" : "secondary"}>
                              {user.isVerified ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {t("admin.users.verified")}
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {t("admin.users.unverified")}
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
                          {t("admin.users.id")}: {user.id} | {t("admin.users.joined")}: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                        {user.role === "driver" && (
                          <p className="text-xs text-muted-foreground">
                            {t("admin.users.totalRides")}: {user.totalRides || 0} | {t("admin.users.rating")}:{" "}
                            {user.averageRating ? (user.averageRating / 100).toFixed(1) : "N/A"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{t("admin.users.role")}:</span>
                        <Select
                          value={user.role}
                          onValueChange={(value: any) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rider">{t("admin.users.rider")}</SelectItem>
                            <SelectItem value="driver">{t("admin.users.driver")}</SelectItem>
                            <SelectItem value="admin">{t("admin.users.admin")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        {user.role === "driver" && (
                          <Button
                            variant={user.isVerified ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleVerifyDriver(user.id, !user.isVerified)}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {user.isVerified ? t("admin.users.unverify") : t("admin.users.verify")}
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(user)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          {t("admin.users.edit")}
                        </Button>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t("admin.users.delete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.editUser")}</DialogTitle>
            <DialogDescription>{t("admin.users.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t("admin.users.name")}</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">{t("admin.users.email")}</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("admin.users.phone")}</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">{t("admin.users.role")}</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: any) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rider">{t("admin.users.rider")}</SelectItem>
                  <SelectItem value="driver">{t("admin.users.driver")}</SelectItem>
                  <SelectItem value="admin">{t("admin.users.admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("admin.users.cancel")}
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? t("admin.users.saving") : t("admin.users.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.deleteConfirmDescription")}
              <br />
              <strong>{selectedUser?.name || selectedUser?.email}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.users.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? t("admin.users.deleting") : t("admin.users.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
