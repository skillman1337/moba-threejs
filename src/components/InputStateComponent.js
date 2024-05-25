// components/InputStateComponent.js
import { Component, Types } from 'ecsy';

export class InputStateComponent extends Component {}
InputStateComponent.schema = {
  cursorPosition: { type: Types.Ref, default: { x: 0, y: 0 } },
  pressedKeys: { type: Types.Ref, default: {} }
};
