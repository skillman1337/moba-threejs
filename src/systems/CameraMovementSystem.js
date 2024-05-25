// systems/CameraMovementSystem.js
import { System } from 'ecsy';
import { WebGLRendererComponent } from '../../lib/ecs/components/WebGLRendererComponent.js';
import { InputStateComponent } from '../components/InputStateComponent.js';
import { MapComponent } from '../components/MapComponent.js';
import { Vector3 } from 'three';
import { MOVE_SPEED, BORDER_MOVEMENT_THRESHOLD } from '../config/cameraMovementConfig.js';

class CameraMovementSystem extends System {
  execute(delta, time) {
    const rendererEntity = this.queries.renderer.results[0];
    const inputEntity = this.queries.input.results[0];
    const mapEntity = this.queries.map.results[0];

    if (!rendererEntity || !inputEntity || !mapEntity) return;

    const renderer = rendererEntity.getComponent(WebGLRendererComponent);
    const input = inputEntity.getComponent(InputStateComponent);
    const map = mapEntity.getComponent(MapComponent);

    const camera = renderer.camera.getObject3D();

    this.handleKeyboardMovement(camera, input, map);
    this.handleBorderMovement(camera, input, map);
  }

  handleKeyboardMovement(camera, input, map) {
    const keyMoveSpeed = MOVE_SPEED;
    const { pressedKeys } = input;

    if (pressedKeys['ArrowLeft']) {
      this.moveCamera(camera, 'left', keyMoveSpeed, map);
    }
    if (pressedKeys['ArrowRight']) {
      this.moveCamera(camera, 'right', keyMoveSpeed, map);
    }
    if (pressedKeys['ArrowUp']) {
      this.moveCamera(camera, 'up', keyMoveSpeed, map);
    }
    if (pressedKeys['ArrowDown']) {
      this.moveCamera(camera, 'down', keyMoveSpeed, map);
    }
  }

  handleBorderMovement(camera, input, map) {
    const { cursorPosition } = input;

    if (cursorPosition.x <= BORDER_MOVEMENT_THRESHOLD) {
      this.moveCamera(camera, 'left', MOVE_SPEED, map);
    } else if (cursorPosition.x >= window.innerWidth - BORDER_MOVEMENT_THRESHOLD) {
      this.moveCamera(camera, 'right', MOVE_SPEED, map);
    }

    if (cursorPosition.y <= BORDER_MOVEMENT_THRESHOLD) {
      this.moveCamera(camera, 'up', MOVE_SPEED, map);
    } else if (cursorPosition.y >= window.innerHeight - BORDER_MOVEMENT_THRESHOLD) {
      this.moveCamera(camera, 'down', MOVE_SPEED, map);
    }
  }

  moveCamera(camera, direction, speed, map) {
    let moved = false;

    switch (direction) {
      case 'left':
        camera.position.x += speed; // Move right
        moved = true;
        break;
      case 'right':
        camera.position.x -= speed; // Move left
        moved = true;
        break;
      case 'up':
        camera.position.z += speed; // Move forward
        moved = true;
        break;
      case 'down':
        camera.position.z -= speed; // Move backward
        moved = true;
        break;
    }

    if (moved) {
      camera.position.x = Math.max(-map.width / 2, Math.min(map.width / 2, camera.position.x));
      camera.position.z = Math.max(-map.height / 2, Math.min(map.height / 2, camera.position.z));
    }
  }
}

CameraMovementSystem.queries = {
  renderer: { components: [WebGLRendererComponent] },
  input: { components: [InputStateComponent] },
  map: { components: [MapComponent] }
};

export { CameraMovementSystem };
