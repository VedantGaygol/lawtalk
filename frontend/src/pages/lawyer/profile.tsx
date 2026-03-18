import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  User, MapPin, Briefcase, DollarSign, FileText,
  Upload, Save, ShieldCheck, AlertCircle, Copy, CheckCircle2, Video, ImageIcon, ZoomIn, ZoomOut, RotateCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";
import { getLawyerProfile, updateLawyerProfile } from "@/services/api";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// ── Crop helpers ──────────────────────────────────────────────────────────────
async function getCroppedBlob(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.addEventListener("load", () => res(img));
    img.addEventListener("error", rej);
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bw = image.width * cos + image.height * sin;
  const bh = image.width * sin + image.height * cos;
  canvas.width = bw;
  canvas.height = bh;
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(rad);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  const out = document.createElement("canvas");
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  out.getContext("2d")!.drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error("Canvas empty")), "image/jpeg", 0.92));
}

const SPECIALIZATIONS = [
  "Criminal Law", "Family Law", "Civil Law", "Corporate Law",
  "Property Law", "Labour Law", "Tax Law", "Intellectual Property",
  "Immigration Law", "Constitutional Law"
];

const profileSchema = z.object({
  specialization: z.string().min(1, "Specialization is required"),
  experience: z.coerce.number().min(0, "Experience must be 0 or more"),
  location: z.string().min(2, "Location is required"),
  pricing: z.coerce.number().min(1, "Pricing is required"),
  bio: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const LawyerProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Crop dialog state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    getLawyerProfile()
      .then((res) => {
        setProfile(res);
        reset({
          specialization: res.specialization || "",
          experience: res.experience || 0,
          location: res.location || "",
          pricing: res.pricing || 0,
          bio: res.bio || "",
        });
      })
      .catch(() => toast({ title: "Error loading profile", variant: "destructive" }))
      .finally(() => setIsLoading(false));
  }, []);

  const onSubmit = async (data: ProfileForm) => {
    setIsSaving(true);
    try {
      const updated = await updateLawyerProfile(data);
      setProfile(updated);
      toast({ title: "Profile updated!", description: "Your profile has been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLicense(true);
    try {
      const formData = new FormData();
      formData.append("license", file);
      await api.post("/api/lawyers/upload-license-file", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "License uploaded!", description: "Your license has been submitted for review." });
      const updated = await getLawyerProfile();
      setProfile(updated);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsUploadingLicense(false);
      if (licenseInputRef.current) licenseInputRef.current.value = "";
    }
  };

  // Step 1: file picked → open crop dialog
  const handleImageFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Step 2: user confirms crop → upload to Cloudinary
  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setIsUploadingImage(true);
    setCropSrc(null);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels, rotation);
      const formData = new FormData();
      formData.append("image", blob, "profile.jpg");
      const { data } = await api.post("/api/lawyers/upload-profile-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setProfile((prev: any) => ({ ...prev, profileImage: data.url }));
      toast({ title: "Profile image updated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const copyCode = () => {
    if (profile?.lawyerCode) {
      navigator.clipboard.writeText(profile.lawyerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Lawyer Profile</h1>
          <p className="text-muted-foreground mt-1">Complete your profile to get approved and visible to clients.</p>
        </div>
        <Badge
          variant={profile?.approvalStatus === 'approved' ? 'success' : profile?.approvalStatus === 'rejected' ? 'destructive' : 'warning'}
          className="shrink-0 px-3 py-1.5 text-sm capitalize"
        >
          {profile?.approvalStatus === 'approved' && <ShieldCheck size={14} className="mr-1" />}
          {profile?.approvalStatus || 'Pending'}
        </Badge>
      </div>

      {/* Approval status banner */}
      {profile?.approvalStatus === 'pending' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Awaiting Admin Approval</p>
            <p className="text-sm text-amber-700 mt-0.5">Complete your profile and upload your license. Our team will review and approve your account.</p>
          </div>
        </div>
      )}

      {profile?.approvalStatus === 'approved' && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">Profile Approved & Active</p>
            <p className="text-sm text-emerald-700 mt-0.5">Your profile is visible to clients. Keep it updated to attract more cases.</p>
          </div>
        </div>
      )}

      {/* Lawyer Code */}
      {profile?.lawyerCode && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Lawyer Code</p>
                <p className="text-2xl font-display font-bold text-primary mt-1">{profile.lawyerCode}</p>
                <p className="text-xs text-muted-foreground mt-1">Share this code with clients to connect via video call.</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={copyCode} className="gap-2">
                  {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button size="sm" className="gap-2" onClick={() => setLocation(`/video/${profile.lawyerCode}`)}>
                  <Video size={16} /> Start Room
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crop Dialog */}
      <Dialog open={!!cropSrc} onOpenChange={open => { if (!open) setCropSrc(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Profile Photo</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-72 bg-black rounded-xl overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <ZoomOut size={16} className="text-muted-foreground shrink-0" />
              <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)} className="flex-1" />
              <ZoomIn size={16} className="text-muted-foreground shrink-0" />
            </div>
            <div className="flex items-center gap-3">
              <RotateCw size={16} className="text-muted-foreground shrink-0" />
              <Slider min={0} max={360} step={1} value={[rotation]} onValueChange={([v]) => setRotation(v)} className="flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right">{rotation}°</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCropSrc(null)}>Cancel</Button>
            <Button onClick={handleCropConfirm} isLoading={isUploadingImage}>Apply & Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Image Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ImageIcon size={18} /> Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-muted overflow-hidden shrink-0 border-2 border-border">
            {profile?.profileImage
              ? <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={32} /></div>
            }
          </div>
          <div className="space-y-2">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFilePicked} />
            <Button variant="outline" size="sm" className="gap-2" isLoading={isUploadingImage} onClick={() => imageInputRef.current?.click()}>
              <Upload size={15} /> {isUploadingImage ? "Uploading..." : "Upload Photo"}
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 10MB.</p>
          </div>
        </CardContent>
      </Card>

      {/* License Upload */}
      <Card className={profile?.licenseDocument ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={18} />
            Bar License Document
            {profile?.licenseDocument
              ? <Badge variant="success" className="ml-auto">Uploaded</Badge>
              : <Badge variant="warning" className="ml-auto">Required</Badge>
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile?.licenseDocument && (
            <div className="rounded-xl overflow-hidden border border-border w-full max-w-xs">
              <img src={profile.licenseDocument} alt="License" className="w-full object-contain" />
            </div>
          )}
          <input ref={licenseInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleLicenseUpload} />
          <Button variant="outline" className="gap-2" isLoading={isUploadingLicense} onClick={() => licenseInputRef.current?.click()}>
            <Upload size={15} /> {isUploadingLicense ? "Uploading..." : "Upload License (PDF or Image)"}
          </Button>
          <p className="text-xs text-muted-foreground">Upload a PDF or image of your bar license. PDFs are auto-converted to image.</p>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Professional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold flex items-center gap-2"><Briefcase size={15} /> Specialization</label>
                <div className="relative">
                  <select
                    {...register("specialization")}
                    className={`w-full h-11 rounded-xl border-2 px-3 text-sm bg-white appearance-none focus:outline-none focus:border-primary transition-all ${errors.specialization ? 'border-destructive' : 'border-border'}`}
                  >
                    <option value="">Select specialization</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {errors.specialization && <p className="text-xs text-destructive">{errors.specialization.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold flex items-center gap-2"><Briefcase size={15} /> Years of Experience</label>
                <Input {...register("experience")} type="number" min={0} placeholder="e.g. 5" error={errors.experience?.message} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold flex items-center gap-2"><MapPin size={15} /> Location</label>
                <Input {...register("location")} placeholder="City, State" error={errors.location?.message} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold flex items-center gap-2"><DollarSign size={15} /> Hourly Rate (USD)</label>
                <Input {...register("pricing")} type="number" min={1} placeholder="e.g. 150" error={errors.pricing?.message} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold flex items-center gap-2"><User size={15} /> Professional Bio</label>
              <textarea
                {...register("bio")}
                rows={4}
                placeholder="Describe your expertise, notable cases, and approach to legal practice..."
                className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary transition-all resize-none"
              />
            </div>

            <Button type="submit" className="w-full sm:w-auto gap-2" isLoading={isSaving}>
              <Save size={16} /> Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LawyerProfile;
