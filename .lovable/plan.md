
# Theme Update: Red Primary & Blue Secondary

## Overview
Update the entire application's color scheme from the current warm amber/gold palette to a red and blue theme, with red as the primary color and blue as secondary.

## Changes Required

### 1. Update CSS Variables (`src/index.css`)

**Light Mode (:root)**
- **Primary (Red):** Change from amber `38 92% 50%` to red `0 72% 50%`
- **Secondary (Blue):** Change from charcoal `220 13% 18%` to blue `220 70% 50%`
- **Accent:** Update to complement the red/blue scheme
- **Ring/Focus states:** Update to match new primary
- **Gradients:** Update `--gradient-hero` and related tokens
- **Shadow glow:** Update to use red hue
- **Sidebar colors:** Update to use blue theme

**Dark Mode (.dark)**
- Apply corresponding dark variants of red and blue

### 2. Update Tailwind Config (`tailwind.config.ts`)
- Update `boxShadow.glow` and `boxShadow.glow-lg` to use red hue

### 3. Update Hardcoded Animation Colors
- Update `@keyframes pulse-glow` in CSS to use red instead of amber

## Color Palette Details

| Token | Current (Amber/Charcoal) | New (Red/Blue) |
|-------|-------------------------|----------------|
| Primary | `38 92% 50%` (amber) | `0 72% 50%` (red) |
| Secondary | `220 13% 18%` (charcoal) | `220 70% 50%` (blue) |
| Accent | `16 65% 55%` (terracotta) | `220 60% 60%` (light blue) |
| Ring | `38 92% 50%` | `0 72% 50%` |
| Sidebar BG | `220 13% 18%` | `220 70% 45%` |

## Files to Modify
1. `src/index.css` - CSS custom properties (main theme file)
2. `tailwind.config.ts` - Shadow glow colors

## Technical Notes
- All UI components using `primary`, `secondary`, `accent` classes will automatically update
- Hero section, buttons, badges, and sidebar will reflect new colors
- Gradient text and hero buttons will use red-to-blue gradient
- No changes needed to individual components as they use CSS variables
