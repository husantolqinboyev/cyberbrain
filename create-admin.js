// Simple script to create admin user
import { createClient } from '@supabase/supabase-js';

// You need to set these environment variables or replace with actual values
const supabaseUrl = 'https://dwvosiwottjjixudppca.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3dm9zaXdvdHRqaml4dWRwcGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkwNDg5NCwiZXhwIjoyMDgxNDgwODk0fQ.V7I1ccmN6a6Byz21xHieQk7SOyY91f3Qfy_fdije0WI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAdmin() {
  try {
    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      u => u.email === 'husanboy@cyberbrain.local'
    );

    if (adminExists) {
      console.log('Admin already exists');
      return;
    }

    // Create admin user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'husanboy@cyberbrain.local',
      password: 'husan0716',
      email_confirm: true,
      user_metadata: {
        nickname: 'husanboy',
        full_name: 'Husanboy (Admin)',
      },
    });

    if (userError) {
      throw userError;
    }

    console.log('Admin user created:', userData.user.id);

    // Update the profile nickname
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nickname: 'husanboy', full_name: 'Husanboy (Admin)' })
      .eq('user_id', userData.user.id);

    if (profileError) {
      console.log('Profile update error:', profileError);
    }

    // Add admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userData.user.id,
        role: 'admin',
      });

    if (roleError) {
      throw roleError;
    }

    console.log('Admin created successfully!');
  } catch (error) {
    console.error('Error creating admin:', error.message);
  }
}

createAdmin();
