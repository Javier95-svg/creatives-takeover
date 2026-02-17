
# Replace Website Logo with New 3D Trefoil Knot

## What Changes

1. **Copy the new logo image** into the project at `src/assets/ct-logo.png` (replacing the current file with the uploaded `Creatives_Takeover_polished_borders.png`).

2. **Remove breathing animation** from the logo in `Navigation.tsx` (line 173) and `CreativesTakeoverHeader.tsx` (line 28):
   - Remove `animate-logo-breathing` class
   - Remove `nav-logo-hover` class (which adds glowing drop-shadow on hover)
   - Apply a clean CSS class instead for subtle 3D treatment

3. **Add a new CSS class** in `src/index.css` for the 3D logo treatment:
   - Subtle `drop-shadow` for depth (soft shadow cast to bottom-right, simulating top-left lighting)
   - No animation, no glow, no breathing
   - Clean hover: gentle lift with slightly deeper shadow
   - Example:
     ```css
     .logo-3d {
       filter: drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.3))
               drop-shadow(0px 1px 1px rgba(255, 255, 255, 0.15));
       transition: filter 0.3s ease, transform 0.3s ease;
     }
     .logo-3d:hover {
       filter: drop-shadow(3px 5px 6px rgba(0, 0, 0, 0.35))
               drop-shadow(0px 1px 2px rgba(255, 255, 255, 0.2));
       transform: scale(1.03);
     }
     ```

4. **Keep existing CSS intact** -- the old `animate-logo-breathing`, `.lightbulb-glow`, and `nav-logo-hover` classes can be cleaned up (removed) since they will no longer be used anywhere, but this is optional and won't affect anything if left in place.

## Files Modified

| File | Change |
|------|--------|
| `src/assets/ct-logo.png` | Replaced with the new uploaded logo |
| `src/components/Navigation.tsx` | Line 173: change class to `logo-3d` |
| `src/components/CreativesTakeoverHeader.tsx` | Line 28: add `logo-3d` class to the logo img |
| `src/index.css` | Add `.logo-3d` class with subtle shadow/highlight styling |

## What Stays the Same

- Logo position (same Link wrapper, same container)
- Logo size (`h-10 w-auto`)
- All other navigation and page layout
- The logo's original colors and proportions (preserved from the uploaded image)

## Technical Notes

- The 3D depth effect is achieved purely with CSS `drop-shadow` and `filter` -- the uploaded image already has excellent 3D rendering with lighting, bevels, and highlights baked in. The CSS shadow reinforces the depth.
- No JavaScript changes needed beyond swapping the class name.
- Zero performance impact -- actually slightly better since the breathing animation keyframes are removed.
