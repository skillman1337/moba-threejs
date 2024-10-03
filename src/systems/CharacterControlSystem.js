import { System } from 'ecsy';
import { InputStateComponent } from '../components/InputStateComponent.js';
import { PathfindingComponent } from '../components/PathfindingComponent.js';
import { CharacterComponent } from '../components/CharacterComponent.js';
import { Vector2, Vector3, Raycaster, LoopRepeat } from 'three';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import TWEEN from '@tweenjs/tween.js';

class CharacterControlSystem extends System {
  init() {
    this.handleRightClick = this.handleRightClick.bind(this);
    this.eventListenersInitialized = false;

    // Cache for performance
    this.pathfindingEntity = null;
    this.pathfindingComponent = null;

    // Cache the map object for raycasting
    this.map = null;

    this.collisionCache = new Map(); // Caching collision results
  }

  execute(delta, time) {
    if (!this.eventListenersInitialized) {
      document.addEventListener('contextmenu', this.handleRightClick);
      this.eventListenersInitialized = true;
    }

    // Cache the PathfindingComponent
    if (!this.pathfindingComponent) {
      const pathfindingEntities = this.queries.pathfinding.results;
      if (pathfindingEntities.length > 0) {
        this.pathfindingEntity = pathfindingEntities[0];
        this.pathfindingComponent = this.pathfindingEntity.getComponent(PathfindingComponent);
      }
    }

    // Update Tweens
    TWEEN.update(time);
  }

  removeDuplicateWaypoints(path) {
    return path.filter(
      (waypoint, index, self) => index === 0 || !this.areWaypointsEqual(waypoint, self[index - 1])
    );
  }

  areWaypointsEqual(waypoint1, waypoint2) {
    const epsilon = 0.001; // Adjust this value based on your precision needs
    return (
      Math.abs(waypoint1.x - waypoint2.x) < epsilon &&
      Math.abs(waypoint1.y - waypoint2.y) < epsilon &&
      Math.abs(waypoint1.z - waypoint2.z) < epsilon
    );
  }

  handleRightClick(event) {
    event.preventDefault();
    const rendererEntity = this.queries.renderer.results[0];
    const inputEntity = this.queries.input.results[0];
    const characterEntity = this.queries.character.results[0];
    const pathfinder = this.pathfindingComponent.pathfinder;
    const pathfinderHelper = this.pathfindingComponent.helper;

    if (!rendererEntity || !inputEntity || !characterEntity) return;

    const renderer = rendererEntity.getComponent(WebGLRendererComponent);
    const characterComponent = characterEntity.getMutableComponent(CharacterComponent);

    const targetPoint = this.getTargetPoint(event, renderer);
    if (!targetPoint) return;

    // Pathfinding
    const ZONE = this.pathfindingComponent.zone;
    const start = characterComponent.character.getWorldPosition(new Vector3());
    const startGroupID = pathfinder.getGroup(ZONE, start, true);
    const end = targetPoint.clone();
    // const end = new Vector3(61.19340904238641, 0.9117487956594338, -3.6700566108804225); // Example end point

    console.log('Start Point:', start);
    console.log('End  Point:', end);

    this.pathfindingComponent.helper.setPlayerPosition(start);
    this.pathfindingComponent.helper.setTargetPosition(end);

    const path = pathfinder.findPath(start, end, ZONE, startGroupID);

    let finalPath = path;

    if (!finalPath || finalPath.length === 0) {
      console.warn('No path found between the selected points.');

      // Attempt to find the closest node and a new path
      const closestNode = pathfinder.getClosestNode(end, ZONE, startGroupID);
      console.log('Closest Node Centroid:', closestNode.centroid);

      finalPath = pathfinder.findPath(start, closestNode.centroid, ZONE, startGroupID);
    }

    if (finalPath && finalPath.length > 0) {
      console.log('Computed Path:', finalPath);

      // Remove duplicate waypoints
      finalPath = this.removeDuplicateWaypoints(finalPath);

      // Cache the map if not already cached
      if (!this.map) {
        const scene = renderer.scene.getObject3D();
        let foundMap = false;
        scene.traverse((object) => {
          if (!foundMap && object.name === 'room') {
            this.map = object;
            foundMap = true; // Stop further traversal
          }
        });
        if (!this.map) {
          console.warn('Map object named "room" not found for path smoothing.');
        }
      }

      // Apply path smoothing
      if (this.map) {
        finalPath = this.smoothPath(start, finalPath, 3); // Look ahead up to 3 steps
        console.log('Smoothed Path:', finalPath);
      } else {
        console.warn('Map not available. Skipping path smoothing.');
      }

      pathfinderHelper.setPath(finalPath);
      characterComponent.waypointQueue = this.removeDuplicateWaypoints(finalPath);
      this.moveToNextWaypoint(characterComponent, renderer);
    } else {
      console.warn('Failed to find a valid path even after attempting to find the closest node.');
      // What we need to do here, is to walk to the closest node center point first
    }
  }

  /**
   * Smooths the given path by looking ahead up to maxLookAheadSteps and skipping intermediate waypoints if possible.
   * @param {Vector3[]} path - The original path consisting of waypoints.
   * @param {number} maxLookAheadSteps - The maximum number of steps to look ahead for smoothing.
   * @returns {Vector3[]} - The smoothed path excluding the start point.
   */
  smoothPath(start, path, maxLookAheadSteps) {
    if (!this.map) return path; // If map is not available, return the original path
    if (!path || path.length === 0) return [];

    const smoothedPath = [];
    let currentIndex = 0;
    const fullPath = [start, ...path];
    const pathLength = fullPath.length;

    while (currentIndex < pathLength - 1) {
      const lookAheadLimit = Math.min(currentIndex + maxLookAheadSteps, pathLength - 1);
      let nextIndex = currentIndex + 1;

      for (let i = lookAheadLimit; i > currentIndex; i--) {
        if (this.isPathClear(fullPath[currentIndex], fullPath[i])) {
          nextIndex = i;
          break;
        }
      }

      // Prevent infinite loop in case no progress is made
      if (nextIndex === currentIndex) {
        console.warn(
          'Cannot move forward from the current index. Possible obstacle blocking the path.'
        );
        break;
      }

      smoothedPath.push(fullPath[nextIndex]);
      currentIndex = nextIndex;
    }

    // Ensure the final waypoint is included
    const lastWaypoint = fullPath[pathLength - 1];
    const lastInSmoothed = smoothedPath[smoothedPath.length - 1];

    if (!lastInSmoothed || !lastInSmoothed.equals(lastWaypoint)) {
      smoothedPath.push(lastWaypoint);
      // Consider logging this event only in debug mode
      // console.log('Final waypoint added to smoothedPath.');
    }

    return smoothedPath;
  }

  /**
   * Checks if the path between two points is clear of obstacles.
   * Utilizes caching to avoid redundant collision checks.
   * @param {Vector3} start - The starting point.
   * @param {Vector3} end - The ending point.
   * @returns {boolean} - True if the path is clear, false otherwise.
   */
  isPathClear(start, end) {
    const raycaster = new Raycaster();

    const cacheKey = `${start.x},${start.y},${start.z}-${end.x},${end.y},${end.z}`;
    if (this.collisionCache.has(cacheKey)) {
      return this.collisionCache.get(cacheKey);
    }

    const direction = new Vector3().subVectors(end, start);
    const distance = direction.length();

    if (distance === 0) {
      this.collisionCache.set(cacheKey, true);
      return true;
    }

    direction.normalize();

    const yBuffer = 0.2;
    const origin = new Vector3(start.x, start.y + yBuffer, start.z);

    raycaster.set(origin, direction);
    raycaster.far = distance - 0.1;
    raycaster.near = 0.1;

    // Optimize: Specify objects to check against if possible
    const intersects = raycaster.intersectObject(this.map, true);

    const isClear = intersects.length === 0;
    this.collisionCache.set(cacheKey, isClear);

    return isClear;
  }

  /**
   * Clears the collision cache. Call this if the map changes.
   */
  clearCollisionCache() {
    this.collisionCache.clear();
  }

  moveToNextWaypoint(characterComponent, renderer) {
    if (characterComponent.waypointQueue.length === 0) {
      this.playIdleAnimation(characterComponent);
      return;
    }

    const nextPoint = characterComponent.waypointQueue.shift();
    this.moveCharacterToPoint(characterComponent, nextPoint, () => {
      this.moveToNextWaypoint(characterComponent, renderer);
    });
  }

  moveCharacterToPoint(characterComponent, targetPoint, onComplete) {
    const character = characterComponent.character;
    if (!character || !character.position) {
      console.error('Character is not defined or does not have a position property.');
      return;
    }

    const direction = new Vector3().subVectors(targetPoint, character.position).normalize();

    this.rotateCharacter(characterComponent, direction);
    this.animateCharacterMovement(characterComponent, targetPoint, onComplete);
  }

  animateCharacterMovement(characterComponent, targetPoint, onComplete) {
    const character = characterComponent.character;
    const distance = character.position.distanceTo(targetPoint);
    const duration = (distance / characterComponent.movementSpeed) * 1000;

    if (characterComponent.positionTween) {
      characterComponent.positionTween.stop();
    }

    characterComponent.positionTween = new TWEEN.Tween(character.position)
      .to({ x: targetPoint.x, y: targetPoint.y, z: targetPoint.z }, duration)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        // Update running animation only if not already running
        if (
          characterComponent.currentAction &&
          characterComponent.currentAction.getClip().name !== 'tryndamere_run.anm'
        ) {
          this.playRunningAnimation(characterComponent);
        }
      })
      .onComplete(() => {
        // Only play idle animation if there are no more waypoints
        if (characterComponent.waypointQueue.length === 0) {
          this.playIdleAnimation(characterComponent);
        }
        if (onComplete) onComplete();
      })
      .start();
  }

  rotateCharacter(characterComponent, direction) {
    const targetAngle = Math.atan2(direction.x, direction.z);
    if (characterComponent.rotationTween) {
      characterComponent.rotationTween.stop();
    }
    const currentRotationY = characterComponent.character.rotation.y;
    // Calculate the shortest path to the target angle
    let deltaAngle = targetAngle - currentRotationY;
    deltaAngle = ((deltaAngle + Math.PI) % (2 * Math.PI)) - Math.PI; // Normalize to [-π, π]
    characterComponent.rotationTween = new TWEEN.Tween({ rotationY: currentRotationY })
      .to({ rotationY: currentRotationY + deltaAngle }, 100) // Adjust duration as needed
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({ rotationY }) => {
        characterComponent.character.rotation.y = rotationY;
      })
      .start();
  }

  getTargetPoint(event, renderer) {
    const mouse = new Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, renderer.camera.getObject3D());

    const scene = renderer.scene.getObject3D();
    let map = null;
    let foundMap = false;
    scene.traverse((object) => {
      if (!foundMap && object.name === 'room') {
        map = object;
        foundMap = true; // Set the flag to stop further processing
      }
    });
    if (map && !this.map) {
      this.map = map; // Cache the map for future use
    }
    if (!map) {
      console.warn('map not found');
    } else {
      const intersects = raycaster.intersectObject(map, true);
      if (intersects.length > 0) {
        return intersects[0].point;
      }
    }
    return null;
  }

  playRunningAnimation(characterComponent) {
    if (characterComponent.animations && characterComponent.animations.length) {
      const runClip = characterComponent.animations[31];
      if (runClip) {
        // console.log('Playing running animation:', runClip.name);
        const runningAction = characterComponent.mixer.clipAction(runClip);

        if (
          characterComponent.currentAction &&
          characterComponent.currentAction.getClip().name !== 'tryndamere_run.anm'
        ) {
          characterComponent.currentAction.fadeOut(0.5); // Smooth transition to running
        }

        runningAction.setLoop(LoopRepeat, Infinity);
        runningAction.reset().fadeIn(0.5).play(); // Smooth transition from idle to running
        characterComponent.currentAction = runningAction;
      }
    }
  }

  playIdleAnimation(characterComponent) {
    if (characterComponent.animations && characterComponent.animations.length) {
      const idleClip = characterComponent.animations[25];
      if (idleClip) {
        // console.log('Playing idle animation:', idleClip.name);
        const idleAction = characterComponent.mixer.clipAction(idleClip);

        // Stop the current running action smoothly
        if (characterComponent.currentAction) {
          characterComponent.currentAction.fadeOut(0.25); // Smooth transition to idle
        }

        // Play the idle action directly with a smooth transition
        idleAction.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.25).play(); // Smooth transition from running to idle
        characterComponent.currentAction = idleAction;
      } else {
        console.warn('No idle animation ending with "idle1" found in the GLTF model.');
      }
    }
  }
}

// Define the queries for the system
CharacterControlSystem.queries = {
  renderer: { components: [WebGLRendererComponent] },
  input: { components: [InputStateComponent] },
  character: { components: [CharacterComponent] },
  pathfinding: { components: [PathfindingComponent] }
};

export { CharacterControlSystem };
