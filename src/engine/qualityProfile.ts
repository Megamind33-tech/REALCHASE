import type { QualityMode } from '@/context/shellTypes';

export type SceneLoaderQuality = 'very-low' | 'low' | 'medium' | 'high';

export interface QualityProfile {
  loaderQuality: SceneLoaderQuality;
  hardwareScaling: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  msaa: number;
  postProcess: boolean;
  reflectivity: number;
}

export const QUALITY_PROFILES: Record<QualityMode, QualityProfile> = {
  low: {
    loaderQuality: 'very-low',
    hardwareScaling: 0.75,
    shadowsEnabled: true,
    shadowMapSize: 512,
    msaa: 1,
    postProcess: false,
    reflectivity: 0.15,
  },
  balanced: {
    loaderQuality: 'medium',
    hardwareScaling: 1,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    msaa: 2,
    postProcess: false,
    reflectivity: 0.35,
  },
  high: {
    loaderQuality: 'high',
    hardwareScaling: 1,
    shadowsEnabled: true,
    shadowMapSize: 2048,
    msaa: 4,
    postProcess: true,
    reflectivity: 0.55,
  },
};
