// Emoji set for the chat composers, shared by the buyer and seller
// dashboards so both ends of a conversation offer the same vocabulary.
//
// Grouped rather than one flat run: a 250-emoji grid with no structure is
// slower to search than a keyboard. The tabs are the same idea WhatsApp
// uses, with two deliberate departures — "Deal" and "Stuff" come before the
// general categories, because this is a marketplace chat and 📦 🤝 💰 🚗 are
// what people actually reach for when arranging a pickup.
//
// Plain characters, no picker library: an emoji font is already on every
// device this runs on, and a dependency for an array of strings isn't worth
// the bundle.

export interface EmojiGroup {
  id: string;
  /** Shown in the tab strip. */
  tab: string;
  /** Accessible name for the tab button. */
  label: string;
  emoji: string[];
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    id: "deal",
    tab: "🤝",
    label: "Deal and pickup",
    emoji: [
      "🤝", "👍", "👌", "✅", "☑️", "❌", "❓", "❗", "⚠️", "🆓",
      "💰", "💵", "💳", "🪙", "💸", "🧾", "🏷️", "🛒", "🛍️", "📦",
      "📈", "📉", "💯", "🔥", "⭐", "🌟", "✨", "🎁", "🎉", "🎊",
      "📍", "🗺️", "🧭", "🏠", "🏡", "🚪", "🕐", "⏰", "⏳", "📅",
      "🗓️", "🚗", "🚙", "🚐", "🛻", "🚚", "🚕", "🚲", "🛴", "🅿️",
    ],
  },
  {
    id: "smileys",
    tab: "😊",
    label: "Smileys and people",
    emoji: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌",
      "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🥳", "🥺", "😎",
      "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥵",
      "🥶", "😱", "😨", "😰", "😥", "😢", "😭", "😤", "😠", "😡",
      "🤬", "😈", "💀", "🤡", "👻", "👽", "🤖", "🙈", "🙉", "🙊",
    ],
  },
  {
    id: "gestures",
    tab: "👋",
    label: "Gestures",
    emoji: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙",
      "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋",
      "🤝", "🙏", "✍️", "💪", "👏", "🙌", "👐", "🤲", "✊", "👊",
    ],
  },
  {
    id: "hearts",
    tab: "❤️",
    label: "Hearts",
    emoji: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💫", "💥",
    ],
  },
  {
    id: "stuff",
    tab: "📦",
    label: "Things for sale",
    emoji: [
      "🛋️", "🪑", "🛏️", "🪞", "🧸", "🖼️", "🧺", "🪴", "🕯️", "💡",
      "🔌", "🔧", "🔨", "🪛", "🧰", "🧹", "🧽", "📺", "💻", "⌨️",
      "🖥️", "📱", "⌚", "📷", "🎧", "🎸", "🎹", "📚", "🍼", "👕",
      "👗", "👟", "👜", "🏀", "⚽", "🏈", "⚾", "🎾", "🏓", "🚴",
    ],
  },
  {
    id: "nature",
    tab: "🌸",
    label: "Food and nature",
    emoji: [
      "☕", "🍵", "🍺", "🍻", "🍕", "🍔", "🍟", "🌮", "🍜", "🍎",
      "🍌", "🍓", "🍇", "🥦", "🥕", "🍰", "🌳", "🌲", "🌸", "🌻",
      "🌞", "🌙", "❄️", "☔", "🌈", "🐶", "🐱", "🐦", "🦝", "🍁",
    ],
  },
];

/** Every emoji in tab order — used for a flat fallback and for tests. */
export const ALL_COMPOSER_EMOJI: string[] = EMOJI_GROUPS.flatMap((g) => g.emoji);
