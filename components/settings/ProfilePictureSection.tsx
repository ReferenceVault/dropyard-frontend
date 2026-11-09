"use client";

import React, { useCallback, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Smile, Trash2, Type } from "lucide-react";
import { useAuth, type AuthUser } from "@/context/AuthContext";
import { apiRequest, uploadAvatarPhoto } from "@/lib/api";
import { initialsOf, normaliseAvatar, type AvatarPreset } from "@/lib/avatar";
import { UserAvatar } from "@/components/UserAvatar";
import { AvatarCropper } from "./AvatarCropper";
import { AvatarGallery } from "./AvatarGallery";
import { T } from "./profileTheme";

/**
 * Settings → Profile → "Profile picture", shared by the buyer and seller
 * dashboards (same account, so the same choice shows in both modes).
 *
 * Three equal options — upload a photo, choose a DropYard avatar, or keep
 * initials. None is recommended over another, nothing nags for a photo, and
 * nothing here suggests a picture verifies anyone.
 *
 * Saving updates AuthContext with the user the API returns, so the dashboard
 * header changes in the same render; the API's `user:updated` socket event
 * catches the user's other tabs and devices.
 */

const ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_EXT = /\.(jpe?g|png|webp)$/i;
// The original only lives in the browser (it's cropped to 512px before
// upload), so this just guards memory on very large files.
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

function checkFile(file: File): string | null {
  const typeOk = ACCEPTED_TYPES.has(file.type) || (!file.type && ACCEPTED_EXT.test(file.name));
  if (!typeOk) {
    if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      return "HEIC photos aren't supported yet. Choose a JPG, PNG or WebP image.";
    }
    return "That file type isn't supported. Choose a JPG, PNG or WebP image.";
  }
  if (file.size > MAX_SOURCE_BYTES) return "That photo is very large (over 25 MB). Choose a smaller one.";
  return null;
}

type Busy = null | "photo" | "preset" | "initials";

export function ProfilePictureSection({ initialsBg, onSuccess }: {
  /** The dashboard's own initials colour, so the preview matches the header. */
  initialsBg?: string;
  onSuccess?: (message: string) => void;
}) {
  const { user, setUser } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [presets, setPresets] = useState<AvatarPreset[] | null>(null);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const avatar = normaliseAvatar(user?.avatar);
  const name = user?.name || "";

  const done = useCallback((u: AuthUser, message: string) => {
    setUser(u);
    setStatus(message);
    onSuccess?.(message);
  }, [setUser, onSuccess]);

  const pickFile = () => { setError(null); fileInput.current?.click(); };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // choosing the same file again still fires change
    if (!file) return;
    const problem = checkFile(file);
    if (problem) { setError(problem); setCropFile(null); return; }
    setDialogError(null);
    setCropFile(file);
  };

  const savePhoto = async (blob: Blob) => {
    setBusy("photo");
    setDialogError(null);
    try {
      const { user: u } = await uploadAvatarPhoto<{ user: AuthUser }>(blob);
      setCropFile(null);
      done(u, avatar.type === "PHOTO" ? "Profile photo replaced." : "Profile photo saved.");
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Could not save your profile picture.");
    } finally {
      setBusy(null);
    }
  };

  const openGallery = async () => {
    setError(null);
    setDialogError(null);
    setGalleryOpen(true);
    if (presets) return;
    setPresetsError(null);
    try {
      const { presets: list } = await apiRequest<{ presets: AvatarPreset[] }>("/api/avatars/presets");
      setPresets(list);
    } catch {
      setPresetsError("We couldn't load the avatars. Check your connection and try again.");
    }
  };

  const savePreset = async (presetId: string) => {
    setBusy("preset");
    setDialogError(null);
    try {
      const { user: u } = await apiRequest<{ user: AuthUser }>("/api/auth/me/avatar", {
        method: "PATCH", body: JSON.stringify({ type: "PRESET", presetId }),
      });
      setGalleryOpen(false);
      done(u, "Avatar updated.");
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Could not update your avatar.");
    } finally {
      setBusy(null);
    }
  };

  const useInitials = async () => {
    if (avatar.type === "INITIALS") return;
    setBusy("initials");
    setError(null);
    try {
      const { user: u } = await apiRequest<{ user: AuthUser }>("/api/auth/me/avatar", {
        method: "PATCH", body: JSON.stringify({ type: "INITIALS" }),
      });
      done(u, avatar.type === "PHOTO" ? "Photo removed. Your initials are showing now." : "Now showing your initials.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your profile picture.");
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  const currentLabel = avatar.type === "PHOTO" ? "Your photo" : avatar.type === "PRESET" ? avatar.label : `Your initials (${initialsOf(name)})`;

  return (
    <section aria-labelledby="profile-picture-heading" style={{ ...T.card, position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
        <UserAvatar avatar={avatar} name={name} size={88} initialsBg={initialsBg} eager
          style={{ border: "3px solid #fff", boxShadow: "0 0 0 1.5px " + T.c.greenMist }} />
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <h2 id="profile-picture-heading" style={T.h2}>Profile picture</h2>
          <p style={{ ...T.muted, marginTop: 4 }}>Optional — a photo, an avatar or your initials all work just as well.</p>
          <p style={{ ...T.muted, marginTop: 2, fontSize: 12.5 }}>
            It&apos;s shown next to your name on your listings, in messages and claims, including links you share.
          </p>
          <p style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.c.greenDeep, marginTop: 8 }}>
            Showing: {currentLabel}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12, marginTop: 20 }}>
        <OptionTile
          icon={<ImagePlus size={18} aria-hidden />}
          title="Upload my photo"
          hint="JPG, PNG or WebP. You can crop it next."
          active={avatar.type === "PHOTO"}
        >
          {avatar.type === "PHOTO" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" onClick={pickFile} disabled={!!busy} style={T.secondaryButton}>Replace photo</button>
              <button type="button" onClick={useInitials} disabled={!!busy} style={{ ...T.secondaryButton, color: T.c.claret }}>
                {busy === "initials" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
                Remove photo
              </button>
            </div>
          ) : (
            <button type="button" onClick={pickFile} disabled={!!busy} style={T.secondaryButton}>Upload a photo</button>
          )}
        </OptionTile>

        <OptionTile
          icon={<Smile size={18} aria-hidden />}
          title="Choose an avatar"
          hint="Pick one from the DropYard gallery."
          active={avatar.type === "PRESET"}
        >
          <button type="button" onClick={openGallery} disabled={!!busy} style={T.secondaryButton}>
            {avatar.type === "PRESET" ? "Change avatar" : "Browse avatars"}
          </button>
        </OptionTile>

        <OptionTile
          icon={<Type size={18} aria-hidden />}
          title="Use my initials"
          hint={avatar.type === "PHOTO" ? `Shows "${initialsOf(name)}". Your uploaded photo will be removed.` : `Shows "${initialsOf(name)}".`}
          active={avatar.type === "INITIALS"}
        >
          {avatar.type === "INITIALS" ? null : (
            <button type="button" onClick={useInitials} disabled={!!busy} style={T.secondaryButton}>
              {busy === "initials" && <Loader2 size={14} className="animate-spin" aria-hidden />}
              Use my initials
            </button>
          )}
        </OptionTile>
      </div>

      {error && <p role="alert" style={{ ...T.error, marginTop: 14 }}>{error}</p>}
      <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{status}</p>

      <input ref={fileInput} type="file" accept={ACCEPT} onChange={onFile} hidden aria-hidden tabIndex={-1} />

      {cropFile && (
        <AvatarCropper
          file={cropFile}
          saving={busy === "photo"}
          error={dialogError}
          onCancel={() => { setCropFile(null); setDialogError(null); }}
          onChooseAnother={pickFile}
          onSave={savePhoto}
        />
      )}
      {galleryOpen && (
        <AvatarGallery
          presets={presets ?? []}
          loading={!presets && !presetsError}
          loadError={presetsError}
          currentId={avatar.type === "PRESET" ? avatar.presetId : null}
          saving={busy === "preset"}
          error={dialogError}
          onCancel={() => { setGalleryOpen(false); setDialogError(null); }}
          onSave={savePreset}
        />
      )}
    </section>
  );
}

function OptionTile({ icon, title, hint, active, children }: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative", display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 14,
        border: "1.5px solid " + (active ? T.c.green : T.c.fawn), background: active ? T.c.greenMist : T.c.sand,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden style={{ width: 34, height: 34, borderRadius: "50%", background: active ? T.c.green : T.c.paper, color: active ? "#fff" : T.c.green, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px " + T.c.fawn, flexShrink: 0 }}>
          {icon}
        </span>
        <h3 style={{ fontFamily: T.font, fontSize: 14, fontWeight: 800, color: T.c.ink, margin: 0, flex: 1 }}>{title}</h3>
        {active && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: T.c.green, color: "#fff", fontFamily: T.font, fontSize: 11, fontWeight: 800 }}>
            <Check size={12} strokeWidth={3} aria-hidden /> In use
          </span>
        )}
      </div>
      <p style={{ ...T.muted, fontSize: 12.5 }}>{hint}</p>
      {children && <div style={{ marginTop: "auto" }}>{children}</div>}
    </div>
  );
}

export default ProfilePictureSection;
