'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'mr-pocket-onboarding-complete';

const STEPS = [
  {
    target: '[data-tour="balance"]',
    title: 'Your money at a glance',
    text: 'This is your current net balance across all recorded inflow and outflow.',
  },
  {
    target: '[data-tour="period"]',
    title: 'Choose a time window',
    text: 'Switch between weeks, months, and custom periods to understand your spending patterns.',
  },
  {
    target: '[data-tour="transactions"]',
    title: 'Record everyday money',
    text: 'Add income and expenses here. Keeping this up to date makes every summary more useful.',
  },
  {
    target: '[data-tour="goals"]',
    title: 'Make room for goals',
    text: 'Set savings targets and track your progress alongside your regular finances.',
  },
  {
    target: '[data-tour="groups"]',
    title: 'Split shared expenses',
    text: 'Use Splits to manage group expenses, balances, and settlements with other members.',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Make it yours',
    text: 'Update your profile and preferences whenever you need to.',
  },
];

function finishTour(setOpen, completeKey) {
  if (completeKey) window.localStorage.setItem(completeKey, 'true');
  setOpen(false);
}

export default function OnboardingTour({ canOpen = false }) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const [completeKey, setCompleteKey] = useState(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function checkMember() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;

      const completeKey = `${STORAGE_KEY}:${user.id}`;
      if (!window.localStorage.getItem(completeKey)) {
        setCompleteKey(completeKey);
        setOpen(true);
      }
    }

    checkMember();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const target = [...document.querySelectorAll(STEPS[stepIndex].target)].find(
        (element) => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
      );
      if (!target) {
        setPosition(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, stepIndex]);

  if (!open || !canOpen) return null;

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="absolute inset-0 bg-ink-950/55" />
      {position && (
        <div
          className="absolute rounded-xl2 ring-4 ring-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] transition-all duration-300"
          style={position}
        />
      )}
      <div className="absolute left-1/2 top-1/2 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl2 bg-white p-6 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Welcome to Mr Pocket
          </p>
          <button
            type="button"
            onClick={() => finishTour(setOpen, completeKey)}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
            aria-label="Close tour"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium text-ink-400">{stepIndex + 1} of {STEPS.length}</p>
          <h2 id="tour-title" className="text-xl font-bold text-ink-900">{step.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">{step.text}</p>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50 disabled:invisible"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            type="button"
            onClick={() => (isLastStep ? finishTour(setOpen, completeKey) : setStepIndex((current) => current + 1))}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {isLastStep ? <><Check size={16} /> Done</> : <>Next <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}