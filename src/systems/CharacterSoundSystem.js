import { System } from 'ecsy';
import { CharacterSoundComponent } from '../components/CharacterSoundComponent.js';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import { CharacterComponent } from '../components/CharacterComponent.js';
import { AudioLoader, AudioListener, Audio } from 'three';

class CharacterSoundSystem extends System {
  init() {
    this.handleRightClick = this.handleRightClick.bind(this);
    this.eventListenersInitialized = false;
  }

  execute(delta, time) {
    if (!this.eventListenersInitialized) {
      document.addEventListener('contextmenu', this.handleRightClick);
      this.eventListenersInitialized = true;
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
    const sound = new Audio(listener);

    // Load the sound and play it
    audioLoader.load(soundFile, function (buffer) {
      sound.setBuffer(buffer);
      sound.setLoop(false);
      sound.setVolume(1.0);
      sound.play();
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
      characterComponent.character.add(sound);
    }
  }
}

CharacterSoundSystem.queries = {
  character: { components: [CharacterSoundComponent] },
  renderer: { components: [WebGLRendererComponent] }
};

export { CharacterSoundSystem };
