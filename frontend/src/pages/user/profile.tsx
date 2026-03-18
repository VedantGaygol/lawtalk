import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Phone, MapPin, Camera, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { updateUserProfile } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  location: z.string().optional(),
  profileImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

const UserProfile = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        phone: user.phone || "",
        location: user.location || "",
        profileImage: user.profileImage || "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileForm) => {
    setIsPending(true);
    try {
      await updateUserProfile(data);
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-secondary border-2 border-border overflow-hidden relative">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-2xl font-bold">
              {user?.name?.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-lg">{user?.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold flex items-center gap-2"><User size={15} /> Full Name</label>
              <Input {...register("name")} placeholder="Your full name" error={errors.name?.message} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold flex items-center gap-2"><Mail size={15} /> Email</label>
              <Input value={user?.email || ""} disabled className="opacity-60 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold flex items-center gap-2"><Phone size={15} /> Phone</label>
                <Input {...register("phone")} placeholder="+91 98765 43210" error={errors.phone?.message} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold flex items-center gap-2"><MapPin size={15} /> Location</label>
                <Input {...register("location")} placeholder="City, State" error={errors.location?.message} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold flex items-center gap-2"><Camera size={15} /> Profile Image URL</label>
              <Input {...register("profileImage")} placeholder="https://..." error={errors.profileImage?.message} />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full sm:w-auto gap-2" isLoading={isPending}>
                <Save size={16} /> Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
