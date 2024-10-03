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

// Initialize the ECSY world and register components and systems
const world = new ECSYThreeWorld();
registerComponentsAndSystems(world);

// Setup renderer, scene, and camera
const { scene, sceneEntity } = setupScene(world);
const { cameraEntity } = setupCamera(world, sceneEntity);
setupRenderer(world, sceneEntity, cameraEntity);

// Function to setup lights in the scene
const setupLights = () => {
  [directionalLight0, directionalLight1, directionalLight2].forEach((light) => scene.add(light));

  const ambientLight = new AmbientLight(0x404040, 1); // Soft white light
  scene.add(ambientLight);
};

setupLights();

// Create and add the InputStateComponent to the world
world.createEntity().addComponent(InputStateComponent, {
  cursorPosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  pressedKeys: {}
});

let mixer = null; // Global mixer for animations

// Async function to load all necessary assets
const loadAssets = async () => {
  try {
    const { map } = await loadMap();
    await loadNavmesh();
    await loadChampion(map);
  } catch (error) {
    console.error('Error loading assets:', error);
  }
};

// Function to load the map and the nexus
const loadMap = () => {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/levels/map4/level.glb',
      (gltf) => {
        const object = gltf.scene;
        const box = new Box3().setFromObject(object);
        const size = box.getSize(new Vector3());

        // Add MapComponent to the world
        world.createEntity().addComponent(MapComponent, {
          width: size.x,
          height: size.z
        });

        // Setup minimap
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

        // Traverse the loaded object to find specific parts
        let map = null;
        object.traverse((child) => {
          if (child.name === 'room') map = child;
          if (child.isMesh && child.material.transparent) {
            child.renderOrder = 1;
          }
        });

        scene.add(object);

        // Add Shop Light
        const shopLight = new PointLight(0x534934, 2500, 3.24, 2.32);
        shopLight.position.set(72, 5, 2.5);
        scene.add(shopLight);

        // Load the Nexus model
        loader.load(
          '/assets/models/levels/map4/nexus.glb',
          (nexusGltf) => {
            const nexus = nexusGltf.scene;
            nexus.position.set(46.236657393511635, -0.315436910304709, -10.32942817890707);
            nexus.scale.set(0.01, 0.01, 0.01);
            nexus.rotation.y = -0.75;
            nexus.name = 'Nexus';
            scene.add(nexus);
            console.log('Nexus loaded successfully.');
            resolve({ map });
          },
          undefined,
          (error) => {
            console.error('Error loading Nexus GLB file:', error);
            reject(error);
          }
        );
      },
      undefined,
      (error) => {
        console.error('Error loading map GLB file:', error);
        reject(error);
      }
    );
  });
};

// Function to load the navigation mesh
const loadNavmesh = () => {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/levels/map4/navmesh.glb',
      (gltf) => {
        const object = gltf.scene;
        let navmesh = null;

        object.traverse((child) => {
          if (child.isMesh && child.name === 'NavMesh') {
            child.material.transparent = true;
            child.material.opacity = 0.25;
            child.material.visible = false;
            child.material.color.set(0xff0000); // Red color for visibility
            navmesh = child;
          }
        });

        if (!navmesh) {
          console.warn('NavMesh not found in the loaded map.');
        }

        scene.add(object);

        if (navmesh) {
          try {
            navmesh.updateMatrixWorld(); // Ensure the world matrix is up to date
            const transformedGeometry = navmesh.geometry.clone();
            transformedGeometry.applyMatrix4(navmesh.matrixWorld); // Apply world transformations

            const pathfinder = new Pathfinding();
            const zone = Pathfinding.createZone(transformedGeometry);
            pathfinder.setZoneData('level4', zone);

            const pathfinderHelper = new PathfindingHelper();
            scene.add(pathfinderHelper);

            // Add PathfindingComponent to the world
            world.createEntity().addComponent(PathfindingComponent, {
              pathfinder,
              helper: pathfinderHelper,
              zone: 'level4'
            });
          } catch (pfError) {
            console.error('Error creating Pathfinding zone:', pfError);
          }
        }

        resolve();
      },
      undefined,
      (error) => {
        console.error('Error loading Navmesh GLB file:', error);
        reject(error);
      }
    );
  });
};

// Function to load the champion character
const loadChampion = (map) => {
  if (!map) {
    console.error('Cannot load champion without a valid map.');
    return Promise.resolve(); // Continue execution even if the map isn't loaded
  }

  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      '/assets/models/champions/Tryndamere.gltf',
      (gltf) => {
        const character = gltf.scene;
        setInitialPosition(character, map);
        scaleAndRotateCharacter(character);
        scene.add(character);

        mixer = new AnimationMixer(character);
        const idleClip = gltf.animations.find((anim) => anim.name.toLowerCase().includes('idle'));

        if (idleClip) {
          const idleAction = mixer.clipAction(idleClip);
          idleAction.setLoop(LoopRepeat, Infinity);
          idleAction.play();

          createCharacterEntity(character, gltf.animations, mixer, idleAction);
        } else {
          console.warn('Idle animation not found for the character.');
        }

        resolve();
      },
      undefined,
      (error) => {
        console.error('Error loading champion GLTF file:', error);
        reject(error);
      }
    );
  });
};

// Helper function to set the initial position of the character
const setInitialPosition = (character, map) => {
  const initialPosition = new Vector3(68.04, 1.75, -9.71);
  const raycaster = new Raycaster(initialPosition, new Vector3(0, -1, 0));

  // Cast a ray downward from the initial position to place the character on the ground
  const intersects = raycaster.intersectObject(map, true);

  if (intersects.length > 0) {
    character.position.copy(intersects[0].point);
    console.log('Character positioned on the map at:', intersects[0].point);
  } else {
    console.warn('No intersection with map found. Using default position.');
    character.position.copy(initialPosition);
  }
};

// Helper function to scale and rotate the character appropriately
const scaleAndRotateCharacter = (character) => {
  character.scale.set(0.02, 0.02, 0.02);
  character.rotation.y = -0.75;
};

// Function to create and add the character entity with necessary components
const createCharacterEntity = (character, animations, mixer, idleAction) => {
  world
    .createEntity()
    .addComponent(CharacterComponent, {
      character,
      position: character.position.clone(),
      rotation: character.rotation.clone(),
      movementSpeed: 3,
      animations,
      mixer,
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
};

// Initiate the asset loading process
loadAssets();

// Initialize the clock for animation timing
const clock = new Clock();

// Define and start the animation loop
const animationLoop = () => {
  requestAnimationFrame(animationLoop);
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta); // Update character animations
  }

  TWEEN.update(); // Update Tween animations
  world.execute(delta, clock.elapsedTime); // Execute ECSY systems
};

animationLoop();
