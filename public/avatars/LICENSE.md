# DropYard avatar gallery — sources and licences

The avatars users can choose in Settings → Profile → Profile picture. The
registry (ids, files, alt text) lives in
`dropyard_backend/src/lib/avatarPresets.ts`; this folder holds only the artwork.

## Illustrated faces — `neighbour-1.svg` … `neighbour-13.svg`

- **Artwork:** Open Peeps by Pablo Stanley — https://www.openpeeps.com/
- **Licence:** CC0 1.0 Universal (public domain dedication) —
  https://creativecommons.org/publicdomain/zero/1.0/
  Commercial use, modification and redistribution are allowed; no attribution
  is required (credited here anyway).
- **Generated with:** DiceBear "Open Peeps" style, a remix of Open Peeps also
  under CC0 1.0 — https://www.dicebear.com/styles/open-peeps/ ,
  licence overview https://www.dicebear.com/licenses/
- **How:** each file was generated once from the DiceBear HTTP API (v9.x) with
  explicit options (hairstyle or head covering, expression, skin tone,
  glasses, clothing and a DropYard brand background colour), then committed as
  a static file. Nothing is fetched from DiceBear at runtime.
- **Licence checked:** 9 November 2026 (and again on 12 November 2026, for the
  later additions), on openpeeps.com ("Free for commercial
  and personal use under CC0 License") and on DiceBear's licences and style
  pages ("a remix of: Open Peeps by Pablo Stanley, licensed under CC0 1.0").

| File | Options | Alt text |
|---|---|---|
| neighbour-1.svg | head=hijab, face=smile, skin=d08b5b | Smiling person in a green hijab |
| neighbour-2.svg | head=grayShort, face=calm, glasses2, moustache1, skin=edb98a | Older person with grey hair, glasses and a moustache |
| neighbour-3.svg | head=longCurly, face=smile, skin=694d3d | Smiling person with long curly hair |
| neighbour-4.svg | head=turban, face=smile, beard full, skin=ae5d29 | Smiling person with a turban and a full beard |
| neighbour-5.svg | head=grayBun, face=cute, glasses, skin=ffdbb4 | Older person with a grey bun and glasses |
| neighbour-6.svg | head=twists, face=calm, skin=694d3d | Calm person with twists |
| neighbour-7.svg | head=mediumBangs, face=smile, glasses4, skin=edb98a | Smiling person with a fringe and glasses |
| neighbour-8.svg | head=short3, face=smile, skin=edb98a, clothing=78e185, background=fdf3e4 | Smiling person with short dark hair |
| neighbour-9.svg | head=long, face=smile, skin=ffdbb4, clothing=ffcf77, background=d4e8d1 | Smiling person with long dark hair |
| neighbour-10.svg | head=grayMedium, face=smile, skin=694d3d, hair=e8e1e1, clothing=e78276, background=e2efe0 | Smiling older person with wavy grey hair |
| neighbour-11.svg | head=grayShort, face=smile, skin=694d3d, hair=e8e1e1, clothing=8fa7df, background=d4e8d1 | Smiling older person with short grey hair |
| neighbour-12.svg | head=short1, face=smile, skin=d08b5b, clothing=9ddadb, background=fdf3e4 | Smiling person with short, neatly parted hair |
| neighbour-13.svg | head=hatBeanie, face=smile, skin=ae5d29, clothing=78e185, background=ffe4c4 | Smiling person in a green beanie |

`neighbour-8` … `neighbour-13` were added on 12 November 2026 the same way
(DiceBear HTTP API 9.x, `seed=dropyard`, no glasses, facial hair or mask unless
listed). `hair` is DiceBear's `headContrastColor`: it colours the grey
hairstyles, which otherwise come out near-black. Regenerating `neighbour-6`
with its options above gave a byte-identical file, so the new faces share the
originals' size and framing. Each new file was checked for scripts, event
handlers, embedded images and external references: none; the only `url(...)`
is the file's own `#viewboxMask`.

The gallery shows the faces in the order of `AVATAR_PRESETS`, mixed on purpose
(skin tone, age and look alternate) rather than in id order.

## Neutral designs — `house.svg`, `leaf.svg`, `sun.svg`

Original artwork made for DropYard (hand-written SVG in the brand palette).
Owned by DropYard; no third-party material.

## Adding an avatar

1. Add `<id>.svg` here: square viewBox, full-bleed background (it is shown
   cropped to a circle), no scripts or external references.
2. Add one entry to `AVATAR_PRESETS` in `dropyard_backend/src/lib/avatarPresets.ts`
   with a descriptive `label` (used as alt text).
3. If it comes from a third party, record the source and licence above.

Never rename or remove an id that has been live: users who picked it would
fall back to their initials.
