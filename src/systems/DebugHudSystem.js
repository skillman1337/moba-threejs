// src/systems/DebugHudSystem.js
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
import { PathfindingComponent } from '../components/PathfindingComponent.js';
import { toneMapping, toneMappingExposure } from '../config/renderConfig.js';
import { SoundComponent } from '../components/SoundComponent.js';

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
    this.setupNavmeshControl();
    this.setupPathfindingDebugControl();
    this.setupDisableSoundControl();

    this.pathfindingComponent = null;
    this.soundComponent = null;
    this.rendererComponent = null;
  }

  execute() {
    this.queries.characters.results.forEach((entity) => {
      const characterPosition = entity.getComponent(CharacterComponent).character.position;
      const characterInfo = document.getElementById('character-info');
      characterInfo.innerHTML = `Character Position: x: ${characterPosition.x.toFixed(
        2
      )}, y: ${characterPosition.y.toFixed(2)}, z: ${characterPosition.z.toFixed(2)}`;
    });

    if (!this.pathfindingComponent) {
      const results = this.queries.pathfinding.results;
      if (results.length > 0) {
        this.pathfindingComponent = results[0].getMutableComponent(PathfindingComponent);
      }
    }

    if (!this.rendererComponent) {
      const results = this.queries.renderer.results;
      if (results.length > 0) {
        this.rendererComponent = results[0].getMutableComponent(WebGLRendererComponent);
      }
    }

    if (!this.soundComponent) {
      const results = this.queries.sound.results;
      if (results.length > 0) {
        this.soundComponent = results[0].getMutableComponent(SoundComponent);
      }
    }
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
    const defaultToneMapping =
      toneMappingTypes.find((t) => t.value === toneMapping)?.name.replace(/\s+/g, '') ||
      'NoToneMapping';
    const defaultExposure = toneMappingExposure || 1.0;

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
    const rendererComponent = this.rendererComponent;
    if (!rendererComponent) return;

    const toneMappingSelector = document.getElementById('tone-mapping-selector');
    const exposureSlider = document.getElementById('tone-mapping-exposure');

    const selectedToneMapping = toneMappingTypes.find(
      (t) => t.name.replace(/\s+/g, '') === toneMappingSelector.value
    );

    if (selectedToneMapping) {
      rendererComponent.renderer.toneMapping = selectedToneMapping.value;
    } else {
      console.warn('DebugHudSystem: Selected tone mapping type not found. Using default.');
      rendererComponent.renderer.toneMapping = NoToneMapping;
    }

    rendererComponent.renderer.toneMappingExposure = parseFloat(exposureSlider.value);

    console.log(
      'DebugHudSystem: Tone mapping changed to',
      toneMappingSelector.value,
      'with exposure',
      exposureSlider.value
    );
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
      this.toggleElementVisibility(lightControls);
      this.toggleElementVisibility(toneMappingControls);
    });
  }

  setupNavmeshControl() {
    const showNavmeshCheckbox = document.getElementById('show-navmesh');
    this.updateNavmeshVisibility(); // Initialize visibility on setup

    // Add event listener to toggle navmesh visibility
    showNavmeshCheckbox.addEventListener('change', () => this.updateNavmeshVisibility());
  }

  updateNavmeshVisibility() {
    const rendererComponent = this.rendererComponent;
    if (!rendererComponent) return;
    const scene = rendererComponent.scene.getObject3D();

    if (!scene) return;

    const navmesh = scene.getObjectByName('NavMesh');

    if (!navmesh) {
      console.warn('DebugHudSystem: NavMesh object not found in the scene.');
      return;
    }

    const map = scene.getObjectByName('room');

    if (!map) {
      console.warn('DebugHudSystem: map object not found in the scene.');
      return;
    }

    const showNavmeshCheckbox = document.getElementById('show-navmesh');
    navmesh.visible = showNavmeshCheckbox.checked;
    map.visible = !showNavmeshCheckbox.checked;

    console.log(`DebugHudSystem: NavMesh visibility set to ${navmesh.visible}`);
  }

  setupPathfindingDebugControl() {
    const debugPathfindingCheckbox = document.getElementById('debug-pathfinding');
    debugPathfindingCheckbox.addEventListener('change', () => this.updatePathfindingDebugControl());
  }

  setupDisableSoundControl() {
    const disableSoundCheckbox = document.getElementById('disable-sound');
    const storedVolume = localStorage.getItem('volume');
    if (storedVolume == '1') {
      disableSoundCheckbox.checked = false;
    } else {
      disableSoundCheckbox.checked = true;
    }
    disableSoundCheckbox.addEventListener('change', () => this.updateDisableSoundControl());
  }

  updateDisableSoundControl() {
    const disableSoundCheckbox = document.getElementById('disable-sound');
    const isDisabled = disableSoundCheckbox.checked;
    console.log(this.soundComponent);
    this.soundComponent.volume = isDisabled ? 0 : 1;
    localStorage.setItem('volume', this.soundComponent.volume);

    console.log(`DebugHudSystem: Disable sound set to ${isDisabled}`);
  }

  updatePathfindingDebugControl() {
    const debugPathfindingCheckbox = document.getElementById('debug-pathfinding');
    const pathfindingComponent = this.pathfindingComponent;

    if (!pathfindingComponent) {
      console.warn('DebugHudSystem: PathfindingComponent is missing.');
      return;
    }

    const debug = debugPathfindingCheckbox.checked;
    pathfindingComponent.debug = debug;

    if (pathfindingComponent.helper) {
      pathfindingComponent.helper.visible = debug;
    }

    console.log(`DebugHudSystem: Pathfinding debug helper visibility set to ${debug}`);
  }

  toggleElementVisibility(element) {
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
  }
}

DebugHudSystem.queries = {
  characters: { components: [CharacterComponent] },
  renderer: { components: [WebGLRendererComponent] },
  pathfinding: { components: [PathfindingComponent] },
  sound: { components: [SoundComponent] }
};

export { DebugHudSystem };
