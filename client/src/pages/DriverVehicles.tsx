import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Car, Edit, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function DriverVehicles() {
  const { t } = useTranslation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const { data: vehicles = [], refetch } = trpc.driver.getVehicles.useQuery();
  const addVehicle = trpc.driver.addVehicle.useMutation();
  const updateVehicle = trpc.driver.updateVehicle.useMutation();
  const deleteVehicle = trpc.driver.deleteVehicle.useMutation();

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    licensePlate: "",
    vehicleType: "economy" as "economy" | "comfort" | "premium",
    capacity: 4,
  });

  const handleAddVehicle = async () => {
    try {
      await addVehicle.mutateAsync(formData);
      toast.success(t("driver.vehicleAdded"));
      setIsAddDialogOpen(false);
      refetch();
      resetForm();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleUpdateVehicle = async () => {
    if (!selectedVehicle) return;
    try {
      await updateVehicle.mutateAsync({
        id: selectedVehicle.id,
        ...formData,
      });
      toast.success(t("driver.vehicleUpdated"));
      setIsEditDialogOpen(false);
      refetch();
      resetForm();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm(t("driver.confirmDeleteVehicle"))) return;
    try {
      await deleteVehicle.mutateAsync({ id });
      toast.success(t("driver.vehicleDeleted"));
      refetch();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const openEditDialog = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      licensePlate: "",
      vehicleType: "economy",
      capacity: 4,
    });
    setSelectedVehicle(null);
  };

  const getVehicleTypeLabel = (type: string) => {
    switch (type) {
      case "economy":
        return t("common.economy");
      case "comfort":
        return t("common.comfort");
      case "premium":
        return t("common.premium");
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("driver.myVehicles")}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t("driver.manageVehiclesDesc")}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/driver/dashboard">
              <Button variant="outline">{t("common.back")}</Button>
            </Link>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("driver.addVehicle")}
            </Button>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t("driver.noVehicles")}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{t("driver.addFirstVehicle")}</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("driver.addVehicle")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle: any) => (
              <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    {vehicle.make} {vehicle.model}
                  </CardTitle>
                  <CardDescription>{vehicle.year}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("driver.color")}:</span>
                      <span className="text-sm font-medium">{vehicle.color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("driver.licensePlate")}:</span>
                      <span className="text-sm font-medium">{vehicle.licensePlate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("driver.type")}:</span>
                      <span className="text-sm font-medium">{getVehicleTypeLabel(vehicle.vehicleType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t("driver.capacity")}:</span>
                      <span className="text-sm font-medium">{vehicle.capacity} {t("driver.passengers")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(vehicle)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Vehicle Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("driver.addVehicle")}</DialogTitle>
              <DialogDescription>{t("driver.addVehicleDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">{t("driver.make")}</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder={t("driver.makePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">{t("driver.model")}</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder={t("driver.modelPlaceholder")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">{t("driver.year")}</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">{t("driver.color")}</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder={t("driver.colorPlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensePlate">{t("driver.licensePlate")}</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder={t("driver.licensePlatePlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">{t("driver.vehicleType")}</Label>
                  <Select
                    value={formData.vehicleType}
                    onValueChange={(value: "economy" | "comfort" | "premium") =>
                      setFormData({ ...formData, vehicleType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">{t("common.economy")}</SelectItem>
                      <SelectItem value="comfort">{t("common.comfort")}</SelectItem>
                      <SelectItem value="premium">{t("common.premium")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">{t("driver.capacity")}</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="8"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAddVehicle} disabled={addVehicle.isPending}>
                {addVehicle.isPending ? t("common.adding") : t("common.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Vehicle Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("driver.editVehicle")}</DialogTitle>
              <DialogDescription>{t("driver.editVehicleDesc")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-make">{t("driver.make")}</Label>
                  <Input
                    id="edit-make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder={t("driver.makePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-model">{t("driver.model")}</Label>
                  <Input
                    id="edit-model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder={t("driver.modelPlaceholder")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-year">{t("driver.year")}</Label>
                  <Input
                    id="edit-year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-color">{t("driver.color")}</Label>
                  <Input
                    id="edit-color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder={t("driver.colorPlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-licensePlate">{t("driver.licensePlate")}</Label>
                <Input
                  id="edit-licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                  placeholder={t("driver.licensePlatePlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicleType">{t("driver.vehicleType")}</Label>
                  <Select
                    value={formData.vehicleType}
                    onValueChange={(value: "economy" | "comfort" | "premium") =>
                      setFormData({ ...formData, vehicleType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">{t("common.economy")}</SelectItem>
                      <SelectItem value="comfort">{t("common.comfort")}</SelectItem>
                      <SelectItem value="premium">{t("common.premium")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">{t("driver.capacity")}</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    min="1"
                    max="8"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleUpdateVehicle} disabled={updateVehicle.isPending}>
                {updateVehicle.isPending ? t("common.updating") : t("common.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
