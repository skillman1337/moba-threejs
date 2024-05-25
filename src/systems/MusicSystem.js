import { System } from 'ecsy';
import { AudioLoader, AudioListener, Audio } from 'three';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent';
class MusicSystem extends System {
  init() {
    this.currentTrackIndex = 0;
    this.loopCount = 0;
    this.tracks = [
      '/assets/sound/GameMusicEvents_bank00/30_LoL_MUSIC_TreelineINTRO_142.wav',
      '/assets/sound/GameMusicEvents_bank00/31_LoL_MUSIC_TreelineLANING_142.wav',
      '/assets/sound/GameMusicEvents_bank00/32_LoL_MUSIC_TreelinePUSHING_180.wav'
    ];
    this.ambientTrack = '/assets/sound/GameAmbientEvent_bank00/3_LoL_TreelineAmbience_Final.wav';

    this.mainTrack = null;
    this.ambientTrackInstance = null;
    this.isAmbientTrackPlaying = false;
    this.listener = new AudioListener();

    // Add listener to the camera or an arbitrary object in the scene
    const rendererEntity = this.queries.renderer.results[0];
    if (rendererEntity) {
      const renderer = rendererEntity.getComponent(WebGLRendererComponent);
      renderer.camera.getObject3D().add(this.listener);
    }

    // Add event listeners to resume AudioContext on any user interaction
    document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
    document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true });
  }

  resumeAudioContext() {
    console.log('Resuming audio context...');
    if (this.listener.context.state === 'suspended') {
      this.listener.context.resume().then(() => {
        console.log('Audio context resumed.');
        this.playInitialTracks();
      });
    } else {
      this.playInitialTracks();
    }
  }

  playInitialTracks() {
    // Play the main track and ambient track only once
    if (!this.mainTrack) {
      this.loadAndPlayTrack(this.tracks[this.currentTrackIndex]);
    }
    if (!this.isAmbientTrackPlaying) {
      this.loadAndPlayAmbientTrack(this.ambientTrack);
      this.isAmbientTrackPlaying = true;
    }
  }

  loadAndPlayTrack(url) {
    if (this.mainTrack) {
      this.mainTrack.stop();
    }

    const audioLoader = new AudioLoader();
    audioLoader.load(
      url,
      (buffer) => {
        this.playMainTrack(buffer);
      },
      undefined,
      (error) => {
        console.error('Error loading audio file:', error);
      }
    );
  }

  loadAndPlayAmbientTrack(url) {
    const audioLoader = new AudioLoader();
    audioLoader.load(
      url,
      (buffer) => {
        this.playAmbientTrack(buffer);
      },
      undefined,
      (error) => {
        console.error('Error loading ambient audio file:', error);
      }
    );
  }

  playMainTrack(buffer) {
    this.mainTrack = new Audio(this.listener);
    this.mainTrack.setBuffer(buffer);
    this.mainTrack.setLoop(false);
    this.mainTrack.setVolume(1.0);
    this.mainTrack.play();
    this.mainTrack.onEnded = this.onMainTrackEnded.bind(this);
  }

  playAmbientTrack(buffer) {
    this.ambientTrackInstance = new Audio(this.listener);
    this.ambientTrackInstance.setBuffer(buffer);
    this.ambientTrackInstance.setLoop(true);
    this.ambientTrackInstance.setVolume(1.0);
    this.ambientTrackInstance.play();
  }

  onMainTrackEnded() {
    switch (this.currentTrackIndex) {
      case 0:
        this.currentTrackIndex = 1;
        break;
      case 1:
        if (this.loopCount < 2) {
          this.loopCount++;
        } else {
          this.currentTrackIndex = 2;
          this.loopCount = 0; // Reset loop count for future uses
        }
        break;
      case 2:
        this.currentTrackIndex = 0; // Restart from the beginning
        break;
    }

    this.loadAndPlayTrack(this.tracks[this.currentTrackIndex]);
  }
}

MusicSystem.queries = {
  renderer: { components: [WebGLRendererComponent] }
};

export { MusicSystem };
