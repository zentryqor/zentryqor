import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Lock, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/_authenticated/assets")({
  ssr: false,
  component: AssetsPage,
});

type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  premium_only: boolean;
  created_at: string;
};

function AssetsPage() {
  const { user } = useAuth();
  const { isPremium } = useSubscription(user?.id);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setAssets((data ?? []) as AssetRow[]);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category))).sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (tier === "free" && a.premium_only) return false;
      if (tier === "premium" && !a.premium_only) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, search, category, tier]);

  const download = async (a: AssetRow) => {
    if (a.premium_only && !isPremium) {
      toast.error("Premium membership required");
      return;
    }
    const { data, error } = await supabase.storage
      .from("assets")
      .createSignedUrl(a.storage_path, 60, { download: a.file_name });
    if (error || !data) {
      toast.error(error?.message ?? "Download failed");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Asset library</h1>
        <p className="text-sm text-muted-foreground">
          Browse and download available assets
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, description, tags"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger>
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assets match your filters.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const locked = a.premium_only && !isPremium;
            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span>{a.title}</span>
                    {a.premium_only && <Badge>Premium</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2">
                    {a.description && (
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{a.category}</Badge>
                      {a.tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.file_name}
                      {a.size_bytes
                        ? ` · ${(a.size_bytes / 1024).toFixed(1)} KB`
                        : ""}
                    </p>
                  </div>
                  <Button onClick={() => download(a)} disabled={locked} className="w-full">
                    {locked ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" /> Premium only
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
