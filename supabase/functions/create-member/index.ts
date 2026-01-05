import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  uid?: string; // Optional custom UID
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  course_duration?: string;
  college_name?: string;
  current_semester?: number;
  enrollment_number?: string;
  class_coordinator_name?: string;
  hod_name?: string;
  principal_name?: string;
  whatsapp_number?: string;
  aadhaar_number?: string;
  blood_group?: string;
  role?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get authorization header to verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an admin using anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await anonClient.auth.getUser();
    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin or coordinator using service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .in("role", ["admin", "coordinator"]);

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Only admins and coordinators can create members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateMemberRequest = await req.json();

    // Validate required fields
    if (!body.first_name || !body.last_name) {
      return new Response(
        JSON.stringify({ error: "First name and last name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let uid: string;

    // Handle UID: either use provided custom UID or auto-generate
    if (body.uid && body.uid.trim() !== "") {
      const customUid = body.uid.trim().toUpperCase();
      
      // Validate format: BSGSOU + 3 digits
      if (!/^BSGSOU\d{3}$/.test(customUid)) {
        return new Response(
          JSON.stringify({ error: "Invalid UID format. Must be BSGSOU followed by 3 digits (e.g., BSGSOU002)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Check if UID already exists in profiles
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("uid", customUid)
        .maybeSingle();
        
      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "This UID is already in use" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Check if corresponding email exists in auth.users
      const emailToCheck = `${customUid.toLowerCase()}@bsg.local`;
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(u => u.email === emailToCheck);
      
      if (existingAuthUser) {
        return new Response(
          JSON.stringify({ error: "This UID is already registered in the system" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      uid = customUid;
      console.log(`Using custom UID: ${uid}`);
    } else {
      // Auto-generate UID using database function
      const { data: uidData, error: uidError } = await adminClient.rpc("generate_next_uid_for", {
        _caller: callerUser.id,
      });
      if (uidError) {
        console.error("UID generation error:", uidError);
        return new Response(
          JSON.stringify({ error: uidError.message }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      uid = uidData as string;
      console.log(`Auto-generated UID: ${uid}`);
    }

    const email = `${uid.toLowerCase()}@bsg.local`;

    // Generate secure password
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const randomValues = new Uint32Array(16);
    crypto.getRandomValues(randomValues);
    const password = Array.from(randomValues, (v) => charset[v % charset.length]).join("");

    // Create auth user with service role (bypasses signUp session switch issue)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name,
      },
    });

    if (authError) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create user: " + authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile with service role
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: authData.user.id,
      uid,
      first_name: body.first_name,
      middle_name: body.middle_name || null,
      last_name: body.last_name,
      gender: body.gender || null,
      date_of_birth: body.date_of_birth || null,
      course_duration: body.course_duration || null,
      college_name: body.college_name || "Silver Oak University",
      current_semester: body.current_semester || null,
      enrollment_number: body.enrollment_number || null,
      class_coordinator_name: body.class_coordinator_name || null,
      hod_name: body.hod_name || null,
      principal_name: body.principal_name || null,
      whatsapp_number: body.whatsapp_number || null,
      aadhaar_number: body.aadhaar_number || null,
      blood_group: body.blood_group || null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Try to clean up the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role
    const role = body.role || "member";
    const { error: roleInsertError } = await adminClient.from("user_roles").insert({
      user_id: authData.user.id,
      role,
    });

    if (roleInsertError) {
      console.error("Role assignment error:", roleInsertError);
      // Clean up
      await adminClient.from("profiles").delete().eq("user_id", authData.user.id);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, uid, password }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
