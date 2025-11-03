import React, { useState, useRef, useEffect } from 'react';
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
  const checkAuth = useAuthStore((s)=>s.checkAuth);
  const navigate = useNavigate();

  useEffect(()=>{ inputsRef.current[0]?.focus(); }, []);

  const handleChange = (i, v) => {
    if (!/^[0-9]*$/.test(v)) return;
    const next = [...values];
    next[i] = v.slice(-1);
    setValues(next);
    if (v && i < 5) inputsRef.current[i+1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const chars = paste.replace(/\D/g,'').slice(0,6).split('');
    if (chars.length === 0) return;
    const next = [...values];
    for (let i=0;i<6;i++) next[i] = chars[i] || '';
    setValues(next);
    const filled = chars.length >= 6;
    if (filled) handleSubmit(next.join(''));
  };

  const handleSubmit = async (otpVal) => {
    const otp = otpVal || values.join('');
    if (otp.length !== 6) return toast.error('Please enter 6-digit code');
    setLoading(true);
    try {
      await axiosInstance.post('/auth/verify-otp', { email, otp });
      setSuccess(true);
      toast.success('Verified — welcome!');
      // refresh auth state and redirect
      await checkAuth();
      setTimeout(()=>{
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('verify otp err', err);
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    setResendLoading(true);
    try {
      await axiosInstance.post('/auth/resend-otp', { email });
      toast.success('OTP resent to your email');
    } catch (err) {
      console.error('resend err', err);
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally { setResendLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-60 w-full max-w-md bg-white rounded shadow-lg p-6">
        {!success ? (
          <>
            <h3 className="text-lg font-semibold mb-2">Verify your email</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the 6-digit code sent to <strong>{email}</strong></p>

            <div onPaste={handlePaste} className="flex gap-2 justify-center mb-4">
              {values.map((v,i)=> (
                <input key={i} ref={el=>inputsRef.current[i]=el} value={v} onChange={(e)=>handleChange(i,e.target.value)} maxLength={1} className="w-12 h-12 text-center input input-bordered" />
              ))}
            </div>

            <div className="flex gap-2 justify-between items-center">
              <button onClick={()=>handleSubmit()} className="btn btn-primary" disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</button>
              <div className="text-sm">
                <button className="link link-primary" onClick={resend} disabled={resendLoading}>{resendLoading ? '...' : 'Resend'}</button>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button className="btn" onClick={onCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-5xl">🎉</div>
            <h4 className="text-lg font-semibold mt-2">Verified!</h4>
            <p className="text-sm text-gray-600 mt-2">Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpVerify;
