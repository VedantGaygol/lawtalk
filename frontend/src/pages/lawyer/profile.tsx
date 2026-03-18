import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  User, MapPin, Briefcase, DollarSign, FileText,
  Link as LinkIcon, Save, ShieldCheck, AlertCircle, Copy, CheckCircle2, Video
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getLawyerProfile, updateLawyerProfile, uploadLicense } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

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
  profileImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

const LawyerProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [licenseUrl, setLicenseUrl] = useState("");
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [copied, setCopied] = useState(false);

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
          profileImage: res.profileImage || "",
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

  const handleLicenseUpload = async () => {
    if (!licenseUrl.trim()) {
      toast({ title: "Enter a license URL", variant: "destructive" });
      return;
    }
    setIsUploadingLicense(true);
    try {
      await uploadLicense(licenseUrl);
      toast({ title: "License uploaded!", description: "Your license has been submitted for review." });
      setLicenseUrl("");
      const updated = await getLawyerProfile();
      setProfile(updated);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsUploadingLicense(false);
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
            <p className="text-sm text-muted-foreground break-all">
              Current: <a href={profile.licenseDocument} target="_blank" rel="noreferrer" className="text-primary underline">{profile.licenseDocument}</a>
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={licenseUrl}
              onChange={e => setLicenseUrl(e.target.value)}
              placeholder="Paste license document URL (Google Drive, Dropbox, etc.)"
              className="bg-white"
            />
            <Button onClick={handleLicenseUpload} isLoading={isUploadingLicense} className="shrink-0">
              Upload
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Upload a publicly accessible URL to your bar license document.</p>
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
              <label className="text-sm font-semibold flex items-center gap-2"><LinkIcon size={15} /> Profile Image URL</label>
              <Input {...register("profileImage")} placeholder="https://..." error={errors.profileImage?.message} />
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
