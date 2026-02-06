import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Sheets API helper
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  
  // Create JWT claim set
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  
  // Base64url encode
  const base64urlEncode = (obj: object) => {
    const str = JSON.stringify(obj);
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  
  const encodedHeader = base64urlEncode(header);
  const encodedClaimSet = base64urlEncode(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;
  
  // Sign the JWT with the private key
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const jwt = `${signatureInput}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    console.error('Token response:', tokenData);
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  
  return tokenData.access_token;
}

async function createSpreadsheet(accessToken: string, title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{
        properties: { title: 'Members' }
      }]
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create spreadsheet: ${error}`);
  }
  
  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl
  };
}

async function updateSpreadsheet(accessToken: string, spreadsheetId: string, values: any[][]) {
  // Clear existing data first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A:Z:clear`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Update with new data
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Members!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update spreadsheet: ${error}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is admin/coordinator
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check if user is admin or coordinator
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!roleData || !['admin', 'coordinator'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Only admins can manage Google Sheets sync' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { action, sheetName } = await req.json();
    console.log('Action:', action, 'Sheet name:', sheetName);

    const googleServiceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!googleServiceAccountJson) {
      return new Response(JSON.stringify({ 
        error: 'Google Service Account not configured. Please add GOOGLE_SERVICE_ACCOUNT_JSON secret.' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get access token
    const accessToken = await getGoogleAccessToken(googleServiceAccountJson);
    console.log('Got access token');

    // Use service role client for admin operations
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (action === 'create') {
      // Create new spreadsheet
      const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(
        accessToken, 
        sheetName || 'BSG Members'
      );
      console.log('Created spreadsheet:', spreadsheetId);

      // Save settings
      await supabaseServiceRole
        .from('google_sheets_settings')
        .update({
          sheet_id: spreadsheetId,
          sheet_url: spreadsheetUrl,
          sheet_name: sheetName || 'BSG Members',
          is_enabled: true,
          created_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

      // Sync initial data
      const { data: members } = await supabaseServiceRole
        .from('profiles')
        .select('*')
        .order('uid', { ascending: true });

      if (members && members.length > 0) {
        const headers = [
          'BSG ID', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Date of Birth',
          'Blood Group', 'WhatsApp', 'College', 'Academic Department', 'Course Duration', 
          'Semester', 'Enrollment No.', 'Class Coordinator', 'HOD', 'Principal',
          'Status', 'Joining Date', 'Created At'
        ];

        const rows = members.map(m => [
          m.uid,
          m.first_name,
          m.middle_name || '',
          m.last_name,
          m.gender || '',
          m.date_of_birth || '',
          m.blood_group || '',
          m.whatsapp_number || '',
          m.college_name || '',
          m.academic_department || '',
          m.course_duration || '',
          m.current_semester?.toString() || '',
          m.enrollment_number || '',
          m.class_coordinator_name || '',
          m.hod_name || '',
          m.principal_name || '',
          m.status || '',
          m.joining_date || '',
          m.created_at || ''
        ]);

        await updateSpreadsheet(accessToken, spreadsheetId, [headers, ...rows]);
        console.log('Synced', members.length, 'members');

        // Update last synced
        await supabaseServiceRole
          .from('google_sheets_settings')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        spreadsheetId,
        spreadsheetUrl,
        message: 'Spreadsheet created and synced successfully'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'sync') {
      // Get current settings
      const { data: settings } = await supabaseServiceRole
        .from('google_sheets_settings')
        .select('*')
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .single();

      if (!settings?.sheet_id) {
        return new Response(JSON.stringify({ error: 'No spreadsheet linked. Please create one first.' }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Get all members
      const { data: members } = await supabaseServiceRole
        .from('profiles')
        .select('*')
        .order('uid', { ascending: true });

      if (members && members.length > 0) {
        const headers = [
          'BSG ID', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Date of Birth',
          'Blood Group', 'WhatsApp', 'College', 'Academic Department', 'Course Duration', 
          'Semester', 'Enrollment No.', 'Class Coordinator', 'HOD', 'Principal',
          'Status', 'Joining Date', 'Created At'
        ];

        const rows = members.map(m => [
          m.uid,
          m.first_name,
          m.middle_name || '',
          m.last_name,
          m.gender || '',
          m.date_of_birth || '',
          m.blood_group || '',
          m.whatsapp_number || '',
          m.college_name || '',
          m.academic_department || '',
          m.course_duration || '',
          m.current_semester?.toString() || '',
          m.enrollment_number || '',
          m.class_coordinator_name || '',
          m.hod_name || '',
          m.principal_name || '',
          m.status || '',
          m.joining_date || '',
          m.created_at || ''
        ]);

        await updateSpreadsheet(accessToken, settings.sheet_id, [headers, ...rows]);
        
        // Update last synced
        await supabaseServiceRole
          .from('google_sheets_settings')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        memberCount: members?.length || 0,
        message: 'Spreadsheet synced successfully'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'disable') {
      await supabaseServiceRole
        .from('google_sheets_settings')
        .update({ 
          is_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Google Sheets sync disabled'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});