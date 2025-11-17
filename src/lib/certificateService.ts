/**
 * Certificate Service
 *
 * Handles certificate track and module progress tracking, completion logic,
 * and certificate issuance.
 */

import { supabase } from './supabaseClient';
import { Module, getModuleById, getModulesByTrack, ALL_MODULES } from './moduleContent';
import { awardBadge } from './gamificationService';

export interface CertificateTrack {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration_hours: number;
  price_cad: number;
  required_tier: 'free' | 'edubiz' | 'pro';
  module_count: number;
  enrolled_count?: number;
  completion_rate?: number;
}

export interface ModuleProgress {
  id?: string;
  user_id: string;
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  time_spent_minutes: number;
  quiz_score?: number;
  last_accessed?: string;
  completed_at?: string;
  module?: Module;
}

export interface UserCertificate {
  id: string;
  user_id: string;
  track_id: string;
  issued_at: string;
  pdf_url?: string;
  verification_code: string;
}

export interface TrackProgress {
  track: CertificateTrack;
  modules: Module[];
  userProgress: ModuleProgress[];
  completedCount: number;
  totalCount: number;
  overallProgress: number;
  certificate?: UserCertificate;
}

/**
 * Get all certificate tracks
 */
export async function getAllTracks(): Promise<{ tracks: CertificateTrack[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('certificate_tracks')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return { tracks: data || [], error: null };
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return { tracks: [], error: error as Error };
  }
}

/**
 * Get single track by slug
 */
export async function getTrackBySlug(slug: string): Promise<{ track: CertificateTrack | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('certificate_tracks')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    return { track: data, error: null };
  } catch (error) {
    console.error('Error fetching track:', error);
    return { track: null, error: error as Error };
  }
}

/**
 * Get user's progress for all tracks
 */
export async function getUserTrackProgress(userId: string): Promise<{ progress: TrackProgress[]; error: Error | null }> {
  try {
    // Fetch all tracks
    const { tracks, error: tracksError } = await getAllTracks();
    if (tracksError) throw tracksError;

    // Fetch user's module progress
    const { data: progressData, error: progressError } = await supabase
      .from('user_module_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) throw progressError;

    // Fetch user's certificates
    const { data: certificates, error: certError } = await supabase
      .from('user_certificates')
      .select('*')
      .eq('user_id', userId);

    if (certError) throw certError;

    // Build progress for each track
    const progress: TrackProgress[] = tracks.map(track => {
      const modules = getModulesByTrack(track.slug);
      const userProgress = progressData?.filter(p =>
        modules.some(m => m.id === p.module_id)
      ) || [];

      const completedCount = userProgress.filter(p => p.status === 'completed').length;
      const overallProgress = modules.length > 0
        ? (completedCount / modules.length) * 100
        : 0;

      const certificate = certificates?.find(c => c.track_id === track.id);

      return {
        track,
        modules,
        userProgress,
        completedCount,
        totalCount: modules.length,
        overallProgress,
        certificate
      };
    });

    return { progress, error: null };
  } catch (error) {
    console.error('Error fetching user track progress:', error);
    return { progress: [], error: error as Error };
  }
}

/**
 * Get user's progress for a single track
 */
export async function getTrackProgress(
  userId: string,
  trackSlug: string
): Promise<{ progress: TrackProgress | null; error: Error | null }> {
  try {
    const { track, error: trackError } = await getTrackBySlug(trackSlug);
    if (trackError || !track) throw trackError || new Error('Track not found');

    const modules = getModulesByTrack(trackSlug);

    const { data: progressData, error: progressError } = await supabase
      .from('user_module_progress')
      .select('*')
      .eq('user_id', userId)
      .in('module_id', modules.map(m => m.id));

    if (progressError) throw progressError;

    const { data: certificates, error: certError } = await supabase
      .from('user_certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('track_id', track.id)
      .maybeSingle();

    if (certError) throw certError;

    const completedCount = progressData?.filter(p => p.status === 'completed').length || 0;
    const overallProgress = modules.length > 0
      ? (completedCount / modules.length) * 100
      : 0;

    return {
      progress: {
        track,
        modules,
        userProgress: progressData || [],
        completedCount,
        totalCount: modules.length,
        overallProgress,
        certificate: certificates || undefined
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching track progress:', error);
    return { progress: null, error: error as Error };
  }
}

/**
 * Get or create module progress for user
 */
export async function getModuleProgress(
  userId: string,
  moduleId: string
): Promise<{ progress: ModuleProgress | null; error: Error | null }> {
  try {
    // Try to fetch existing progress
    const { data: existing, error: fetchError } = await supabase
      .from('user_module_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      const module = getModuleById(moduleId);
      return {
        progress: {
          ...existing,
          module
        },
        error: null
      };
    }

    // Create new progress record
    const { data: newProgress, error: createError } = await supabase
      .from('user_module_progress')
      .insert({
        user_id: userId,
        module_id: moduleId,
        status: 'not_started',
        progress_percentage: 0,
        time_spent_minutes: 0
      })
      .select()
      .single();

    if (createError) throw createError;

    const module = getModuleById(moduleId);

    return {
      progress: {
        ...newProgress,
        module
      },
      error: null
    };
  } catch (error) {
    console.error('Error getting module progress:', error);
    return { progress: null, error: error as Error };
  }
}

/**
 * Update module progress
 */
export async function updateModuleProgress(
  userId: string,
  moduleId: string,
  updates: Partial<ModuleProgress>
): Promise<{ progress: ModuleProgress | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_module_progress')
      .update({
        ...updates,
        last_accessed: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .select()
      .single();

    if (error) throw error;

    const module = getModuleById(moduleId);

    return {
      progress: {
        ...data,
        module
      },
      error: null
    };
  } catch (error) {
    console.error('Error updating module progress:', error);
    return { progress: null, error: error as Error };
  }
}

/**
 * Mark module as completed
 */
export async function completeModule(
  userId: string,
  moduleId: string,
  quizScore?: number
): Promise<{ success: boolean; badgeAwarded?: any; error: Error | null }> {
  try {
    // Update module progress to completed
    const { error: updateError } = await supabase
      .from('user_module_progress')
      .update({
        status: 'completed',
        progress_percentage: 100,
        quiz_score: quizScore,
        completed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('module_id', moduleId);

    if (updateError) throw updateError;

    // Check if track is now complete
    const module = getModuleById(moduleId);
    if (!module) throw new Error('Module not found');

    const trackModules = getModulesByTrack(module.track_slug);
    const { data: allProgress, error: progressError } = await supabase
      .from('user_module_progress')
      .select('*')
      .eq('user_id', userId)
      .in('module_id', trackModules.map(m => m.id));

    if (progressError) throw progressError;

    const completedCount = allProgress?.filter(p => p.status === 'completed').length || 0;

    // If all modules completed, issue certificate
    let certificateIssued = false;
    if (completedCount === trackModules.length) {
      const { track } = await getTrackBySlug(module.track_slug);
      if (track) {
        await issueCertificate(userId, track.id);
        certificateIssued = true;
      }
    }

    // Award badge for module completion (if criteria met)
    const { awarded, badge } = await awardBadge(
      userId,
      certificateIssued ? 'certificate-complete' : 'module-complete',
      { moduleId, trackSlug: module.track_slug }
    );

    return {
      success: true,
      badgeAwarded: awarded ? badge : undefined,
      error: null
    };
  } catch (error) {
    console.error('Error completing module:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Issue certificate for completed track
 */
export async function issueCertificate(
  userId: string,
  trackId: string
): Promise<{ certificate: UserCertificate | null; error: Error | null }> {
  try {
    // Check if certificate already issued
    const { data: existing, error: checkError } = await supabase
      .from('user_certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('track_id', trackId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existing) {
      return { certificate: existing, error: null };
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Issue certificate
    const { data: certificate, error: issueError } = await supabase
      .from('user_certificates')
      .insert({
        user_id: userId,
        track_id: trackId,
        verification_code: verificationCode,
        issued_at: new Date().toISOString()
      })
      .select()
      .single();

    if (issueError) throw issueError;

    // Award certificate completion badge
    await awardBadge(userId, 'certificate-complete', { trackId });

    return { certificate, error: null };
  } catch (error) {
    console.error('Error issuing certificate:', error);
    return { certificate: null, error: error as Error };
  }
}

/**
 * Generate unique verification code for certificate
 */
function generateVerificationCode(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CERT-${timestamp}-${randomStr}`;
}

/**
 * Verify certificate by code
 */
export async function verifyCertificate(
  verificationCode: string
): Promise<{ valid: boolean; certificate: UserCertificate | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_certificates')
      .select('*')
      .eq('verification_code', verificationCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, certificate: null, error: null };
      }
      throw error;
    }

    return { valid: true, certificate: data, error: null };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return { valid: false, certificate: null, error: error as Error };
  }
}

/**
 * Get user's certificates
 */
export async function getUserCertificates(
  userId: string
): Promise<{ certificates: UserCertificate[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_certificates')
      .select('*')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });

    if (error) throw error;

    return { certificates: data || [], error: null };
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return { certificates: [], error: error as Error };
  }
}
