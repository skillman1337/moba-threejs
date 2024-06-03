// src\index.js
import { ECSYThreeWorld } from '../lib/ecs/world.js';
import { setupRenderer, setupScene, setupCamera } from './gameSetup.js';
import { registerComponentsAndSystems } from './gameSetup.js';
import { directionalLight0, directionalLight1, directionalLight2 } from './config/lightConfig.js';
import {
  Clock,
  DirectionalLight,
  Box3,
  Vector3,
  Raycaster,
  AnimationMixer,
  LoopRepeat,
  PointLight,
  AmbientLight
} from 'three';
import { MapComponent } from './components/MapComponent.js';
import { MinimapComponent } from './components/MinimapComponent.js';
import { InputStateComponent } from './components/InputStateComponent.js';
import TWEEN from '@tweenjs/tween.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterComponent } from './components/CharacterComponent.js';
import { CharacterSoundComponent } from './components/CharacterSoundComponent.js';
import { LightComponent } from './components/LightComponent.js';

// Create the ECSY world
const world = new ECSYThreeWorld();

// Register components and systems
registerComponentsAndSystems(world);

// Setup renderer, scene, and camera
const { scene, sceneEntity } = setupScene(world);
const { cameraEntity } = setupCamera(world, sceneEntity);
const { renderer } = setupRenderer(world, sceneEntity, cameraEntity);

// Create input component
world.createEntity().addComponent(InputStateComponent, {
  cursorPosition: { x: 0, y: 0 },
  pressedKeys: {}
});

// Async function to load map and champion
async function loadAssets() {
  try {
    const map = await loadMap();
    await loadChampion(map);
  } catch (error) {
    console.error('Error loading assets:', error);
  }
}

async function loadMap() {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/scaled_down.glb',
      (gltf) => {
        console.log('GLB file loaded:', gltf);
        const object = gltf.scene;

        // Calculate the bounding box and adjust position
        const box = new Box3().setFromObject(object);
        const size = box.getSize(new Vector3());

        // Check if the bounding box size is correct
        console.log('Bounding Box Size:', size);

        world.createEntity().addComponent(MapComponent, {
          width: size.x,
          height: size.z
        });

        const minimapCanvas = document.getElementById('minimap');
        const minimapContainer = document.getElementById('minimap-container');

        minimapCanvas.width = minimapContainer.clientWidth;
        minimapCanvas.height = minimapContainer.clientHeight;

        world.createEntity().addComponent(MinimapComponent, {
          context: minimapCanvas.getContext('2d'),
          canvas: minimapCanvas,
          width: minimapCanvas.width,
          height: minimapCanvas.height
        });

        const center = box.getCenter(new Vector3());

        // Check if centering is correct
        console.log('Bounding Box Center:', center);

        object.position.sub(center); // Move the object to center

        // Disable depth test for all materials in the object
        object.traverse((child) => {
          if (child.isMesh) {
            if (child.material.transparent) {
              child.renderOrder = 1;
            }
          }
        });

        scene.add(object);

        // Add some simple lighting (notrequired for MeshBasicMaterial since it doesn't affect it)
        //const ambientLight = new AmbientLight('white'); // light gray ambient light
        //ambientLight.position.set(69.36, 25, -4.18);
        //scene.add(ambientLight);

        // White directional light at half intensity shining from the top.

        // LIGHT 1

        //const lightStrength = 20;
        //const light0 = new DirectionalLight('#5AA3A8', lightStrength + 5);
        //light0.position.set(0, 55, 0); // Adjust the position as needed
        //scene.add(light0);

        // LIGHT 2
        //const light1 = new DirectionalLight('#529B80', lightStrength + 10);
        //light1.position.set(80, 55, 25); // Adjust the position as needed
        //scene.add(light1);

        // // LIGHT 3

        // Light 4
        // Z up and down
        // Y depth
        // @TODO
        const shopLight = new PointLight('#534934', 2500, 3.24, 2.32);
        shopLight.position.set(72, 5, 2.5); // Adjust the position as needed
        scene.add(shopLight);

        resolve(object);
      },
      undefined, // onProgress
      (error) => {
        console.error('Error loading GLB file:', error);
        reject(error);
      }
    );
  });
}

function setupLights() {
  scene.add(directionalLight0);
  scene.add(directionalLight1);
  scene.add(directionalLight2);
}

setupLights();

let mixer = null; // Declare mixer globally

async function loadChampion(map) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/Tryndamere.gltf',
      (gltf) => {
        const character = gltf.scene;
        setInitialPosition(character, map);
        scaleAndRotateCharacter(character);
        scene.add(character);

        mixer = new AnimationMixer(character);
        const idleClip = gltf.animations[25];
        if (idleClip) {
          const idleAction = mixer.clipAction(idleClip);
          idleAction.setLoop(LoopRepeat, Infinity);
          idleAction.play();

          createCharacterEntity(character, gltf.animations, mixer, idleAction);
          resolve(gltf);
        } else {
          console.warn('Idle animation not found.');
          resolve(gltf); // Resolve even if no idle animation to avoid hanging
        }
      },
      undefined, // onProgress
      (error) => {
        console.error('Error loading GLTF file:', error);
        reject(error);
      }
    );
  });
}

function setInitialPosition(character, map) {
  const raycaster = new Raycaster(new Vector3(69.36, -1.22, -4.18), new Vector3(0, -1, 0));
  const intersects = raycaster.intersectObject(map, true);

  if (intersects.length > 0) {
    const groundPoint = intersects[0].point;
    character.position.set(groundPoint.x, groundPoint.y, groundPoint.z);
  } else {
    console.warn('No ground intersection found. Setting default position.');
    character.position.set(69.36, -1.22, -4.18);
  }
}

function scaleAndRotateCharacter(character) {
  character.scale.set(0.02, 0.02, 0.02);
  character.rotation.y = -0.75;
}

function createCharacterEntity(character, animations, mixer, idleAction) {
  world
    .createEntity()
    .addComponent(CharacterComponent, {
      character: character,
      position: character.position,
      rotation: character.rotation,
      movementSpeed: 3,
      animations: animations,
      mixer: mixer,
      currentAction: idleAction
    })
    .addComponent(CharacterSoundComponent, {
      sounds: [
        '/assets/sound/VOBank_en_US/6068_TryndamereSultan.move1.wav',
        '/assets/sound/VOBank_en_US/6069_TryndamereSultan.move2.wav',
        '/assets/sound/VOBank_en_US/6070_TryndamereSultan.move3.wav',
        '/assets/sound/VOBank_en_US/6071_TryndamereSultan.move4.wav',
        '/assets/sound/VOBank_en_US/6072_TryndamereSultan.move5.wav'
      ]
    });
}

loadAssets();

const clock = new Clock();
// Update the animation loop to call requestAnimationFrame
const animationLoop = () => {
  requestAnimationFrame(animationLoop);
  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta); // Ensure delta is used correctly
  }
  TWEEN.update(); // Ensure tweens are updated
  world.execute(delta, clock.elapsedTime);
};
animationLoop();
