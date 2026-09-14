import { useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import { getMyProfile, type Profile } from '../services/auth';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        setProfile(null);
        setEmail('');
        setLoading(false);
        return;
      }
      setEmail(session.user.email ?? '');
      const p = await getMyProfile();
      if (mounted) {
        setProfile(p);
        setLoading(false);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, profile, email };
}
