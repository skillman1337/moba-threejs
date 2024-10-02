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

    this.mainTrackBuffers = []; // To store preloaded AudioBuffers
    this.ambientTrackBuffer = null;
    this.currentMainAudio = null;

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

    // Preload all main tracks and ambient track
    this.preloadTracks();
  }

  preloadTracks() {
    const audioLoader = new AudioLoader();
    const trackPromises = this.tracks.map((url) => this.loadAudioBuffer(audioLoader, url));
    const ambientPromise = this.loadAudioBuffer(audioLoader, this.ambientTrack);

    // Preload all main tracks
    Promise.all(trackPromises)
      .then((buffers) => {
        this.mainTrackBuffers = buffers;
        //console.log('All main tracks preloaded.');
      })
      .catch((error) => {
        console.error('Error preloading main tracks:', error);
      });

    // Preload ambient track
    ambientPromise
      .then((buffer) => {
        this.ambientTrackBuffer = buffer;
        //console.log('Ambient track preloaded.');
      })
      .catch((error) => {
        console.error('Error preloading ambient track:', error);
      });
  }

  loadAudioBuffer(audioLoader, url) {
    return new Promise((resolve, reject) => {
      audioLoader.load(
        url,
        (buffer) => {
          resolve(buffer);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  resumeAudioContext() {
    // console.log('Resuming audio context...');
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
    // Play the first main track if buffers are loaded
    if (!this.currentMainAudio && this.mainTrackBuffers.length > 0) {
      this.playMainTrack(this.currentTrackIndex);
    }

    // Play the ambient track if buffer is loaded and not already playing
    if (!this.isAmbientTrackPlaying && this.ambientTrackBuffer) {
      this.playAmbientTrack();
      this.isAmbientTrackPlaying = true;
    }
  }

  playMainTrack(index) {
    // Prepare the next audio
    const buffer = this.mainTrackBuffers[index];
    if (!buffer) {
      console.error(`No buffer found for main track index ${index}`);
      return;
    }

    const nextAudio = new Audio(this.listener);
    nextAudio.setBuffer(buffer);
    nextAudio.setLoop(false);
    nextAudio.setVolume(1.0); // Set volume to full immediately
    nextAudio.play();

    // Assign the onended event properly
    if (nextAudio.source) {
      nextAudio.source.onended = this.onMainTrackEnded.bind(this);
    } else {
      // If source not yet available, set a flag
      this.pendingMainTrackEnded = true;
    }

    // Stop the current audio immediately without fading
    if (this.currentMainAudio) {
      this.currentMainAudio.stop();
    }

    // Set the new audio as current
    this.currentMainAudio = nextAudio;
  }

  playAmbientTrack() {
    if (!this.ambientTrackBuffer) {
      console.error('Ambient track buffer not loaded.');
      return;
    }

    this.ambientTrackInstance = new Audio(this.listener);
    this.ambientTrackInstance.setBuffer(this.ambientTrackBuffer);
    this.ambientTrackInstance.setLoop(true);
    this.ambientTrackInstance.setVolume(1.0);
    this.ambientTrackInstance.play();
  }

  onMainTrackEnded() {
    // console.log(`Track ${this.currentTrackIndex + 1} ended.`);
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

    // console.log(`Playing track ${this.currentTrackIndex + 1}.`);
    this.playMainTrack(this.currentTrackIndex);
  }

  execute(delta, time) {
    // Check if the source is available and assign the onended handler if pending
    if (this.pendingMainTrackEnded && this.currentMainAudio.source) {
      this.currentMainAudio.source.onended = this.onMainTrackEnded.bind(this);
      this.pendingMainTrackEnded = false;
    }
  }
}

MusicSystem.queries = {
  renderer: { components: [WebGLRendererComponent] }
};

export { MusicSystem };
