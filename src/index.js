// src/index.js
import { ECSYThreeWorld } from '../lib/ecs/world.js';
import {
  setupRenderer,
  setupScene,
  setupCamera,
  registerComponentsAndSystems
} from './gameSetup.js';
import { directionalLight0, directionalLight1, directionalLight2 } from './config/lightConfig.js';
import {
  Clock,
  PointLight,
  AmbientLight,
  Raycaster,
  Color,
  SphereGeometry,
  Mesh,
  Box3,
  Vector3,
  AnimationMixer,
  LoopRepeat
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';

import { MapComponent } from './components/MapComponent.js';
import { MinimapComponent } from './components/MinimapComponent.js';
import { InputStateComponent } from './components/InputStateComponent.js';
import { CharacterComponent } from './components/CharacterComponent.js';
import { CharacterSoundComponent } from './components/CharacterSoundComponent.js';
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { PathfindingComponent } from './components/PathfindingComponent.js';

// Create the ECSY world
const world = new ECSYThreeWorld();

// Register components and systems
registerComponentsAndSystems(world);

// Setup renderer, scene, and camera
const { scene, sceneEntity } = setupScene(world);
const { cameraEntity } = setupCamera(world, sceneEntity);
setupRenderer(world, sceneEntity, cameraEntity);

// Setup lights
function setupLights() {
  scene.add(directionalLight0);
  scene.add(directionalLight1);
  scene.add(directionalLight2);

  // Add ambient light
  const ambientLight = new AmbientLight(0x404040, 1); // Soft white light
  scene.add(ambientLight);

  // Background
  //scene.background = new Color(0xeeeeee); // Light gray background
}

setupLights();

// Create input component
world.createEntity().addComponent(InputStateComponent, {
  cursorPosition: { x: 0, y: 0 },
  pressedKeys: {}
});

let mixer = null; // Declare mixer globally

// Async function to load map and champion
async function loadAssets() {
  try {
    await loadMap(); // Load the map and navmesh first
    const { navmesh } = await loadNavmesh(); // Load the map and navmesh first
    await loadChampion(navmesh); // Load the champion using navmesh
  } catch (error) {
    console.error('Error loading assets:', error);
  }
}

async function loadMap() {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/levels/map4/level.glb',
      (gltf) => {
        console.log('GLB file loaded:', gltf);
        const object = gltf.scene;
        const box = new Box3().setFromObject(object);
        const size = box.getSize(new Vector3());

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

        object.traverse((child) => {
          if (child.isMesh && child.material.transparent) {
            child.renderOrder = 1;
          }
        });

        scene.add(object);

        // Shop Light
        const shopLight = new PointLight('#534934', 2500, 3.24, 2.32);
        shopLight.position.set(72, 5, 2.5); // Adjust the position as needed
        scene.add(shopLight);
        resolve({ object });
      },
      undefined, // onProgress
      (error) => {
        console.error('Error loading GLB file:', error);
        reject(error);
      }
    );
  });
}

async function loadNavmesh() {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/levels/map4/navmesh_test.glb',
      (gltf) => {
        console.log('GLB file loaded:', gltf);
        const object = gltf.scene;
        let navmesh = null;
        gltf.scene.traverse((child) => {
          if (child.isMesh && child.name === 'NavMesh') {
            child.material.transparent = false;
            child.material.opacity = 1;
            child.material.visible = false;
            child.material.color.set(0xff0000); // Set to red for visibility
            navmesh = child; // Assign the navmesh
          }
        });
        if (!navmesh) {
          console.warn('NavMesh not found in the loaded map.');
        }

        scene.add(object);
        if (navmesh) {
          // Initialize Pathfinding
          const pathfinder = new Pathfinding();
          const pathfinderHelper = new PathfindingHelper();
          scene.add(pathfinderHelper);
          try {
            navmesh.updateMatrixWorld(); // Ensure matrixWorld is up to date
            const transformedGeometry = navmesh.geometry.clone();
            transformedGeometry.applyMatrix4(navmesh.matrixWorld); // Apply transform HERE

            pathfinder.setZoneData('level4', Pathfinding.createZone(transformedGeometry));

            // Add PathfindingComponent to the world
            world.createEntity().addComponent(PathfindingComponent, {
              pathfinder: pathfinder,
              helper: pathfinderHelper,
              zone: 'level4'
            });
          } catch (pfError) {
            console.error('Error creating Pathfinding zone:', pfError);
          }
        }

        resolve({ navmesh });
      },
      undefined, // onProgress
      (error) => {
        console.error('Error loading GLB file:', error);
        reject(error);
      }
    );
  });
}

async function loadChampion(navmesh) {
  if (!navmesh) {
    console.error('Cannot load champion without NavMesh.');
    return;
  }

  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/Tryndamere.gltf',
      (gltf) => {
        const character = gltf.scene;
        setInitialPosition(character, navmesh);
        scaleAndRotateCharacter(character);
        scene.add(character);

        mixer = new AnimationMixer(character);
        const idleClip = gltf.animations.find((anim) => anim.name.toLowerCase().includes('idle'));
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

function setInitialPosition(character, navmesh) {
  const position = new Vector3(68.03615936878441, 1.7478288228577257, -9.705994355515998); // Starting position

  // Cast a ray downward from the initial position
  const raycaster = new Raycaster(position, new Vector3(0, -1, 0), 0, 100);
  const intersects = raycaster.intersectObject(navmesh, true);

  if (intersects.length > 0) {
    const groundPoint = intersects[0].point;
    character.position.copy(groundPoint);
    console.log('Character placed on NavMesh at:', groundPoint);
  } else {
    console.warn('No intersection with NavMesh found. Setting default position.');
    character.position.set(position.x, position.y, position.z);
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
