// components/InputStateComponent.js
import { Component, Types } from 'ecsy';

export class InputStateComponent extends Component {}
InputStateComponent.schema = {
  cursorPosition: {
    type: Types.Ref,
    default: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  },
  pressedKeys: { type: Types.Ref, default: {} }
};
