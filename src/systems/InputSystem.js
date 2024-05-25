// systems/InputSystem.js
import { System } from 'ecsy';
import { InputStateComponent } from '../components/InputStateComponent.js';

class InputSystem extends System {
  init() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.eventListenersInitialized = false;
  }

  execute(delta, time) {
    if (!this.eventListenersInitialized) {
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('keyup', this.handleKeyUp);
      this.eventListenersInitialized = true;
    }
  }

  handleMouseMove(event) {
    const inputEntity = this.queries.input.results[0];
    if (!inputEntity) return;

    const input = inputEntity.getComponent(InputStateComponent);
    input.cursorPosition.x = event.clientX;
    input.cursorPosition.y = event.clientY;
  }

  handleKeyDown(event) {
    const inputEntity = this.queries.input.results[0];
    if (!inputEntity) return;

    const input = inputEntity.getComponent(InputStateComponent);
    input.pressedKeys[event.key] = true;
  }

  handleKeyUp(event) {
    const inputEntity = this.queries.input.results[0];
    if (!inputEntity) return;

    const input = inputEntity.getComponent(InputStateComponent);
    input.pressedKeys[event.key] = false;
  }
}

InputSystem.queries = {
  input: { components: [InputStateComponent] }
};

export { InputSystem };
