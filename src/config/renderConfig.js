// src\config\renderConfig.js
// Renderer config
import {
  NoToneMapping,
  LinearToneMapping,
  ReinhardToneMapping,
  CineonToneMapping,
  ACESFilmicToneMapping,
  CustomToneMapping,
  AgXToneMapping,
  NeutralToneMapping
} from 'three';
export const PHYSICALLY_CORRECT_LIGHTS = false;
export const toneMapping = ACESFilmicToneMapping; // NoToneMapping, LinearToneMapping, ReinhardToneMapping, CineonToneMapping, ACESFilmicToneMapping, CustomToneMapping, AgXToneMapping, NeutralToneMapping
export const toneMappingExposure = 1; // Default is 1
