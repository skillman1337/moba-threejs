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
  }

  execute(delta, time) {
    if (!this.eventListenersInitialized) {
      document.addEventListener('contextmenu', this.handleRightClick);
      this.eventListenersInitialized = true;
    }

    // Cache the PathfindingComponent and navmesh
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
    // const end = new Vector3(67.96783552101195, 2.27072360252781, -9.946485506017739);

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
      pathfinderHelper.setPath(finalPath);
      characterComponent.waypointQueue = this.removeDuplicateWaypoints(finalPath);
      this.moveToNextWaypoint(characterComponent, renderer);
    } else {
      console.warn('Failed to find a valid path even after attempting to find the closest node.');
    }
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
      .to(targetPoint, duration)
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
        this.playIdleAnimation(characterComponent);
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
      if (!foundMap && object.name == 'room') {
        map = object;
        foundMap = true; // Set the flag to stop further processing
      }
    });
    if (!map) {
      console.warn('map not found');
    }
    const intersects = raycaster.intersectObject(map, true);
    if (intersects.length > 0) {
      return intersects[0].point;
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
          characterComponent.currentAction.getClip().name != 'tryndamere_run.anm'
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

CharacterControlSystem.queries = {
  renderer: { components: [WebGLRendererComponent] },
  input: { components: [InputStateComponent] },
  character: { components: [CharacterComponent] },
  pathfinding: { components: [PathfindingComponent] }
};

export { CharacterControlSystem };
