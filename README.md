# BeltPath — a 1-inch belt path check for rear-facing car seats on SPECS

A parent kneels at the back seat, pinches the car seat's edge at the belt path, then shakes the seat. A ruler and a ghost outline sit on the seat itself, so the parent can see whether the seat moved past 1 inch. The parent answers with one big button. **The Lens never measures and never says "safe."** If the seat moved too much, it shows NHTSA's three steps. If not, it says this was one check, not a full inspection, and points to a free certified inspection.

**Demo video:** https://youtu.be/GhnOmoLj2v8

Built for Devpost's *Learn AR with SPECS*. It was planned with the Devpost Learn skill pack and built with Snap's CLAD in Lens Studio. It runs in the Lens Studio preview, and no glasses are needed.

## Why
- **44%** of rear-facing convertible car seats were misused in NHTSA's National Child Restraint Use Special Study (46% across all car seats and boosters). *DOT HS 812 142, 2015; observed in 2011.*
- When shaken side to side at the belt path, **36%** of rear-facing convertible seats moved 1 inch or more (Table 2).
- NHTSA's rule: *"You should not be able to move the car seat side-to-side or front-to-back more than 1 inch."* ([How to Install Rear-Facing Car Seats](https://www.nhtsa.gov/car-seats-and-booster-seats/how-install-rear-facing-car-seats))

## Why glasses
Both hands are on the seat and the belt, so a phone can't be held. The ruler and the ghost line sit at the exact spot where the 1-inch rule is checked, at real size, and stay out of the way otherwise.

## What it does (one spatial moment)
1. **Align:** "Pinch the seat edge at the belt path." The ruler's 0 and the ghost line snap to that point.
2. **Shake:** grab the seat at the belt path and drag it side to side. An edge pin moves with the seat over a 10 cm ruler with an upright red plate at 2.5 cm (1 in). The ghost stays at 0.
3. **Answer:** release, then pick *Crossed the line* or *Stayed inside*.
4. **Result:**
   - Red card: *1 Lock the belt · 2 Press the seat down hard · 3 Pull the belt tight*.
   - White card: *No problem seen at the belt path. One check, not a full inspection.* plus where to get a free check.
   - Neither card ever says "pass" or "safe."

**Preview stand-in (demo only):** the car seat is virtual, so a **DEMO: Loose / Tight** toggle on the **left door armrest** sets how far it can move (Loose 4 cm, Tight 1 cm). On real glasses, there is no toggle and nothing is measured. The parent reads the ruler.

## Design decisions
- **The rule decides, not the Lens.** The parent judges and the rule picks the card. There is no camera vision, no AI verdict, and no flash or sound when the line is crossed.
- **Everything sits at the belt path.** It's about 55 cm from the eyes when kneeling, and it fits SPECS' narrow view.
- **Display:** the display is additive, so there is no black. Panels use a light frosted fill with 0.3 cm colored borders and white weight-600 text.
- **Big targets:** answer buttons are 7×4 cm before the panel's 1.25× scale (about 9×5 cm as seen), all driven by standard SIK pinches.
- **Motion:** short, calm, and only to guide the eye.

## How it was built
1. **Plan:** the Devpost `plan-lens` skill interviewed the idea and wrote `devpost/design-brief.md` (approved, with a "Changes after review" log).
2. **Build:** Built in Lens Studio 5.23.2 with Snap's CLAD plugin and the Lens Studio MCP: scene, scripts and car interior. It runs in the Lens Studio preview.
3. **Test:** six LEAF scenarios drive real SIK interactions in the preview.

| # | Done criterion | LEAF |
|---|---|---|
| 1 | From the kneel spot, the band, ruler, red plate, ghost and pin are all in view | pass |
| 2 | Loose stops at 4 cm, Tight stops at 1 cm | pass |
| 3 | Buttons 10 cm above the belt path; card text exact; no "pass/safe"; a ray hits the button first | pass |
| 4 | Check again restores the start state | pass |
| 5 | The demo toggle is outside the main view and works | pass |
| 6 | Pinch-to-align: the ruler is hidden until the pinch, then 0 lands within 0.5 cm | pass |

4. **Review:** two independent design reviews against the judging criteria and Apple's spatial HIG led to the edge pin, the shorter cards, the higher contrast and the removal of the flash.

## Run it
1. Open `BeltPath.esproj` in Lens Studio 5.23.2 or newer and choose **Interactive Preview**.
2. Use WASD to move, Q and E to go down and up, and right-drag to look. Clicking acts as a pinch.
3. Kneel at the seat. Pinch the seat edge, then drag the seat. Look left at the armrest to switch Loose and Tight.
4. To run the tests, open the LEAF panel and run `beltpath-c1` … `beltpath-c6`.

## Limits (honest)
- Preview only. The seat is virtual, and Loose/Tight are demo settings.
- Only side-to-side movement is shown. Front-to-back is out of scope.
- These are untested and need real glasses: real hand-tracking, aligning to a real seat edge, and comfort over time.
- Harness height, chest clip, forward-facing seats and LATCH installs are out of scope.
- This is not a substitute for a certified Child Passenger Safety Technician.

## Sources
- NHTSA, *Results of the National Child Restraint Use Special Study*, DOT HS 812 142 (2015).
- NHTSA, [How to Install Rear-Facing Car Seats](https://www.nhtsa.gov/car-seats-and-booster-seats/how-install-rear-facing-car-seats).
- NHTSA, [Car seat inspection help](https://www.nhtsa.gov/vehicle-safety/car-seats-and-booster-seats#installation-help-inspection).

License: MIT for the original work. See `NOTICE.md` for Snap packages and other third-party parts.
