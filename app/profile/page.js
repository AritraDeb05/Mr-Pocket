'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/dateFormat';
import Nav from '@/components/Nav';
import { Mail, KeyRound, Chrome, ShieldCheck, Wallet, CheckCircle2, User as UserIcon, Calendar, StickyNote, Lock, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [identities, setIdentities] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [step, setStep] = useState('idle');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [minBalance, setMinBalance] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState('');

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [bio, setBio] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState('');

  // Change password
  const [oldPassword, setOldPassword] = useState('');
  const [changePassword, setChangePassword] = useState('');
  const [changePasswordMsg, setChangePasswordMsg] = useState('');
  const [changePasswordErr, setChangePasswordErr] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(data?.identities || []);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('min_balance, full_name, date_of_birth, bio')
        .eq('id', user.id)
        .single();
      if (profile) {
        setMinBalance(profile.min_balance ?? '');
        setFullName(profile.full_name || '');
        setDob(profile.date_of_birth || '');
        setBio(profile.bio || '');
      }
    }
  }

  const hasGoogle = identities.some((i) => i.provider === 'google');
  const hasPassword = identities.some((i) => i.provider === 'email');

  async function linkGoogle() {
    setErr('');
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (error) setErr(error.message);
  }

  async function sendOtp() {
    setErr('');
    setMsg('');
    setSendingOtp(true);
    const { error } = await supabase.auth.reauthenticate();
    setSendingOtp(false);
    if (error) {
      setErr(error.message);
    } else {
      setStep('otp-sent');
      setMsg('Enter The Code We Emailed You.');
    }
  }

  async function verifyOtpAndSetPassword(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setVerifyingOtp(true);

    const token = otp.trim();

    // Supabase reauthenticate() sends an OTP that acts as a reauthentication nonce.
    // It must be passed directly to updateUser({ password, nonce }) rather than verifyOtp().
    const { error: pwError } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: token,
    });

    setVerifyingOtp(false);

    if (pwError) {
      setErr(pwError.message);
      return;
    }

    setStep('done');
    setMsg('Password Added. You Can Now Log In With Email + Password Too.');
    setOtp('');
    setNewPassword('');
    load();
  }

  async function handleSaveMinBalance(e) {
    e.preventDefault();
    setBalanceMsg('');
    setSavingBalance(true);

    const { error } = await supabase
      .from('profiles')
      .update({ min_balance: parseFloat(minBalance) || 0 })
      .eq('id', user.id);

    setSavingBalance(false);
    setBalanceMsg(error ? error.message : 'Saved.');
  }

  async function handleSaveDetails(e) {
    e.preventDefault();
    setDetailsMsg('');
    setSavingDetails(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName || null, date_of_birth: dob || null, bio: bio || null })
      .eq('id', user.id);

    setSavingDetails(false);
    setDetailsMsg(error ? error.message : 'Saved.');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setChangePasswordErr('');
    setChangePasswordMsg('');
    setChangingPassword(true);

    // Verify the old password by re-authenticating with it — this is how we
    // confirm the person actually knows the current password before letting
    // them set a new one.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (verifyError) {
      setChangingPassword(false);
      setChangePasswordErr('Current Password Is Incorrect.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: changePassword });

    setChangingPassword(false);

    if (updateError) {
      setChangePasswordErr(updateError.message);
    } else {
      setChangePasswordMsg('Password Changed Successfully.');
      setOldPassword('');
      setChangePassword('');
    }
  }

  async function handleDeleteAccount() {
    setDeleteErr('');

    if (deleteConfirmText !== 'DELETE') {
      setDeleteErr('Type DELETE Exactly To Confirm.');
      return;
    }

    const confirmed = window.confirm(
      'This Will Permanently Delete Your Account And All Data — Transactions, Goals, Reminders, Everything. This Cannot Be Undone. Continue?'
    );
    if (!confirmed) return;

    setDeleting(true);

    const res = await fetch('/api/delete-account', { method: 'POST' });
    const result = await res.json();

    if (!res.ok) {
      setDeleting(false);
      setDeleteErr(result.error || 'Something Went Wrong. Please Try Again.');
      return;
    }

    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!user) {
    return (
      <div>
        <Nav />
        <div className="p-8 text-ink-400">Loading…</div>
      </div>
    );
  }

  const initial = (fullName || user.email)?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">

        <div className="bg-white rounded-xl2 shadow-card p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-semibold flex-shrink-0">
            {initial}
          </div>
          <div>
            {fullName && <p className="text-lg font-semibold text-ink-900 leading-tight">{fullName}</p>}
            <p className={fullName ? 'text-sm text-ink-500' : 'text-lg font-semibold text-ink-900'}>{user.email}</p>
            <p className="text-xs text-ink-400 mt-0.5">Member Since {formatDate(user.created_at)}</p>
          </div>
        </div>

        <form onSubmit={handleSaveDetails} className="bg-white rounded-xl2 shadow-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <UserIcon size={18} className="text-brand-600" />
            <h2 className="font-semibold text-ink-900">Personal Details</h2>
          </div>

          <div>
            <label className="text-xs text-ink-400">Full Name</label>
            <input
              type="text"
              placeholder="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 flex items-center gap-1">
              <Calendar size={12} /> Date Of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-xs text-ink-400 flex items-center gap-1">
              <StickyNote size={12} /> Note (Profession, Or Anything Else)
            </label>
            <textarea
              placeholder="e.g. Software Developer"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingDetails}
            className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
          >
            {savingDetails ? 'Saving…' : 'Save Details'}
          </button>
          {detailsMsg && <p className="text-sm text-ink-400">{detailsMsg}</p>}
        </form>

        <div className="bg-white rounded-xl2 shadow-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-600" />
            <h2 className="font-semibold text-ink-900">Login Methods</h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-ink-50">
              <span className="flex items-center gap-2 text-sm text-ink-700">
                <Mail size={16} className="text-ink-400" />
                Email & Password
              </span>
              {hasPassword ? (
                <span className="flex items-center gap-1 text-xs font-medium text-inflow">
                  <CheckCircle2 size={14} /> Connected
                </span>
              ) : (
                <span className="text-xs text-ink-400">Not Set</span>
              )}
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-ink-50">
              <span className="flex items-center gap-2 text-sm text-ink-700">
                <Chrome size={16} className="text-ink-400" />
                Google
              </span>
              {hasGoogle ? (
                <span className="flex items-center gap-1 text-xs font-medium text-inflow">
                  <CheckCircle2 size={14} /> Connected
                </span>
              ) : (
                <span className="text-xs text-ink-400">Not Connected</span>
              )}
            </div>
          </div>

          {msg && <p className="text-sm text-inflow">{msg}</p>}
          {err && <p className="text-sm text-outflow">{err}</p>}

          {!hasGoogle && (
            <button
              onClick={linkGoogle}
              className="w-full flex items-center justify-center gap-2 border border-ink-200 rounded-lg py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <Chrome size={16} />
              Connect Google Account
            </button>
          )}

          {!hasPassword && step === 'idle' && (
            <button
              onClick={sendOtp}
              disabled={sendingOtp}
              className="w-full flex items-center justify-center gap-2 border border-ink-200 rounded-lg py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-50"
            >
              <KeyRound size={16} />
              {sendingOtp ? 'Sending Code…' : 'Add A Password (Verify Via Email OTP)'}
            </button>
          )}

          {!hasPassword && step === 'otp-sent' && (
            <form onSubmit={verifyOtpAndSetPassword} className="space-y-3 pt-2 border-t border-ink-100">
              <input
                placeholder="Code From Email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
              <input
                type="password"
                placeholder="New Password (Min 6 Characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={verifyingOtp}
                className="w-full bg-brand-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {verifyingOtp ? 'Verifying…' : 'Verify & Set Password'}
              </button>
              <div className="flex justify-between items-center pt-1 text-xs">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={sendingOtp}
                  className="text-brand-600 hover:underline font-medium disabled:opacity-50"
                >
                  {sendingOtp ? 'Resending…' : 'Resend Code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('idle');
                    setErr('');
                    setMsg('');
                    setOtp('');
                    setNewPassword('');
                  }}
                  className="text-ink-400 hover:text-ink-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Change Password — only relevant if they already have a password set */}
        {hasPassword && (
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl2 shadow-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-brand-600" />
              <h2 className="font-semibold text-ink-900">Change Password</h2>
            </div>
            <input
              type="password"
              placeholder="Current Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="New Password (Min 6 Characters)"
              value={changePassword}
              onChange={(e) => setChangePassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {changePasswordErr && <p className="text-outflow text-sm">{changePasswordErr}</p>}
            {changePasswordMsg && <p className="text-inflow text-sm">{changePasswordMsg}</p>}
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-ink-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {changingPassword ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl2 shadow-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-brand-600" />
            <h2 className="font-semibold text-ink-900">Minimum Balance To Keep</h2>
          </div>
          <p className="text-sm text-ink-400">
            Informational only — never blocks or limits your spending. Used to calculate "Available To Save" on the Goals page.
          </p>
          <form onSubmit={handleSaveMinBalance} className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 5000"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              className="flex-1 border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={savingBalance}
              className="px-5 bg-ink-900 text-white rounded-lg text-sm font-medium hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {savingBalance ? 'Saving…' : 'Save'}
            </button>
          </form>
          {balanceMsg && <p className="text-sm text-ink-400">{balanceMsg}</p>}
        </div>

        {/* Delete Account — destructive zone, visually separated */}
        <div className="bg-red-50 border border-red-200 rounded-xl2 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-outflow" />
            <h2 className="font-semibold text-outflow">Delete Account</h2>
          </div>
          <p className="text-sm text-ink-600">
            Permanently deletes your account and all data — transactions, goals, reminders, categories. This cannot be undone.
          </p>
          <input
            type="text"
            placeholder='Type "DELETE" To Confirm'
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full border border-red-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-outflow focus:border-transparent bg-white"
          />
          {deleteErr && <p className="text-outflow text-sm">{deleteErr}</p>}
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full bg-outflow text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Permanently Delete My Account'}
          </button>
        </div>

      </div>
    </div>
  );
}