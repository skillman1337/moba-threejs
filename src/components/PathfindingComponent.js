// src/components/PathfindingComponent.js
import { Component, Types } from 'ecsy';

export class PathfindingComponent extends Component {}
PathfindingComponent.schema = {
  pathfinder: { type: Types.Ref }, // Instance of Pathfinding
  helper: { type: Types.Ref }, // Instance of PathfindingHelper
  zone: { type: Types.String }, // Zone ID
  debug: { type: Types.Boolean, default: false }
};
