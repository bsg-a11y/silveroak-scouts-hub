import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active profiles with a semester set
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, current_semester, course_duration')
      .eq('status', 'active')
      .not('current_semester', 'is', null);

    if (fetchError) throw fetchError;

    let updatedCount = 0;

    for (const profile of (profiles || [])) {
      // Determine max semester based on course_duration
      let maxSemester = 10; // default for degree
      if (profile.course_duration) {
        const duration = profile.course_duration.toLowerCase();
        if (duration.includes('3') || duration.includes('diploma')) {
          maxSemester = 6;
        } else if (duration.includes('4')) {
          maxSemester = 8;
        } else if (duration.includes('5')) {
          maxSemester = 10;
        } else if (duration.includes('2')) {
          maxSemester = 4;
        }
      }

      const currentSem = profile.current_semester || 0;
      if (currentSem < maxSemester) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ current_semester: currentSem + 1 })
          .eq('id', profile.id);

        if (!updateError) updatedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: updatedCount, total: profiles?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
