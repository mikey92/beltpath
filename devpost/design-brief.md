---
status: approved
---

# Design brief: BeltPath

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
A parent kneels on the floor in front of the back seat, grabs the rear-facing car seat at the belt path, and shakes it side to side. Right on the seat they see a 2.5 cm (1 inch) ruler and a ghost outline of where the seat started, judge with their own eyes whether the seat edge crossed the red line, and answer with one big button. The Lens never measures and never says "pass."

**Scope:** one installation type only: a rear-facing convertible car seat installed with the vehicle seat belt (lap + shoulder). One check only: belt path + the 1-inch movement test.

**Why this matters:** In NHTSA's National Child Restraint Use Special Study, 44% of rear-facing convertible car seats were misused (46% across all car seats and boosters). When shaken side to side at the belt path, 36% of rear-facing convertible seats moved 1 inch or more. Locking the belt makes a large difference: in forward-facing seat-belt installs, 43% of seats with a locked belt (ALR) did not move side to side, versus only 15% with an unlocked belt (ELR).

**The 1-inch rule (NHTSA):** "You should not be able to move the car seat side-to-side or front-to-back more than 1 inch." NHTSA's install order: route the belt through the rear-facing belt path without twists → lock the belt (vehicle locking mode or the car seat's lock-off) → press down firmly on the car seat and tighten.

**Video opening shot:** from knee height, the belt path band and the ruler light up on the car seat.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free, shares your view.
- Why it's better than the phone or laptop version: both hands are on the seat and belt, so a phone can't be held. The ruler and ghost outline sit on the seat itself, at the exact spot where the 1-inch rule is checked, so the parent sees the movement against the line instead of guessing.

## Product or overlay
- Type: overlay. It responds to a real car seat in a real car.
- What the real version would sense: nothing is measured. The Lens only draws the ruler, the belt path band and the ghost outline. The parent judges the movement and answers with a button. On real glasses, the parent would align the ruler by pinching the side of the car seat once (feel unproven).
- Stand-in for the preview:
  - The car interior is built in the scene (see Preview environment below) instead of the default living room.
  - The car seat is a virtual object the user grabs and drags side to side to imitate the shake.
  - A demo-only toggle "DEMO: Loose / Tight" sets how far the seat can move. These distances are demo settings, not a judgment by the Lens:
    - Loose: the seat follows the drag up to 4 cm (crosses the 2.5 cm red line).
    - Tight: the seat stops at 1 cm.
    - On release, the seat springs back to its original position.
  - Default mode: Loose.

## Where things live
- Where the user is looking during the main task: the belt path (the groove at the bottom of the car seat where the vehicle belt passes). The parent kneels on the floor in front of the seat, about 35° off the seat's side axis; eyes about 75 cm high and about 55 cm from the belt path at the seat's side edge. The seat side edge, ghost line, ruler and red plate stay inside the SPECS render area.
- Belt path highlight: a bright light-blue band, 3 cm wide, following the real belt groove, attached to the car seat surface.
- Ruler: horizontal, lying on the vehicle seat cushion right beside the belt path, in the same vertical plane as the seat's front face. Anchored to the vehicle, so it stays still while the car seat moves. 10 cm long, mid-gray, 0.5 cm white tick marks, white numbers 0 1 2 3 4 5 10 (0.7 cm, semibold, at the strip's back edge right under their ticks, turned toward the parent around the vertical axis only) and an upright red plate 3 cm tall x 0.6 cm wide at the 2.5 cm mark, labeled "1 in / 2.5 cm" (semibold) with a thin red leader line from the label to the top of the plate. Zero is the car seat's side edge at its original position.
- Edge pin: a 0.4 cm light-blue vertical line attached to the car seat's side edge, from the belt path groove down to just above the ruler, ending in a 1 cm tip. It moves with the seat, so the parent sees it pass the red plate (or not) while the ghost stays at 0. It reuses the seat's own movement; nothing is measured.
- Ghost outline: at the car seat's original position, white semi-transparent outline only, no fill. No black (additive display renders black as transparent).
- Two answer buttons: shown 10 cm above the belt path, over the empty bench to the right of the seat edge so the band, ghost and pin stay visible, side by side, each 7 x 4 cm scaled 1.25x (about 9 x 5 cm), 2 cm gap, about 70 cm from the eyes. Left: "Crossed the line" (red border). Right: "Stayed inside" (green border). White text, 1.2 cm tall. Facing the user.
- Button look (all buttons: the two answers, "Check again", the demo toggle): light frosted fill like the cards (0.35, 0.42, 0.55 at 85%, about 5.4:1 with white text; hover and press slightly lighter, still at least 4.5:1), white semibold (600) text, 0.3 cm colored border (red / green; "Check again" takes its card's border color; demo toggle amber). Aimed at: brighter fill and thicker, lighter border. Pressed: brighter still.
- Align hint: "Pinch the seat edge at the belt path", white, 1.0 cm, just above the band at the seat's side edge, with a faint light-blue marker (3 cm wide) on the edge that pulses 3 times, then holds; it brightens when aimed at. Shown only until the align pinch.
- Result card: same place the buttons were. Light frosted fill (0.35, 0.42, 0.55 at 85%), red or white 0.3 cm border, white semibold text. Both cards 16 x 8 cm scaled 1.25x (20 x 10 cm, about 70 cm from the eyes) with 0.8 cm text and a 0.7 cm footnote; a 9 x 2.4 cm "Check again" button.
- Start labels: "Belt path" beside the band and the shake hint "Grab the seat here and shake" on the seat's side, white, 1.2 cm.
- Demo toggle (demo only, not part of the real-glasses design): small 6 x 3 cm toggle "DEMO: Loose / Tight" on the left door armrest, outside the view while looking at the belt path.

## Hands and input
Mouse = one hand pinching.
- Align zero (once, before the first shake): pinch the car seat's side edge at the belt path. The pinched point becomes the ruler's 0 and the ghost outline's edge (the ruler moves along its own axis only; it stays on the cushion in the seat's front-face plane). The Lens still never measures. Until then the seat cannot be grabbed.
- Shake: grab the side of the car seat near the belt path and drag left/right. Movement limited by the Loose/Tight mode; springs back on release.
- Answer: pinch "Crossed the line" or "Stayed inside".
- Restart: pinch "Check again" on the result card to go back to the start state.
- Demo toggle: pinch to switch Loose / Tight.
- Targets are big and highlight when aimed at.
- No two-hand gestures, no custom gestures, no voice.

## When things show
- Align (first time only): the band shows with the hint "Pinch the seat edge at the belt path"; the ruler, ghost outline and edge pin are hidden. After the pinch the ruler 0 and the ghost edge go to the seat edge (they never move more than 0.5 cm, so at rest the edge pin stands on ruler 0), the hint fades out and the parts come in one after another (see Motion below); the two start labels (incl. the shake hint) show for 3 s once the hint is gone. Grabbing the seat ends them at once; they never show in the far view.
- Start: band, ghost outline, ruler strip, numbers, red plate and edge pin come in one after another (see Motion below). The two start labels show for 3 s, then fade (gone at once on a grab; not in the far view). No cards or panels. "Check again" does not ask for the align pinch again.
- While grabbing: buttons and card hidden. Nothing flashes or sounds at the red plate: the Lens never measures, so it never reacts to the movement. The parent watches the pin against the plate.
- On release: the two buttons "Crossed the line" (red border) and "Stayed inside" (green border) appear 10 cm above the belt path, about 70 cm from the eyes (about 9 x 5 cm each). Pressing either hides the buttons, turns off the band's aimed-at glow, and shows the result card in the same spot (20 x 10 cm, white 0.8 cm text, 0.7 cm footnote, a "Check again" button in the card's border color).
- "Crossed the line" → red-bordered card, three steps (NHTSA's install order):
  "1  Lock the belt" / "2  Press the seat down hard" / "3  Pull the belt tight" + footnote "Lock = vehicle belt lock or the seat's lock-off" + a "Check again" button.
- "Stayed inside" → white card (not green):
  "No problem seen at the belt path." / "One check, not a full inspection." + footnote "Free check: nhtsa.gov > Car Seats > Inspection, or Safe Kids Worldwide" + a "Check again" button. No raw URL in the Lens; the full locator link stays in Sources below.
- Never use the words "pass", "safe" or "approved" anywhere as a verdict. Only exception: the organization name "Safe Kids Worldwide".
- If something needs attention out of view: if the car seat is out of view at start, a short chime plus a small arrow at the edge of the view points toward it.

## Changes after review
Owner-approved changes made after the first build and the independent judge review:
- Viewpoint: the parent kneels in front of the seat about 35° off its side axis (was straight on), so the shell, wings and belt are visible.
- Ruler: mid-gray strip with white numbers 0 1 2 3 4 5 10 (about 0.75 cm, smaller than 0.9 cm so they don't overlap at this angle) and the label "1 in / 2.5 cm"; it sits in the seat's front-face plane.
- Red line → upright red plate, 3 cm tall x 0.6 cm wide.
- New edge pin on the seat's side edge (moves with the seat).
- Removed the red-line flash and tick sound (the Lens never measures).
- Car seat: rear-facing shell with reclined backrest, head wings, light-teal accent edges, 5-point harness, chest clip, crotch buckle, head pad; vehicle lap belt in dark gray webbing with a silver latch plate into a silver buckle on the bench, right of the seat.
- Belt path band is semi-transparent so the belt shows through.
- Start labels "Belt path" and "Grab the seat here and shake" for 3 s.
- Cards: shorter wording (above), red card 16 x 9 cm, light frosted fill, no raw URL; buttons and cards sit above the seat front face, still 10 cm above the belt path, about 56 cm from the eyes (over the bench they were clipped by the SPECS view); they draw on top so the virtual seat back cannot hide them.

- Fix pass (2026-11-05): all buttons restyled from the dark UI Kit default to the cards' light frosted fill with white semibold text and 0.3 cm colored borders; hover/press stay visible.
- Align zero: one pinch on the seat's side edge at the belt path sets the ruler 0 and the ghost edge (real-glasses behavior, demoable in preview); hint "Pinch the seat edge at the belt path" until then. The Lens still never measures.
- Seat grab box lowered to 14 cm tall (was 20): it reached up into the answer buttons and card, so a real mouse click on "Crossed the line" / "Stayed inside" grabbed the seat instead (found by clicking in Interactive Preview; LEAF triggers buttons directly and had missed it).
- The result card body now catches pinches that miss "Check again", so they no longer fall through to the seat behind it (which started a shake and dismissed the card).
- Harness straps at the kneel view: left as is. At eye height 75 cm / 55 cm the straps lie on the inner face of the reclined backrest, which faces away from the parent; even with the whole near side wing and wall removed they stay hidden behind the backrest shell, so lowering the wing by 3 cm cannot show them without changing eye height or distance.
- Review 2 (Apple HIG + judge review of 3e6bdc6), applied with the motion pass (2026-11-05). Supersedes the ruler-number, card-size and 56 cm notes above:
  - Ruler numbers: the view-specific shift is gone; numbers sit at the strip's back edge right under their ticks, 0.7 cm, semibold, turned toward the parent around the vertical axis only. "1 in / 2.5 cm" is semibold with a thin (0.08 cm) red leader line to the top of the red plate.
  - Cards: red card is the three steps "1  Lock the belt" / "2  Press the seat down hard" / "3  Pull the belt tight" plus the 0.7 cm footnote "Lock = vehicle belt lock or the seat's lock-off"; white card is "No problem seen at the belt path." / "One check, not a full inspection." plus the 0.7 cm footnote "Free check: nhtsa.gov > Car Seats > Inspection, or Safe Kids Worldwide". Both 16 x 8 cm before scaling; "Check again" is 2.4 cm tall so the three steps and the footnote never overlap.
  - Contrast: cards and buttons use a frosted fill (0.35, 0.42, 0.55 at 85%), about 5.4:1 with white text; hover and press are slightly lighter and stay at least 4.5:1.
  - Distance: cards and answer buttons moved 15 cm farther (about 70 cm from the eyes) and scaled 1.25x (cards 20 x 10 cm, buttons about 9 x 5 cm), so they look the same size; still 10 cm above the belt path.
  - Align target widened to 3 cm side to side.
  - Done criterion 1 also checks that the ruler lies within the central 70% of the view width.
  - Screenshots: the camera looks 1.5° down so the ruler sits near the lower third (about 73% down the frame). Looking down 3° would put it at the lower-third line but cut off the top of the result card, which must stay 10 cm above the belt path.
- Motion (owner request, 2026-11-05). Calm and short; nothing loops, nothing moves toward the face, no parallax, nothing moves while the parent shakes the seat:
  - Start labels and the align hint fade in (300 ms, ease-out); the labels leave after 3 s (250 ms, ease-in). After the align pinch the labels wait until the hint has faded out, so the two never overlap.
  - After the align pinch, band, ghost outline, ruler strip, numbers 0 to 10, red plate and edge pin come in one after another, 80 ms apart, 220 ms each (ease-out); band, ghost and pin also rise 0.5 cm, the ruler parts only fade (they sit low in the view). About 0.6 s in total.
  - Answer buttons and cards rise 2 cm from below their spot while fading in (250 ms, ease-out; left button first, right 60 ms later) and leave by fading down 1 cm (180 ms, ease-in).
  - While dragging, the seat follows the hand 1:1. On release it springs back critically damped in about 400 ms with no overshoot; the edge pin moves with it exactly.
  - Buttons shrink to 0.96 on pinch and come back (120 ms, ease-out); aimed at, the border brightens.
  - The align marker pulses 3 times, then holds; it brightens when aimed at.
  - The red plate never flashes or counts (the Lens never measures).
  - Reduce motion: one switch (BeltPathMain "Reduce motion", or the constant in BeltPathMotion.ts) makes every animation instant. Tests run with motion on and wait for it to settle.
  - Every animation is driven by the always-on main script, so an animation on a card or button that switches off can no longer stop half-way (it had left "Check again" at 0.998 scale and kept the tests waiting).
  - Video only (not in the Lens): the NHTSA numbers 44% and 36% count up on the title card (600 ms, ease-out).
- Bug-fix pass (2026-11-05, code review of the motion pass): the align pinch moves the ruler 0 to the seat edge by at most 0.5 cm, so at rest the edge pin stands on ruler 0 (C6 now checks the pin against ruler 0); ruler numbers are 0.8 cm tall, and the "0" sits 0.4 cm toward the parent and to their left and draws over the seat corner, ghost line and pin so it stays readable; pressing an answer turns off the band's aimed-at glow; switching to Tight during the spring-back no longer jumps; a hand ray that misses the grab plane skips that frame instead of jumping the seat; animations on hidden objects jump to their end; the test drag is time-based so a slow preview still reaches 4 cm.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Standing at knee height (eye height about 75 cm from the floor, 55 cm from the belt path), the belt path band, the 10 cm ruler, the 2.5 cm red plate, the edge pin and the ghost outline are all visible in one view.
2. In Loose mode, grabbing and dragging the car seat moves its edge (and the edge pin) past the 2.5 cm red plate, up to 4 cm. In Tight mode it stops at 1 cm.
3. On release, the two buttons appear 10 cm above the belt path. "Crossed the line" shows the red tightening card; "Stayed inside" shows the inspection-station card, in the same spot. No screen contains the words "pass" or "safe" (except the organization name "Safe Kids Worldwide").
4. Pressing "Check again" hides the buttons and card, returns the seat to its original position, and restores the start state.
5. The demo toggle sits on the door armrest and is not visible from the main view of the belt path.
6. Align zero: before the parent pinches the seat edge, the ruler (and ghost and pin) is hidden and the hint "Pinch the seat edge at the belt path" shows; after the pinch the ruler's 0 is within 0.5 cm of the pinched point along the ruler and the hint is hidden.

Write a LEAF scenario for each criterion (grab-drag distance, button pinch, card text check).

## Preview environment
Replace the default living room with a car back-seat interior at real size:
- Back bench seat 130 cm wide, seat cushion 45 cm above the floor.
- Inner door panels with armrests on both sides, floor, seat belt buckle.
- The car seat is built from simple shapes (shell + belt guide groove) instead of a generated 3D model, so the belt path is clearly visible.
- Light interior colors (gray, beige). No black.

## Out of scope
- Harness height, chest clip position.
- Forward-facing seats, LATCH installation.
- Recognizing or measuring a real car seat.
- Voice.
- Recording or filming people.

## Risks and open questions
- On real glasses the Lens still does not measure movement; it only draws the ruler. In the preview the seat is virtual, so Loose/Tight imitates the movement (demo only).
- Aligning the ruler to the real seat edge on glasses would be one pinch on the side of the seat: feel unproven.
- Hand shake and real hand-tracking accuracy while pulling a belt: feel unproven.
- The rule covers side-to-side and front-to-back movement; the demo only shows side to side.
- A rear-facing convertible shell is often wider than 38 cm, so at 55 cm the whole belt path band may not fit in the glasses' view at once. The ruler and the seat edge it measures should stay in view.
- The red card fits 16 x 8 cm (before the 1.25x scale) only with a 2.4 cm tall "Check again" button; longer wording would need a bigger card.
- Sources: original text checked by the learner (2026-11-05).

## Sources
Use these same numbers in the Devpost description and the video.
- NHTSA, DOT HS 812 142, "Results of the National Child Restraint Use Special Study" (published May 2015; observed June–July 2011):
  - Misuse: 46% of all car seats and boosters; forward-facing 61%, rear-facing infant 49%, rear-facing convertible 44% (this Lens's scope).
  - Side-to-side movement at the belt path (Table 2), rear-facing convertible: 36% moved 1 inch or more (1 in 18%, 2 in 13%, 3 in 5%, unknown 4%).
  - Locking (Table C-12 text; forward-facing seat-belt installs, not rear-facing): locked belt (ALR) 43% did not move side to side; unlocked (ELR) 15%.
- NHTSA, "How to Install Rear-Facing Car Seats": https://www.nhtsa.gov/car-seats-and-booster-seats/how-install-rear-facing-car-seats — the 1-inch rule and the install order above.
- NHTSA, car seat inspection help: https://www.nhtsa.gov/vehicle-safety/car-seats-and-booster-seats#installation-help-inspection — "Certified technicians will inspect your car seat free of charge, in most cases."

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
