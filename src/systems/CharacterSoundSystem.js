import { System } from 'ecsy';
import { CharacterSoundComponent } from '../components/CharacterSoundComponent.js';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import { CharacterComponent } from '../components/CharacterComponent.js';
import { AudioLoader, AudioListener, Audio } from 'three';
import { SoundComponent } from '../components/SoundComponent.js';

class CharacterSoundSystem extends System {
  init() {
    this.handleRightClick = this.handleRightClick.bind(this);
    this.eventListenersInitialized = false;
    this.soundComponent = null;
    this.currentSound = null;
  }

  execute(delta, time) {
    if (!this.eventListenersInitialized) {
      document.addEventListener('contextmenu', this.handleRightClick);
      this.eventListenersInitialized = true;
    }

    if (!this.soundComponent) {
      const soundEntities = this.queries.sound.results;
      if (soundEntities.length > 0) {
        this.soundComponent = soundEntities[0].getComponent(SoundComponent);
      }
    }

    if (this.currentSound && this.soundComponent) {
      this.currentSound.setVolume(this.soundComponent.volume);
    }
  }

  handleRightClick(event) {
    event.preventDefault();
    const characterEntity = this.queries.character.results[0];
    if (!characterEntity) return;

    const soundComponent = characterEntity.getMutableComponent(CharacterSoundComponent);
    if (!soundComponent) return;

    const currentTime = Date.now();
    const timeSinceLastPlay = currentTime - soundComponent.lastPlayTime;

    // Ensure at least 4 seconds between plays
    if (timeSinceLastPlay < 4000) return;

    const soundFile = soundComponent.sounds[soundComponent.currentSoundIndex];

    this.playSound(characterEntity, soundFile);
    soundComponent.lastPlayTime = currentTime;
    soundComponent.currentSoundIndex =
      (soundComponent.currentSoundIndex + 1) % soundComponent.sounds.length;
  }

  playSound(entity, soundFile) {
    const audioLoader = new AudioLoader();
    const listener = new AudioListener();
    this.currentSound = new Audio(listener);

    // Load the sound and play it
    audioLoader.load(soundFile, (buffer) => {
      this.currentSound.setBuffer(buffer);
      this.currentSound.setLoop(false);
      this.currentSound.setVolume(1);
      this.currentSound.play();
    });

    // Attach listener to the camera
    const rendererEntity = this.queries.renderer.results[0];
    if (rendererEntity) {
      const renderer = rendererEntity.getComponent(WebGLRendererComponent);
      renderer.camera.getObject3D().add(listener);
    }

    // Optionally, attach sound to character position to simulate 3D sound
    const characterComponent = entity.getComponent(CharacterComponent);
    if (characterComponent && characterComponent.character) {
      characterComponent.character.add(this.currentSound);
    }
  }
}

CharacterSoundSystem.queries = {
  character: { components: [CharacterSoundComponent] },
  renderer: { components: [WebGLRendererComponent] },
  sound: { components: [SoundComponent] }
};

export { CharacterSoundSystem };
