import { adminClient } from '@/lib/supabase/admin'

export interface ModelConfig {
  modelVersion: string
  modelType: string
  spamThreshold: number
  phishingThreshold: number
  malwareThreshold: number
  weights: {
    w_auth: number
    w_reputation: number
    w_content: number
    w_url: number
    w_attachment: number
    w_velocity: number
    w_campaign: number
  }
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelVersion: 'v1.0.0-phase10',
  modelType: 'ENSEMBLE_V1',
  spamThreshold: 0.6500,
  phishingThreshold: 0.7000,
  malwareThreshold: 0.8000,
  weights: {
    w_auth: 0.20,
    w_reputation: 0.20,
    w_content: 0.20,
    w_url: 0.15,
    w_attachment: 0.10,
    w_velocity: 0.05,
    w_campaign: 0.10,
  },
}

/**
 * Loads active model weights and decision thresholds from mail_model_registry with zero-latency fallback.
 */
export async function getActiveModelConfig(): Promise<ModelConfig> {
  try {
    const { data: activeModel } = await adminClient
      .from('mail_model_registry')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!activeModel) return DEFAULT_MODEL_CONFIG

    return {
      modelVersion: activeModel.model_version || DEFAULT_MODEL_CONFIG.modelVersion,
      modelType: activeModel.model_type || DEFAULT_MODEL_CONFIG.modelType,
      spamThreshold: Number(activeModel.spam_threshold) || DEFAULT_MODEL_CONFIG.spamThreshold,
      phishingThreshold: Number(activeModel.phishing_threshold) || DEFAULT_MODEL_CONFIG.phishingThreshold,
      malwareThreshold: Number(activeModel.malware_threshold) || DEFAULT_MODEL_CONFIG.malwareThreshold,
      weights: {
        ...DEFAULT_MODEL_CONFIG.weights,
        ...(activeModel.weights || {}),
      },
    }
  } catch (e) {
    console.error('[ModelRegistry Error]', e)
    return DEFAULT_MODEL_CONFIG
  }
}