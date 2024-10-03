// components/CharacterComponent.js
import { Component, Types } from 'ecsy';

export class CharacterComponent extends Component {}
CharacterComponent.schema = {
  character: { type: Types.Ref },
  movementSpeed: { type: Types.Number, default: 1 },
  animations: { type: Types.Array, default: [] },
  mixer: { type: Types.Ref, default: null },
  currentAction: { type: Types.Ref, default: null },
  positionTween: { type: Types.Ref, default: null },
  animationTween: { type: Types.Ref, default: null }
};
