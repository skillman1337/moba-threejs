// components/CharacterComponent.js
import { Component, Types } from 'ecsy';
import { Vector3 } from 'three';

export class CharacterComponent extends Component {}
CharacterComponent.schema = {
  character: { type: Types.Ref },
  position: { type: Types.Ref, default: new Vector3() },
  rotation: { type: Types.Ref, default: new Vector3() },
  movementSpeed: { type: Types.Number, default: 1 },
  animations: { type: Types.Array, default: [] },
  mixer: { type: Types.Ref, default: null },
  currentAction: { type: Types.Ref, default: null },
  positionTween: { type: Types.Ref, default: null },
  animationTween: { type: Types.Ref, default: null }
};
