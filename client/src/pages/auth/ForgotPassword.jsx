import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import api from '../../utils/api';

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', values);
      setSent(true);
      setDevResetUrl(res.data.devResetUrl || null);
    } catch {
      // The endpoint never reveals whether the email exists, so there's
      // nothing meaningful to show on error beyond the generic state below.
      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="If an account exists for that email, we've sent a reset link.">
        {devResetUrl && (
          <div className="mb-4 rounded-lg border border-dashed border-electric/40 bg-electric/5 p-3 text-xs text-slate-300">
            <p className="font-semibold text-electric">Development mode — no SMTP configured</p>
            <p className="mt-1">
              Use this link directly:{' '}
              {/* Plain anchor, not a router Link — the server builds this from
                  CLIENT_URL, which may not match this tab's actual origin
                  (e.g. Vite fell back to a different port). */}
              <a href={devResetUrl} className="break-all text-electric hover:text-electric-light">
                {devResetUrl}
              </a>
            </p>
          </div>
        )}
        <Link to="/login" className="text-sm font-medium text-electric hover:text-electric-light">
          Back to log in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <Button type="submit" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-electric hover:text-electric-light">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
