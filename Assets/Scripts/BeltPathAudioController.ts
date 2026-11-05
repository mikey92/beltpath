/**
 * BeltPathAudioController — the two short cues of the check.
 *
 * Owns: AudioComponents for the off-view chime and the button click. (No red-line sound:
 * the Lens never measures the movement, so nothing reacts to the line.)
 * Cues are input-reactive, so they use LowLatency playback (Specs default is LowPower).
 * Must not: decide when to play — the main script calls playChime / playClick.
 */
const CHIME = requireAsset("../GeneratedSFX/OffViewChime.wav") as AudioTrackAsset
const CLICK = requireAsset("../GeneratedSFX/ButtonClick.wav") as AudioTrackAsset

@component
export class BeltPathAudioController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">BeltPathAudioController – chime and click cues</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Volume of the chime played when the car seat is out of view at start.")
  @widget(new SliderWidget(0, 1, 0.05))
  chimeVolume: number = 0.6

  @input
  @hint("Volume of the soft click on button presses.")
  @widget(new SliderWidget(0, 1, 0.05))
  clickVolume: number = 0.5
  @ui.group_end

  private chime!: AudioComponent
  private click!: AudioComponent
  private chimeCount: number = 0

  onAwake(): void {
    this.chime = this.make("ChimeAudio", CHIME, this.chimeVolume)
    this.click = this.make("ClickAudio", CLICK, this.clickVolume)
  }

  playChime(): void { this.chimeCount++; this.safePlay(this.chime) }
  playClick(): void { this.safePlay(this.click) }

  /** Test helper: how many times each cue has been requested. */
  getChimeCount(): number { return this.chimeCount }

  private make(name: string, track: AudioTrackAsset, volume: number): AudioComponent {
    const so = global.scene.createSceneObject(name)
    so.setParent(this.sceneObject)
    const a = so.createComponent("Component.AudioComponent") as AudioComponent
    a.audioTrack = track
    a.volume = volume
    a.playbackMode = Audio.PlaybackMode.LowLatency
    return a
  }

  private safePlay(a: AudioComponent): void {
    if (!a) return
    if (a.isPlaying()) a.stop(false)
    a.play(1)
  }
}
