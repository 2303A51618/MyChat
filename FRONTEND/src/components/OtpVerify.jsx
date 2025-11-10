import React, { useState, useRef, useEffect, useCallback } from 'react';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../Store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const OtpVerify = ({ email, onCancel }) => {
  const [values, setValues] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const navigate = useNavigate();

  // focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // helper: join values
  const joinedOtp = useCallback((vals) => vals.join(''), []);

  // auto submit when all filled
  useEffect(() => {
    const otp = joinedOtp(values);
    if (otp.length === 6 && !values.includes('') && !loading && !success) {
      // slight delay to allow visual fill before submit
      const t = setTimeout(() => handleSubmit(otp), 150);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]); // intentionally no loading/success in deps to avoid extra triggers

  const handleChange = (i, v) => {
    // accept only digits, take last char
    if (!/^[0-9]*$/.test(v)) return;
    const next = [...values];
    next[i] = v.slice(-1);
    setValues(next);

    // move to next if filled
    if (v && i < 5) {
      inputsRef.current[i + 1]?.focus();
      inputsRef.current[i + 1]?.select?.();
    }
  };

  const handleKeyDown = (i, e) => {
    const key = e.key;
    if (key === 'Backspace') {
      if (values[i] === '') {
        // move to previous if empty
        if (i > 0) {
          inputsRef.current[i - 1]?.focus();
          const prev = [...values];
          prev[i - 1] = '';
          setValues(prev);
        }
      } else {
        // clear current
        const next = [...values];
        next[i] = '';
        setValues(next);
      }
    } else if (key === 'ArrowLeft') {
      if (i > 0) inputsRef.current[i - 1]?.focus();
    } else if (key === 'ArrowRight') {
      if (i < 5) inputsRef.current[i + 1]?.focus();
    }
  };

  const handleFocus = (i) => {
    // select on focus so typing replaces
    inputsRef.current[i]?.select?.();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const chars = paste.replace(/\D/g, '').slice(0, 6).split('');
    if (chars.length === 0) return;
    const next = [...values];
    for (let idx = 0; idx < 6; idx++) next[idx] = chars[idx] || '';
    setValues(next);

    // if full paste, attempt submit (auto-submit effect will also pick it up)
    if (chars.length >= 6) {
      // small delay so UI updates then submit
      setTimeout(() => handleSubmit(chars.join('')), 100);
    }
  };

  const handleSubmit = async (otpVal) => {
    const otp = otpVal || joinedOtp(values);
    if (otp.length !== 6) return toast.error('Please enter 6-digit code');

    setLoading(true);
    try {
      await axiosInstance.post('/auth/verify-otp', { email, otp });
      setSuccess(true);
      toast.success('Verified — welcome!');
      await checkAuth();

      // keep the success animation visible briefly, then navigate
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('verify otp err', err);
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResendLoading(true);
    try {
      await axiosInstance.post('/auth/resend-otp', { email });
      toast.success('OTP resent to your email');
      // reset inputs optionally
      setValues(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err) {
      console.error('resend err', err);
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-green/40 z-50 p-4">
      {/* component-scoped styles for success animation & small tweaks */}
      <style>{`
        @keyframes success-pop {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(139,92,246,0.0)); }
          40% { transform: scale(1.06); filter: drop-shadow(0 8px 18px rgba(139,92,246,0.18)); }
          100% { transform: scale(1); filter: drop-shadow(0 12px 28px rgba(139,92,246,0.22)); }
        }
        .success-animate {
          animation: success-pop 700ms cubic-bezier(.2,.9,.3,1);
        }
      `}</style>

      {/* Card */}
      <div
        className={`bg-white max-w-md w-full rounded-2xl shadow-xl text-center p-8 relative ${
          success ? 'success-animate' : ''
        }`}
      >
        {/* Purple header circle with icon */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 w-20 h-20 rounded-full flex items-center justify-center shadow-lg">
          <div className="text-white text-3xl">✉️</div>
        </div>

        {!success ? (
          <>
            <h2 className="text-black-600 font-bold mt-10">Verify Your Email</h2>
            <p className="text-blue-600 text-sm mt-1">
              Please enter the verification code we sent to <br />
              <span className="font-semibold">{email}</span>
            </p>

            {/* OTP Boxes */}
            <div
              onPaste={handlePaste}
              className="flex justify-center gap-3 mt-6"
              aria-label="OTP inputs container"
            >
              {values.map((v, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  value={v}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={() => handleFocus(i)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className="
  w-12 h-12 text-center text-xl font-semibold
  rounded-xl border-2
  bg-purple-100 text-purple-800   /* NEW: Background + Text Color */
  border-gray-300
  transition-all duration-200
  hover:border-purple-500 hover:shadow-[0_0_8px_rgba(139,92,246,0.25)]
  focus:border-purple-600 focus:bg-white focus:text-black-700
  outline-none
"


                />
              ))}
            </div>

            {/* Confirm button */}
            <button
              onClick={() => handleSubmit()}
              disabled={loading}
              className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </button>

            {/* Resend + Cancel */}
            <div className="mt-4 flex justify-between text-sm">
              <button className="text-purple-600 underline" onClick={onCancel}>
                Cancel
              </button>
              <button
                className="text-purple-600 underline disabled:opacity-50"
                onClick={resend}
                disabled={resendLoading}
              >
                {resendLoading ? 'Resending...' : 'Resend OTP'}
              </button>
            </div>
          </>
        ) : (
          <div className="py-6">
            <div className="text-5xl">🎉</div>
            <h4 className="text-lg font-semibold mt-2">Verified!</h4>
            <p className="text-gray-600 text-sm mt-2">Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpVerify;
