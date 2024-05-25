import { System } from 'ecsy';
import { InputStateComponent } from '../components/InputStateComponent.js';
import { CharacterComponent } from '../components/CharacterComponent.js';
import { Vector2, Vector3, Raycaster, LoopRepeat } from 'three';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import TWEEN from '@tweenjs/tween.js';

class CharacterControlSystem extends System {
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
    const rendererEntity = this.queries.renderer.results[0];
    const inputEntity = this.queries.input.results[0];
    const characterEntity = this.queries.character.results[0];

    if (!rendererEntity || !inputEntity || !characterEntity) return;

    const renderer = rendererEntity.getComponent(WebGLRendererComponent);
    const characterComponent = characterEntity.getMutableComponent(CharacterComponent);

    const targetPoint = this.getTargetPoint(event, renderer);
    if (!targetPoint) return;

    this.moveCharacterToPoint(characterComponent, targetPoint, renderer);
  }

  getTargetPoint(event, renderer) {
    const mouse = new Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, renderer.camera.getObject3D());

    const intersects = raycaster.intersectObjects(renderer.scene.getObject3D().children, true);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  moveCharacterToPoint(characterComponent, targetPoint, renderer) {
    const character = characterComponent.character;
    if (!character || !character.position) {
      console.error('Character is not defined or does not have a position property.');
      return;
    }

    console.log(targetPoint);

    const groundPoint = this.getGroundPoint(targetPoint, renderer);
    if (!groundPoint) return;

    this.rotateCharacter(characterComponent, groundPoint);
    this.animateCharacterMovement(characterComponent, groundPoint);
  }

  getGroundPoint(targetPoint, renderer) {
    const groundRaycaster = new Raycaster();
    groundRaycaster.set(targetPoint.clone().add(new Vector3(0, 10, 0)), new Vector3(0, -1, 0));

    const groundIntersects = groundRaycaster.intersectObject(renderer.scene.getObject3D(), true);
    if (groundIntersects.length > 0) {
      return groundIntersects[0].point;
    }
    return null;
  }

  rotateCharacter(characterComponent, groundPoint) {
    const direction = new Vector3()
      .subVectors(groundPoint, characterComponent.character.position)
      .normalize();
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

  animateCharacterMovement(characterComponent, groundPoint) {
    const distance = characterComponent.character.position.distanceTo(groundPoint);
    const duration = (distance / characterComponent.movementSpeed) * 1000;

    if (characterComponent.positionTween) {
      characterComponent.positionTween.stop();
    }

    characterComponent.positionTween = new TWEEN.Tween(characterComponent.character.position)
      .to({ x: groundPoint.x, y: groundPoint.y, z: groundPoint.z }, duration)
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
      })
      .start();
  }

  playRunningAnimation(characterComponent) {
    if (characterComponent.animations && characterComponent.animations.length) {
      const runClip = characterComponent.animations[31];
      if (runClip) {
        console.log('Playing running animation:', runClip.name);
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

  setupAnimationCompletion(characterComponent, duration) {
    characterComponent.animationTween = new TWEEN.Tween({})
      .to({}, duration)
      .onComplete(() => {
        this.playIdleAnimation(characterComponent);
      })
      .start();
  }

  playIdleAnimation(characterComponent) {
    if (characterComponent.animations && characterComponent.animations.length) {
      const idleClip = characterComponent.animations[25];
      if (idleClip) {
        console.log('Playing idle animation:', idleClip.name);
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
  character: { components: [CharacterComponent] }
};

export { CharacterControlSystem };
