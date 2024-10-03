// src\gameSetup.js
import {
  WebGLRenderer,
  MathUtils,
  ACESFilmicToneMapping,
  ColorManagement,
  SRGBColorSpace
} from 'three';
import { WebGLRendererComponent } from '../lib/ecs/components/WebGLRendererComponent.js';
import { MinimapComponent } from './components/MinimapComponent.js';
import { MapComponent } from './components/MapComponent.js';
import { InputStateComponent } from './components/InputStateComponent.js';
import { CharacterComponent } from './components/CharacterComponent.js';
import { CharacterSoundComponent } from './components/CharacterSoundComponent.js';
import { PathfindingComponent } from './components/PathfindingComponent.js';
import { SoundComponent } from './components/SoundComponent.js';
import { PerspectiveCamera, Scene, Color, PCFSoftShadowMap, NeutralToneMapping } from 'three';
import {
  PHYSICALLY_CORRECT_LIGHTS,
  toneMapping,
  toneMappingExposure
} from './config/renderConfig.js';
import { WebGLRendererSystem } from '../lib/ecs/systems/WebGLRendererSystem.js';
import { MinimapSystem } from './systems/MinimapSystem.js';
import { CameraMovementSystem } from './systems/CameraMovementSystem.js';
import { CharacterSoundSystem } from './systems/CharacterSoundSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { CharacterControlSystem } from './systems/CharacterControlSystem.js';
import { MusicSystem } from './systems/MusicSystem.js';
import { BACKGROUND } from './config/sceneConfig.js';
import {
  ASPECT_RATIO,
  CAMERA_INITIAL_POSITION_X,
  CAMERA_INITIAL_POSITION_Y,
  CAMERA_INITIAL_POSITION_Z,
  CAMERA_INITIAL_ROTATION_X,
  CAMERA_INITIAL_ROTATION_Y,
  CAMERA_INITIAL_ROTATION_Z,
  FAR_CLIPPING_PLANE,
  FOV,
  NEAR_CLIPPING_PLANE
} from './config/cameraConfig.js';
import { DebugHudSystem } from './systems/DebugHudSystem.js';
import { LightComponent } from './components/LightComponent.js';

export function registerComponentsAndSystems(world) {
  world
    .registerComponent(WebGLRendererComponent)
    .registerComponent(MinimapComponent)
    .registerComponent(MapComponent)
    .registerComponent(InputStateComponent)
    .registerComponent(CharacterComponent)
    .registerComponent(CharacterSoundComponent)
    .registerComponent(PathfindingComponent)
    .registerComponent(LightComponent)
    .registerComponent(SoundComponent)
    .registerSystem(WebGLRendererSystem, { priority: 999 })
    .registerSystem(MinimapSystem)
    .registerSystem(CameraMovementSystem)
    .registerSystem(InputSystem)
    .registerSystem(CharacterControlSystem)
    .registerSystem(CharacterSoundSystem)
    .registerSystem(DebugHudSystem)
    .registerSystem(MusicSystem); // Register the MusicSystem
}

export function setupRenderer(world, sceneEntity, cameraEntity) {
  const renderer = new WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio); // set the pixel ratio so that our scene will look good on HiDPI displays
  renderer.toneMapping = toneMapping; // Choose a tone mapping algorithm
  renderer.toneMappingExposure = toneMappingExposure; // Brightness
  //renderer.outputColorSpace = 'srgb'; // srgb or srgb-linear, srgb is default
  // renderer.shadowMap.enabled = false;
  // renderer.shadowMap.type = PCFSoftShadowMap;
  ColorManagement.enabled = true;

  document.body.appendChild(renderer.domElement);

  // Create renderer component and associate the camera
  world.createEntity().addComponent(WebGLRendererComponent, {
    scene: sceneEntity,
    camera: cameraEntity,
    renderer: renderer
  });

  return { renderer };
}

export function setupScene(world) {
  const scene = new Scene();
  //scene.background = new Color(BACKGROUND);
  const sceneEntity = world.createEntity().addObject3DComponent(scene);

  return { scene, sceneEntity };
}

export function setupCamera(world, sceneEntity) {
  const camera = new PerspectiveCamera(FOV, ASPECT_RATIO, NEAR_CLIPPING_PLANE, FAR_CLIPPING_PLANE);
  camera.position.set(
    CAMERA_INITIAL_POSITION_X,
    CAMERA_INITIAL_POSITION_Y,
    CAMERA_INITIAL_POSITION_Z
  );
  camera.rotation.set(
    MathUtils.degToRad(CAMERA_INITIAL_ROTATION_X),
    MathUtils.degToRad(CAMERA_INITIAL_ROTATION_Y),
    MathUtils.degToRad(CAMERA_INITIAL_ROTATION_Z)
  );

  const cameraEntity = world.createEntity().addObject3DComponent(camera, sceneEntity);

  return { cameraEntity, camera };
}
