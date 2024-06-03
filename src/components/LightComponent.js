// LightComponent.js
import { Component, Types } from 'ecsy';
import { Vector3 } from 'three';

export class LightComponent extends Component {}
LightComponent.schema = {
  color: { type: Types.String, default: '#ffffff' },
  intensity: { type: Types.Number, default: 1 },
  position: { type: Types.Ref, default: new Vector3() }
};
