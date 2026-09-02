'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-ink-50">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Image src="/logo-full.png" alt="Mr Pocket — Your Pocket Accountant" width={220} height={200} className="object-contain" priority />
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <div className="text-right">
              <a href="/forgot-password" className="text-sm text-brand-600 hover:underline">
                Forgot Password?
              </a>
            </div>
            {error && <p className="text-outflow text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-2 my-6">
            <div className="h-px bg-ink-200 flex-1" />
            <span className="text-ink-400 text-sm">Or</span>
            <div className="h-px bg-ink-200 flex-1" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full border border-ink-200 rounded-lg py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Continue With Google
          </button>
        </div>

        <p className="text-center text-sm text-ink-500 mt-6">
          No Account? <a href="/signup" className="text-brand-600 font-medium hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
}