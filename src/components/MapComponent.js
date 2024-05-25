import { Component, Types } from 'ecsy';

export class MapComponent extends Component {}
MapComponent.schema = {
  width: { type: Types.Number, default: 0 },
  height: { type: Types.Number, default: 0 }
};
