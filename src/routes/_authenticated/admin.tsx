import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Account = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: string[];
  subscription_status: string | null;
};

type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [tagsInput, setTagsInput] = useState("");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      setCheckingAdmin(false);
      if (!admin) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: subs }, { data: assetRows }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, display_name, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("subscriptions").select("user_id, status, current_period_end"),
        supabase.from("assets").select("*").order("created_at", { ascending: false }),
      ]);

    const accs: Account[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      created_at: p.created_at,
      roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      subscription_status:
        (subs ?? []).find((s: any) => s.user_id === p.id)?.status ?? null,
    }));
    setAccounts(accs);
    setAssets((assetRows ?? []) as AssetRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      toast.error("Title and file required");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error: insErr } = await supabase.from("assets").insert({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || "general",
        tags,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        premium_only: premiumOnly,
        uploaded_by: uid,
      });
      if (insErr) throw insErr;

      toast.success("Asset uploaded");
      setTitle("");
      setDescription("");
      setCategory("general");
      setTagsInput("");
      setPremiumOnly(false);
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value &&
        ((document.getElementById("file-input") as HTMLInputElement).value = "");
      loadAll();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (a: AssetRow) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await supabase.storage.from("assets").remove([a.storage_path]);
    const { error } = await supabase.from("assets").delete().eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    loadAll();
  };

  const downloadAsset = async (a: AssetRow) => {
    const { data, error } = await supabase.storage
      .from("assets")
      .createSignedUrl(a.storage_path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Could not download");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts and uploaded assets
          </p>
        </div>
        <Link to="/assets">
          <Button variant="outline">View asset library</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload new asset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. templates, guides, audio"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vault, premium, starter"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file-input">File</Label>
              <Input
                id="file-input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Switch checked={premiumOnly} onCheckedChange={setPremiumOnly} />
              <Label>Premium only</Label>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts ({accounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.display_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.roles.map((r) => (
                          <Badge key={r} variant="secondary">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.subscription_status ? (
                        <Badge>{a.subscription_status}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded assets ({assets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.category}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.size_bytes ? `${(a.size_bytes / 1024).toFixed(1)} KB` : "—"}
                  </TableCell>
                  <TableCell>
                    {a.premium_only ? (
                      <Badge>Premium</Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => downloadAsset(a)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
