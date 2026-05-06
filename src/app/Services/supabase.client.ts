import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pzgftkjxmevbfficnyur.supabase.co/';

const supabaseKey = 'sb_publishable_acxlBm3am0vDGj7AafHA-w_luENLXRi';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);