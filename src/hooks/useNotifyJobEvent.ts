import { supabase } from '@/integrations/supabase/client';

type JobEvent =
  | 'artisan_assigned'
  | 'quote_submitted'
  | 'quote_accepted'
  | 'inspection_done'
  | 'inspection_confirmed'
  | 'job_completed'
  | 'payment_released';

export async function notifyJobEvent(job_id: string, event: JobEvent): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.functions.invoke('notify-job-event', {
      body: { job_id, event },
    });
  } catch (e) {
    // Non-critical — don't throw, just log
    console.warn('notifyJobEvent failed:', e);
  }
}
