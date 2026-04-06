import type { WorkoutSession } from '../hooks/useWorkoutHistory';
import { getSupabaseClient } from '../lib/supabase';

export interface SessionSyncPayload {
  id: string;
  started_at: string;
  ended_at: string;
  distance_m: number;
  elapsed_seconds: number;
  average_pace_min_km: number;
  music_file_name: string | null;
  music_mode: 'follow_music' | 'target_pace' | null;
  source_device_id: string;
  sync_status: 'pending' | 'synced' | 'deleted';
}

export function mapWorkoutToSessionPayload(
  session: WorkoutSession,
  deviceId: string,
  syncStatus: 'pending' | 'synced' | 'deleted' = 'synced'
): SessionSyncPayload {
  return {
    id: session.id,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    distance_m: session.distanceM,
    elapsed_seconds: session.elapsedSeconds,
    average_pace_min_km: session.averagePace,
    music_file_name: session.musicFileName ?? null,
    music_mode: session.musicMode ?? null,
    source_device_id: deviceId,
    sync_status: syncStatus,
  };
}

export async function upsertSession(
  userId: string,
  payload: SessionSyncPayload
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, reason: 'Supabase nao configurado no ambiente.' };
  }

  const { error } = await client
    .from('sessions')
    .upsert({ ...payload, user_id: userId }, { onConflict: 'id' });

  if (error) {
    return { ok: false, reason: error.message };
  }

  return { ok: true };
}

export async function pullSessionsSince(userId: string, sinceIso: string) {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', sinceIso)
    .order('updated_at', { ascending: true });

  if (error || !data) return [];
  return data;
}
