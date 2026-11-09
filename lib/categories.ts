// Item categories — frontend mirror of the backend registry.
//
// ⚠ Keep in sync with dropyard_backend/src/lib/categories.ts — same values,
// labels, emoji, hints, keywords and order (alphabetical, Other last). The
// backend is the authority: it validates the value, and its test checks that
// list against the database enum. GET /api/categories serves it, so this copy
// can be compared against the live list at any time.
//
// HOME is legacy: the API still accepts it (an older frontend may send it
// during a deploy) and it reads as Appliances & Kitchen everywhere — label,
// emoji and filters — but it is never offered in a form.

export interface Category {
  value: string;
  label: string;
  emoji: string;
  hint: string;
  keywords: readonly string[];
}

export const CATEGORIES: readonly Category[] = [
  { value: "APPLIANCES_KITCHEN", label: "Appliances & Kitchen", emoji: "🍳", hint: "Small and large appliances, cookware, dishes",
    keywords: ["microwave", "kettle", "toaster", "blender", "mixer", "fridge", "washer", "dryer", "pots", "pans", "cutlery", "dishes"] },
  { value: "ARTS_CRAFTS", label: "Arts & Crafts", emoji: "🎨", hint: "Craft and art supplies, sewing, knitting",
    keywords: ["paint", "canvas", "yarn", "knitting", "sewing machine", "fabric", "scrapbooking", "easel", "beads"] },
  { value: "AUTOMOTIVE", label: "Automotive & Accessories", emoji: "🚗", hint: "Car parts, tires, seat covers, accessories",
    keywords: ["tires", "winter tires", "rims", "roof rack", "car mats", "jumper cables", "dash cam", "car parts"] },
  { value: "BOOKS", label: "Books & Media", emoji: "📚", hint: "Books, DVDs, records, magazines",
    keywords: ["novel", "textbook", "cookbook", "comics", "dvd", "blu-ray", "vinyl", "records", "cd", "magazine"] },
  { value: "CLOTHING", label: "Clothing & Accessories", emoji: "👕", hint: "Clothes, hats, scarves, belts, handbags",
    keywords: ["jacket", "coat", "parka", "snow pants", "dress", "jeans", "sweater", "shirt", "hat", "scarf", "mitts", "purse", "handbag", "belt"] },
  { value: "COLLECTIBLES", label: "Collectibles & Antiques", emoji: "🏺", hint: "Vintage items, coins, cards, memorabilia",
    keywords: ["antique", "vintage", "coins", "stamps", "trading cards", "memorabilia", "figurines", "retro"] },
  { value: "ELECTRONICS", label: "Electronics", emoji: "📱", hint: "Phones, computers, TVs, audio, cameras",
    keywords: ["tv", "laptop", "computer", "phone", "tablet", "ipad", "monitor", "speaker", "headphones", "camera", "printer", "console", "gaming console"] },
  { value: "FITNESS", label: "Fitness & Exercise Equipment", emoji: "🏋️", hint: "Weights, treadmills, yoga, home gym",
    keywords: ["dumbbell", "weights", "kettlebell", "treadmill", "exercise bike", "rowing machine", "yoga mat", "bench"] },
  { value: "FURNITURE", label: "Furniture", emoji: "🛋️", hint: "Sofas, tables, chairs, beds, storage",
    keywords: ["sofa", "couch", "table", "chair", "desk", "bed", "dresser", "bookshelf", "cabinet", "wardrobe", "mattress", "patio", "patio set", "outdoor furniture"] },
  { value: "HEALTH_BEAUTY", label: "Health & Beauty", emoji: "💄", hint: "Hair care, skin care, grooming, mobility aids",
    keywords: ["hair dryer", "straightener", "makeup", "perfume", "shaver", "massager", "walker", "wheelchair", "scale"] },
  { value: "HOME_DECOR", label: "Home Décor", emoji: "🖼️", hint: "Art, mirrors, rugs, lamps, decorations",
    keywords: ["poster", "frame", "wall art", "mirror", "rug", "lamp", "vase", "curtains", "cushions", "plants"] },
  { value: "HOME_IMPROVEMENT", label: "Home Improvement & Renovation", emoji: "🧱", hint: "Building materials, fixtures, paint, flooring",
    keywords: ["tiles", "flooring", "lumber", "faucet", "sink", "light fixture", "paint", "drywall", "doors", "windows"] },
  { value: "JEWELLERY", label: "Jewellery & Watches", emoji: "💍", hint: "Rings, necklaces, bracelets, watches",
    keywords: ["jewelry", "ring", "necklace", "bracelet", "earrings", "watch", "smartwatch", "brooch"] },
  { value: "KIDS_BABY", label: "Kids & Baby", emoji: "🍼", hint: "Strollers, cribs, car seats, kids' clothes and furniture",
    keywords: ["stroller", "crib", "car seat", "high chair", "playpen", "baby carrier", "kids desk", "bassinet"] },
  { value: "LUGGAGE_TRAVEL", label: "Luggage & Travel Accessories", emoji: "🧳", hint: "Suitcases, carry-ons, travel bags",
    keywords: ["suitcase", "carry-on", "duffel", "backpack", "travel bag", "garment bag", "travel pillow"] },
  { value: "MUSICAL_INSTRUMENTS", label: "Musical Instruments", emoji: "🎸", hint: "Guitars, keyboards, drums, amps",
    keywords: ["guitar", "piano", "keyboard", "drums", "violin", "ukulele", "amp", "microphone"] },
  { value: "OFFICE_SCHOOL", label: "Office & School Supplies", emoji: "📎", hint: "Stationery, office chairs, school supplies",
    keywords: ["stationery", "binder", "calculator", "office chair", "filing cabinet", "backpack", "whiteboard"] },
  { value: "PET_SUPPLIES", label: "Pet Supplies", emoji: "🐾", hint: "Crates, beds, aquariums, toys for pets",
    keywords: ["dog", "cat", "crate", "kennel", "leash", "pet bed", "litter box", "aquarium", "fish tank", "cage"] },
  { value: "SEASONAL_HOLIDAY", label: "Seasonal & Holiday Items", emoji: "🎄", hint: "Holiday decorations, costumes, seasonal gear",
    keywords: ["christmas", "tree", "lights", "halloween", "costume", "easter", "diwali", "hanukkah", "eid", "lunar new year", "decorations", "wreath"] },
  { value: "SHOES", label: "Shoes & Footwear", emoji: "👟", hint: "Shoes, boots, sneakers, sandals",
    keywords: ["sneakers", "runners", "boots", "winter boots", "heels", "sandals", "slippers", "cleats"] },
  { value: "SPORTS", label: "Sports & Outdoor", emoji: "⚽", hint: "Bikes, camping, team sports, water sports",
    keywords: ["bike", "bicycle", "tent", "camping", "kayak", "canoe", "hockey", "skates", "skis", "golf", "soccer", "sled", "toboggan", "snowshoes"] },
  { value: "TOOLS_GARDEN", label: "Tools & Garden", emoji: "🔧", hint: "Hand and power tools, lawn and garden",
    keywords: ["drill", "saw", "toolbox", "ladder", "mower", "lawnmower", "snowblower", "rake", "shovel", "hose", "bbq"] },
  { value: "TOYS_GAMES", label: "Toys & Games", emoji: "🧸", hint: "Toys, board games, puzzles, video games",
    keywords: ["lego", "puzzle", "board game", "dolls", "action figures", "plush", "video games", "nintendo", "playstation", "xbox"] },
  { value: "OTHER", label: "Other", emoji: "📦", hint: "Anything that doesn't fit above",
    keywords: [] },
];

/** The six quick picks shown above the selector's search. */
export const QUICK_PICK_VALUES: readonly string[] = ["FURNITURE", "KIDS_BABY", "CLOTHING", "ELECTRONICS", "TOYS_GAMES", "SPORTS"];

/** Legacy stored values and the category each one reads as. */
export const LEGACY_CATEGORY_ALIASES: Readonly<Record<string, string>> = { HOME: "APPLIANCES_KITCHEN" };

const BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]));
const OTHER = BY_VALUE.get("OTHER")!;

/** The category a stored value reads as (HOME → Appliances & Kitchen; unknown → Other). */
export function categoryFor(value: string | null | undefined): Category {
  const v = (value && LEGACY_CATEGORY_ALIASES[value]) || value || "";
  return BY_VALUE.get(v) ?? OTHER;
}
export const categoryLabel = (value: string | null | undefined) => categoryFor(value).label;
export const categoryEmoji = (value: string | null | undefined) => categoryFor(value).emoji;

/** Older UI labels (demo data, earlier versions of this list) → stored value. */
const LABEL_ALIASES: Record<string, string> = {
  "Books, Games & Hobbies": "BOOKS",
  "Home Decor": "HOME_DECOR",
  "Home": "APPLIANCES_KITCHEN",
  "Jewelry & Watches": "JEWELLERY",
};
const BY_LABEL = new Map(CATEGORIES.map((c) => [c.label, c.value]));
/** Stored value for a UI label, or null when it isn't one. */
export function categoryValueFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  return BY_LABEL.get(label) ?? LABEL_ALIASES[label] ?? null;
}

/** Does an item with stored value `itemValue` belong under filter `filterValue`? */
export function matchesCategory(itemValue: string | null | undefined, filterValue: string | null | undefined): boolean {
  if (!filterValue || filterValue === "All") return true;
  return categoryFor(itemValue).value === filterValue;
}

// ─── Search ────────────────────────────────────────────────────────────────

/** Lower-case, accents stripped ("Décor" → "decor"), punctuation to spaces. */
export function normaliseForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+]+/g, " ").trim();
}

export interface CategoryMatch {
  category: Category;
  /** The keyword that matched, when the label itself didn't. */
  keyword: string | null;
}

/**
 * Categories matching a query, best first. Label matches rank above keyword
 * matches, and prefix matches above matches inside a word. An empty query
 * returns the whole list in its normal order.
 */
export function searchCategories(query: string): CategoryMatch[] {
  const q = normaliseForSearch(query);
  if (!q) return CATEGORIES.map((category) => ({ category, keyword: null }));
  const scored: Array<CategoryMatch & { score: number; index: number }> = [];
  CATEGORIES.forEach((category, index) => {
    const label = normaliseForSearch(category.label);
    let score = 0;
    let keyword: string | null = null;
    if (label.startsWith(q)) score = 100;
    else if ((" " + label).includes(" " + q)) score = 80;
    else if (label.includes(q)) score = 50;
    for (const k of category.keywords) {
      const nk = normaliseForSearch(k);
      const s = nk === q ? 70 : nk.startsWith(q) || (" " + nk).includes(" " + q) ? 60 : nk.includes(q) ? 30 : (q.includes(nk) && nk.length > 3) ? 40 : 0;
      if (s > score) { score = s; keyword = k; }
    }
    if (score > 0) scored.push({ category, keyword: score >= 80 || label.includes(q) ? null : keyword, score, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map(({ category, keyword }) => ({ category, keyword }));
}
