/**
 * BeltPathMotion — the one place for BeltPath's motion (agent/motion-spec.md).
 *
 * Owns: the reduce-motion switch (REDUCE_MOTION constant + the user-facing @input on BeltPathMain
 * that calls setReduceMotion), every motion duration, the easing curves, a tiny time-based tween
 * runner and the shared button press feedback. With reduce motion on, every duration is 0, so each
 * tween jumps straight to its end value in the same frame.
 *
 * Rules (motion spec): short (150-350 ms), ease-out for things arriving, ease-in for leaving,
 * spring only for the seat return; nothing loops, nothing moves toward the face, no parallax.
 * Tests: activeTweenCount() === 0 means every animation has settled (BeltPathMain.isMotionSettled).
 *
 * Must not: own flow state or decide what shows — callers start tweens, this file only runs them.
 */

/** Set true to turn every animation off (all durations 0). Tests can also use BeltPathMain.reduceMotion. */
export const REDUCE_MOTION = false

let reduce = REDUCE_MOTION

/** Turns reduce motion on/off at runtime (BeltPathMain's @input). The constant above still wins when true. */
export function setReduceMotion(on: boolean): void { reduce = REDUCE_MOTION || on }
export function isReduceMotion(): boolean { return reduce }

/** Every motion duration, in ms (motion-spec.md). */
export const MotionMs = {
  /** 1. Start labels and align hint fade in (ease-out). */
  fadeIn: 300,
  /** 1. Start labels stay this long before leaving (a hold, not an animation). */
  labelHold: 2000,
  /** 1. Start labels fade out (ease-in). */
  labelFadeOut: 250,
  /** 1. Align hint leaves after the pinch (ease-in). */
  hintFadeOut: 180,
  /** 2. Stagger after the align pinch: step between items and each item's fade (+ rise). */
  staggerStep: 80,
  staggerItem: 220,
  /** 3. Buttons and cards arrive (ease-out) / leave (ease-in); answer buttons stagger left then right. */
  slideIn: 250,
  slideOut: 180,
  buttonStagger: 60,
  /** 5. Press feedback (ease-out). */
  press: 120,
  /** 4. Seat spring back (critically damped). */
  seatReturn: 400,
  /** Align marker: 3 gentle pulses, then it holds. */
  markerPulse: 1000,
} as const

/** Distances (cm) for the motions above. */
export const MotionCm = {
  staggerRise: 0.5,
  slideInRise: 2,
  slideOutDrop: 1,
} as const

/** Press feedback scale. */
export const PRESS_SCALE = 0.96

let clockOverride: number | null = null

/**
 * Debug/capture only: freeze the motion clock at `t` seconds (null = real time). Lets a capture
 * scenario photograph the stagger at exact moments even when the preview is slow.
 */
export function debugSetMotionClock(t: number | null): void { clockOverride = t }

/** The motion clock (seconds): getTime(), unless a capture froze it. */
export function motionNow(): number { return clockOverride === null ? getTime() : clockOverride }

/** Duration in seconds, 0 when reduce motion is on. */
export function sec(ms: number): number { return reduce ? 0 : ms / 1000 }

export type Ease = (t: number) => number
export const linear: Ease = (t) => t
/** Things arriving. */
export const easeOut: Ease = (t) => 1 - Math.pow(1 - t, 3)
/** Things leaving. */
export const easeIn: Ease = (t) => t * t * t

export type TweenOptions = {
  /** Animation length in ms (0 under reduce motion). */
  durMs: number
  /** Wait before starting, in ms (0 under reduce motion). */
  delayMs?: number
  ease?: Ease
  from?: number
  to?: number
  /** Called with the eased value, once at creation (with `from`) and every frame after. */
  onUpdate: (v: number) => void
  onDone?: () => void
}

const active: Tween[] = []

let driver: BaseScriptComponent | null = null

/**
 * Runs every tween from one always-enabled component (BeltPathMain). A tween must not depend on
 * its owner's UpdateEvent: when the owner's object is switched off (a card or button row that
 * just left), that event stops and the tween would hang half-way (e.g. a press scale stuck at
 * 0.998, and isMotionSettled never true). Without a driver, tweens fall back to the owner.
 */
export function setTweenDriver(owner: BaseScriptComponent): void {
  if (driver) return
  driver = owner
  owner.createEvent("UpdateEvent").bind(() => {
    for (const t of active.slice()) t.step()
  })
}

/** One running animation. Created by tween(); cancel() stops it where it is, finish() jumps to the end. */
export class Tween {
  private ev: SceneEvent | null = null
  private t0: number
  private done = false

  constructor(private owner: BaseScriptComponent, private o: TweenOptions) {
    this.t0 = motionNow() + sec(o.delayMs || 0)
  }

  /** @internal */
  start(): void {
    const from = this.o.from === undefined ? 0 : this.o.from
    this.o.onUpdate(from)
    // An owner that is switched off (or under a switched-off parent) shows nothing: jump to the end.
    let ownerOn = true
    try { ownerOn = this.owner.getSceneObject().isEnabledInHierarchy } catch (e) { ownerOn = true }
    if (!ownerOn || (sec(this.o.durMs) <= 0 && sec(this.o.delayMs || 0) <= 0)) {
      this.finish()
      return
    }
    active.push(this)
    if (driver) return
    this.ev = this.owner.createEvent("UpdateEvent")
    this.ev.bind(() => this.step())
  }

  isActive(): boolean { return !this.done }

  /** Stops without moving to the end value. */
  cancel(): void {
    if (this.done) return
    this.done = true
    this.cleanup()
  }

  /** Jumps to the end value now and calls onDone. */
  finish(): void {
    if (this.done) return
    this.done = true
    this.cleanup()
    this.o.onUpdate(this.o.to === undefined ? 1 : this.o.to)
    if (this.o.onDone) this.o.onDone()
  }

  /** @internal Advances to the motion clock's now (called once per frame by the driver). */
  step(): void {
    if (this.done) return
    const d = sec(this.o.durMs)
    const now = motionNow()
    if (now < this.t0) return
    const k = d <= 0 ? 1 : Math.min(1, (now - this.t0) / d)
    if (k >= 1) { this.finish(); return }
    const e = (this.o.ease || linear)(k)
    const from = this.o.from === undefined ? 0 : this.o.from
    const to = this.o.to === undefined ? 1 : this.o.to
    this.o.onUpdate(from + (to - from) * e)
  }

  private cleanup(): void {
    const i = active.indexOf(this)
    if (i >= 0) active.splice(i, 1)
    if (this.ev) {
      this.owner.removeEvent(this.ev)
      this.ev = null
    }
  }
}

/** Starts a tween from `from` (default 0) to `to` (default 1). */
export function tween(owner: BaseScriptComponent, o: TweenOptions): Tween {
  const t = new Tween(owner, o)
  t.start()
  return t
}

/** Number of animations still running (0 = everything has settled). */
export function activeTweenCount(): number { return active.length }

/** Jumps every running animation to its end (used when the seat is grabbed: nothing moves while shaking). */
export function finishAllTweens(): void {
  for (const t of active.slice()) t.finish()
}

/** The part of a UI Kit Button the press feedback needs (kept structural so this file has no UI Kit import). */
export type PressableButton = {
  onTriggerDown: { add: (cb: (e: any) => void) => any }
  onTriggerUp: { add: (cb: (e: any) => void) => any }
  onHoverExit: { add: (cb: (e: any) => void) => any }
}

/** Handle returned by addPressFeedback: reset() stops the press tween and puts the scale back to 1. */
export type PressFeedback = { reset: () => void }

/**
 * 5. Press feedback: the button scales to 0.96 on pinch-down and back to 1 on release (ease-out
 * 120 ms each). `target` is the SceneObject that scales (the button itself). Hover brightening is
 * the frosted style's border (styleFrostedButton). A hidden button snaps to scale 1 at once, and
 * hide paths call reset() so no press tween is left running.
 */
export function addPressFeedback(owner: BaseScriptComponent, btn: PressableButton, target: SceneObject): PressFeedback {
  const tr = target.getTransform()
  const base = tr.getLocalScale()
  let cur = 1
  let tw: Tween | null = null
  const reset = (): void => {
    if (tw) { tw.cancel(); tw = null }
    cur = 1
    tr.setLocalScale(base)
  }
  const go = (to: number): void => {
    if (!target.isEnabledInHierarchy) { reset(); return }
    if (tw) tw.cancel()
    const from = cur
    tw = tween(owner, {
      durMs: MotionMs.press, ease: easeOut, from, to,
      onUpdate: (v) => { cur = v; tr.setLocalScale(base.uniformScale(v)) },
    })
  }
  btn.onTriggerDown.add(() => go(PRESS_SCALE))
  btn.onTriggerUp.add(() => go(1))
  btn.onHoverExit.add(() => { if (cur !== 1) go(1) })
  return { reset }
}
