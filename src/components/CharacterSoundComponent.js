import { Component, Types } from 'ecsy';

export class CharacterSoundComponent extends Component {}
CharacterSoundComponent.schema = {
  sounds: { type: Types.Array, default: [] },
  currentSoundIndex: { type: Types.Number, default: 0 },
  lastPlayTime: { type: Types.Number, default: 0 }
};
