import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateFacultyRequest {
  password?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  college_id: string;
  whatsapp_number?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is an admin
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if caller is admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin");

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Only admins can create faculty coordinators" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateFacultyRequest = await req.json();

    if (!body.first_name || !body.last_name || !body.college_id) {
      return new Response(
        JSON.stringify({ error: "First name, last name, and college are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get college short code
    const { data: collegeData, error: collegeError } = await adminClient
      .from("colleges")
      .select("short_code, name")
      .eq("id", body.college_id)
      .single();

    if (collegeError || !collegeData) {
      return new Response(
        JSON.stringify({ error: "Invalid college selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate faculty UID using the database function
    const { data: uidData, error: uidError } = await adminClient.rpc("generate_faculty_uid", {
      _college_short_code: collegeData.short_code,
    });

    if (uidError) {
      console.error("UID generation error:", uidError);
      return new Response(
        JSON.stringify({ error: "Failed to generate UID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uid = uidData as string;
    const email = `${uid.toLowerCase()}@bsg.local`;
    console.log(`Generated faculty UID: ${uid}`);

    // Handle password
    let password: string;
    if (body.password && body.password.trim() !== "") {
      const customPassword = body.password.trim();
      if (customPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      password = customPassword;
    } else {
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      const randomValues = new Uint32Array(16);
      crypto.getRandomValues(randomValues);
      password = Array.from(randomValues, (v) => charset[v % charset.length]).join("");
    }

    // Create auth user
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

    // Create profile with faculty_college_id
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: authData.user.id,
      uid,
      first_name: body.first_name,
      middle_name: body.middle_name || null,
      last_name: body.last_name,
      college_name: collegeData.name,
      faculty_college_id: body.college_id,
      whatsapp_number: body.whatsapp_number || null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create profile: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign faculty_coordinator role
    const { error: roleInsertError } = await adminClient.from("user_roles").insert({
      user_id: authData.user.id,
      role: "faculty_coordinator",
    });

    if (roleInsertError) {
      console.error("Role assignment error:", roleInsertError);
      await adminClient.from("profiles").delete().eq("user_id", authData.user.id);
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleInsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Faculty coordinator created successfully: ${uid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        uid, 
        password,
        college: collegeData.name 
      }),
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
