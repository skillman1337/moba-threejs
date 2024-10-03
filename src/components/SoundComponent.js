// components/SoundComponent.js
import { Component, Types } from 'ecsy';

export class SoundComponent extends Component {
  static schema = {
    volume: { type: Types.Number, default: 1.0 } // Default volume is 100%
  };
}
