import { System } from 'ecsy';
import { CharacterComponent } from '../components/CharacterComponent.js';
import { directionalLight0, directionalLight1, directionalLight2 } from '../config/lightConfig.js';
import {
  NoToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  ACESFilmicToneMapping,
  CustomToneMapping,
  AgXToneMapping,
  NeutralToneMapping
} from 'three';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import { toneMapping, toneMappingExposure } from '../config/renderConfig.js';

const toneMappingTypes = [
  { name: 'No Tone Mapping', value: NoToneMapping },
  { name: 'Linear', value: LinearToneMapping },
  { name: 'Reinhard', value: ReinhardToneMapping },
  { name: 'Cineon', value: CineonToneMapping },
  { name: 'ACES Filmic', value: ACESFilmicToneMapping },
  { name: 'Custom', value: CustomToneMapping },
  { name: 'AgX', value: AgXToneMapping },
  { name: 'Neutral', value: NeutralToneMapping }
];

class DebugHudSystem extends System {
  init() {
    this.setupToneMappingControls();
    this.setupLightControls();
    this.setupToggleLightControls();
  }

  execute(delta, time) {
    this.queries.characters.results.forEach((entity) => {
      const characterPosition = entity.getComponent(CharacterComponent).position;
      const characterInfo = document.getElementById('character-info');
      characterInfo.innerHTML = `Character Position: x: ${characterPosition.x.toFixed(
        2
      )}, y: ${characterPosition.y.toFixed(2)}, z: ${characterPosition.z.toFixed(2)}`;
    });
  }

  setupToneMappingControls() {
    const toneMappingSelector = document.getElementById('tone-mapping-selector');
    const exposureSlider = document.getElementById('tone-mapping-exposure');

    // Dynamically generate select options
    toneMappingTypes.forEach((type) => {
      const option = document.createElement('option');
      option.value = type.name.replace(/\s+/g, ''); // Remove spaces for value
      option.textContent = type.name;
      toneMappingSelector.appendChild(option);
    });

    // Set default values
    const defaultToneMapping = toneMappingTypes
      .find((t) => t.value === toneMapping)
      .name.replace(/\s+/g, '');
    const defaultExposure = 1.0;

    toneMappingSelector.value = defaultToneMapping;
    exposureSlider.value = defaultExposure;

    // Add event listeners
    toneMappingSelector.addEventListener('input', () => this.updateToneMapping());
    exposureSlider.addEventListener('input', () => this.updateToneMapping());
  }

  setupLightControls() {
    const lights = [directionalLight0, directionalLight1, directionalLight2];
    lights.forEach((light, index) => {
      const colorInput = document.getElementById(`light${index}-color`);
      const intensityInput = document.getElementById(`light${index}-intensity`);

      // Set the initial values from the light configuration
      colorInput.value = `#${light.color.getHexString()}`;
      intensityInput.value = light.intensity;

      // Add event listeners to update light properties when inputs change
      colorInput.addEventListener('input', () => this.updateLightProperties());
      intensityInput.addEventListener('input', () => this.updateLightProperties());
    });
  }

  updateToneMapping() {
    const rendererComponent = this.getRenderer();
    const toneMappingSelector = document.getElementById('tone-mapping-selector');
    const exposureSlider = document.getElementById('tone-mapping-exposure');

    rendererComponent.renderer.toneMapping = toneMappingTypes.find(
      (t) => t.name.replace(/\s+/g, '') === toneMappingSelector.value
    ).value;
    rendererComponent.renderer.toneMappingExposure = parseFloat(exposureSlider.value);

    console.log(
      'Tone mapping changed to',
      toneMappingSelector.value,
      'with exposure',
      exposureSlider.value
    );
  }

  getRenderer() {
    const rendererQuery = this.queries.renderer.results;
    if (rendererQuery.length === 0) {
      console.error('Renderer not found.');
      return;
    }
    return rendererQuery[0].getMutableComponent(WebGLRendererComponent);
  }

  getToneMappingType(type) {
    return {
      NoToneMapping,
      LinearToneMapping,
      ReinhardToneMapping,
      CineonToneMapping,
      ACESFilmicToneMapping,
      CustomToneMapping,
      AgXToneMapping,
      NeutralToneMapping
    }[type];
  }

  updateLightProperties() {
    [directionalLight0, directionalLight1, directionalLight2].forEach((light, index) => {
      const colorInput = document.getElementById(`light${index}-color`);
      const intensityInput = document.getElementById(`light${index}-intensity`);
      light.color.set(colorInput.value);
      light.intensity = parseFloat(intensityInput.value);
    });
  }

  setupToggleLightControls() {
    const lightControls = document.getElementById('light-controls');
    const toneMappingControls = document.getElementById('tone-mapping-controls');
    const toggleLightControlsButton = document.getElementById('toggle-light-controls');

    toggleLightControlsButton.addEventListener('click', () => {
      toggleElementVisibility(lightControls);
      toggleElementVisibility(toneMappingControls);
    });

    function toggleElementVisibility(element) {
      element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
  }
}

DebugHudSystem.queries = {
  characters: { components: [CharacterComponent] },
  renderer: { components: [WebGLRendererComponent] }
};

export { DebugHudSystem };
