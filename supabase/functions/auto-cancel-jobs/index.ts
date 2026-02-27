import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    // Find jobs pending for more than 24 hours with no artisan assigned
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, customer_id')
      .eq('status', 'pending')
      .is('artisan_id', null)
      .lt('created_at', cutoff);

    if (error) throw error;

    const cancelled = [];
    for (const job of jobs || []) {
      const { error: updateErr } = await supabase
        .from('jobs')
        .update({ status: 'cancelled', cancellation_reason: 'No artisan assigned within 24 hours' })
        .eq('id', job.id);

      if (!updateErr) {
        await supabase.from('job_status_history').insert({
          job_id: job.id,
          old_status: 'pending',
          new_status: 'cancelled',
          changed_by: '00000000-0000-0000-0000-000000000000',
          notes: 'Auto-cancelled: no artisan assigned within 24 hours',
        });
        cancelled.push(job.id);
      }
    }

    return new Response(
      JSON.stringify({ cancelled: cancelled.length, job_ids: cancelled }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
