'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Check Your Email To Confirm Your Account.');
    }
  }

  async function handleGoogleSignup() {
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
          <h1 className="text-lg font-semibold text-center text-ink-900 mb-1">Create Your Account</h1>
          <p className="text-center text-sm text-ink-400 mb-6">Start Tracking With Mr Pocket</p>

          <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="Password (Min 6 Characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {error && <p className="text-outflow text-sm">{error}</p>}
            {message && <p className="text-inflow text-sm">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating…' : 'Sign Up'}
            </button>
          </form>

          <div className="flex items-center gap-2 my-6">
            <div className="h-px bg-ink-200 flex-1" />
            <span className="text-ink-400 text-sm">Or</span>
            <div className="h-px bg-ink-200 flex-1" />
          </div>

          <button
            onClick={handleGoogleSignup}
            className="w-full border border-ink-200 rounded-lg py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Continue With Google
          </button>
        </div>

        <p className="text-center text-sm text-ink-500 mt-6">
          Already Have An Account? <a href="/login" className="text-brand-600 font-medium hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  );
}