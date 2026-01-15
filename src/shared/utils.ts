// ==========================
// User Color Utilities
// ==========================

/**
 * Generates a consistent HSL color from a user ID.
 * Same ID always produces the same color.
 *
 * @param userId - Unique user identifier
 * @returns HSL color string for use as primary/accent color
 */
export const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
};

/**
 * Generates a light background color from a user ID (for light mode).
 *
 * @param userId - Unique user identifier
 * @returns HSLA color string with high lightness and transparency
 */
export const getUserColorBg = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsla(${hue}, 65%, 95%, 0.8)`;
};

/**
 * Generates a dark background color from a user ID (for dark mode).
 *
 * @param userId - Unique user identifier
 * @returns HSLA color string with low lightness and transparency
 */
export const getUserColorBgDark = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsla(${hue}, 50%, 20%, 0.6)`;
};
