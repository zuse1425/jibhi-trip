# Design system — "Sunrise"

The look for the trip platform (feature `002-trip-platform`). Wireframes: `docs/wireframes.html`.
Goal: clean, calm, quietly cheerful. One warm accent, lots of white, very few words.

## 1. Colour

Rule of thumb: **60% white/near-white, 30% ink + soft sky, 10% sun yellow** (the 60-30-10 rule).
Yellow is the colour most consistently linked with optimism, but it tires the eye when overused,
so it is reserved for the one primary action per screen and the "now" highlight.
Blue reads as calm and trustworthy; green marks success and money you get back.
Colour never carries meaning alone: "owes" and "gets back" also differ in words.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--page` | `#F5F9FF` | `#0F172A` | App background |
| `--surface` | `#FFFFFF` | `#17223B` | Cards, sheets, tab bar |
| `--ink` | `#14213D` | `#F1F5F9` | Text, dark fills (own chat bubble, map pins) |
| `--muted` | `#4B5563` | `#A8B3C7` | Secondary text |
| `--line` | `#D1D5DB` | `#2A3A5C` | Borders; `#E5E7EB` for row dividers |
| `--sun` | `#FFC93C` | `#FFC93C` | Primary button fill, active tab bar marker, "now" pin. Text on it is always `#14213D` |
| `--sun-soft` | `#FFF8E1` | `#3A3113` | "Your next step" card |
| `--sky` | `#0369A1` | `#7DD3FC` | Links, section labels, active tab label |
| `--sky-soft` | `#E0F2FE` | `#12324A` | Idea cards, cover placeholder |
| `--leaf` | `#047857` | `#6EE7B7` | "Gets back", success, toggles on |
| `--leaf-soft` | `#ECFDF5` | `#0F2F27` | "You get back" card |
| `--rose` | `#BE123C` | `#FDA4AF` | "Owes", destructive, errors |

Contrast: all text pairs above meet WCAG AA (4.5:1). Never put white text on `--sun`.

## 2. Type

- **Plus Jakarta Sans** (400, 500, 600, 700), self-hosted with the app. Fallback `system-ui`.
- Sizes: 26/700 screen title · 19/700 card title · 16/600 row title · 15/400 body · 13/400 secondary · 12/700 caps label (letter-spacing 0.06em).
- Inputs are 16 px so iOS does not zoom on focus.

## 3. Shape and space

- Radius: 16 cards · 14 primary buttons and inputs · 12 small buttons · 999 chips.
- Spacing scale: 4, 8, 12, 16, 20, 24. Screen side padding 20.
- One border weight (1 px `--line`). Highlight cards use a 1.5 px tinted border plus a soft fill, no shadows.
- Touch targets at least 44 × 44 px with 8 px between neighbours.

## 4. UX rules

1. **One job per screen.** Today answers "what do I do now?"; Plan answers "what's the day?"; Money answers "who owes what?".
2. **Thumb zone.** Navigation and primary actions sit at the bottom; destructive or rare actions sit at the top.
3. **Five tabs at most:** Today · Plan · Explore · Chat · Money. Map is a toggle inside Plan; ideas live inside Chat.
4. **Bottom sheets, not pages, for short tasks** (edit stop, add expense, pick a day). Full pages only for New trip.
5. **Few words.** A row is a time, a title and one line. Detail lives in the sheet behind the tap.
6. **Show state without asking.** Sync status, "last seen 3 min ago", optimistic updates, skeletons while loading.
7. **Nothing changes without a tap.** AI proposes cards; a person presses "Add to plan" or "Suggest".
8. **Works offline.** Last synced data always opens; edits queue and sync later.

## 5. Components (shadcn/ui on Tailwind)

| Need | Component |
|---|---|
| Bottom tab bar | Custom `TabBar` (5 links, label + marker) |
| Edit stop, add expense, settle up, pick day | `Drawer` (bottom sheet). The official drawer changed its underlying library recently, so install the current version from the shadcn CLI rather than copying old snippets |
| Confirm delete | `AlertDialog` |
| List / Map switch, split type | `ToggleGroup` |
| Day chips | `ToggleGroup` (single) styled as chips, horizontally scrollable |
| Cards, rows | `Card`, plain flex rows with dividers |
| Buttons | `Button` variants: `primary` (sun), `outline`, `ghost`, `destructive` |
| Inputs | `Input`, `Textarea`, `Label`, native `type="time"` / `type="date"` |
| People | `Avatar` (initial on tinted circle) |
| Status chips | `Badge` |
| Toggles | `Switch` |
| Feedback | `Sonner` toasts, `Skeleton` loaders |
| Chat scroll | `ScrollArea` |
| Icons | `lucide-react`, 20 px, stroke 1.75. No emoji in UI chrome |

## 6. Sources

Design blogs and component docs, used as heuristics rather than proof:

- Colour meaning and the 60-30-10 rule: <https://mockflow.com/blog/color-psychology-in-ui-design>, <https://uxmag.com/articles/the-psychology-of-color-in-ui-ux-design>
- Caution that colour–emotion research is thin: <https://arar.sci.am//Content/402720/6-28.pdf>
- Thumb zone and one-handed use: <https://parachutedesign.ca/blog/thumb-zone-ux/>
- Bottom navigation, 3 to 5 destinations: <https://shop.smashingmagazine.com/2016/11/the-golden-rules-of-mobile-navigation-design/>
- Touch targets and spacing: <https://virtuslab.com/blog/frontend/mobile-first-interaction-patterns>
- Drawer and Sonner: <https://ui.shadcn.com/docs/components/drawer>, <https://ui.shadcn.com/docs/changelog/2023-12-new-components>
- Group-trip app patterns (vote then add to itinerary, map with connecting lines, shared expenses): <https://bootcamp.uxdesign.cc/voyay-travel-planner-app-ux-ui-casestudy-207994068e8f>, <https://siddu1998.github.io/googleTrips.html>
