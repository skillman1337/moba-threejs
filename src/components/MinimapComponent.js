import { Component, Types } from 'ecsy';

export class MinimapComponent extends Component {}
MinimapComponent.schema = {
  context: { type: Types.Ref, default: null },
  canvas: { type: Types.Ref, default: null },
  width: { type: Types.Number, default: 200 },
  height: { type: Types.Number, default: 200 },
  isDraggingMinimap: { type: Types.Boolean, default: false },
  panStart: { type: Types.Ref, default: { x: 0, y: 0 } },
  cameraStart: { type: Types.Ref, default: { x: 0, y: 0 } }
};
