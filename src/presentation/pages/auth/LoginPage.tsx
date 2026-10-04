import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './auth.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const [resetMode, setResetMode] = useState(false);
    const [updateMode, setUpdateMode] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
      // Check if user arrived via a password reset link
      if (window.location.hash.includes('type=recovery')) {
        setUpdateMode(true);
      }
      
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setUpdateMode(true);
        }
      });
      return () => { authListener.subscription.unsubscribe(); };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (updateMode) {
        if (!password) return;
        setLoading(true);
        setError(null);
        setMsg('');
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
          setError(updateErr.message);
        } else {
          setMsg('Password successfully updated! You can now use your new password.');
          setUpdateMode(false);
          setResetMode(false);
          setPassword('');
        }
        setLoading(false);
        return;
      }

      if (!email) return;

      if (resetMode) {
        setLoading(true);
        setError(null);
        setMsg('');
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email);
        if (resetErr) {
          setError(resetErr.message);
        } else {
          setMsg('A password reset link has been sent to your email.');
        }
        setLoading(false);
        return;
      }

      if (!password) return;
      setLoading(true);
      setError(null);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else if (data.session) {
        navigate('/tasks');
      }
    };

    return (
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', alignItems: 'center', padding: 20 }}>
        <div className="desk-auth">
          <div className="brand">
            <div className="logo">
              <svg viewBox="0 0 40 40" style={{ width: 40, height: 40 }}>
                <rect width="40" height="40" rx="10" fill="#fff" />
                <path d="M20 9l12 6-12 6-12-6z" fill="#1e4fd8" />
                <path d="M13 19v5c0 2 3.2 4 7 4s7-2 7-4v-5l-7 3.5z" fill="#0f2a5c" />
                <path d="M32 15v8" stroke="#1e4fd8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div>
                <b>SLS</b>
                <small>Student Learning System</small>
              </div>
            </div>
            <h2>Your classes, tasks and progress in one place.</h2>
            <ul>
              <li>Track attendance and see how many classes you can miss</li>
              <li>Plan deadlines, schedule and focus time together</li>
              <li>Record marks and follow your progress by subject</li>
            </ul>
          </div>
          <div className="formside">
            <div className="panel">
              <form className="form v-log" onSubmit={handleLogin}>
                <h1>{updateMode ? 'Set New Password' : (resetMode ? 'Reset Password' : 'Sign in')}</h1>
                <p className="lead">{updateMode ? 'Please enter a new password.' : (resetMode ? 'Enter your email to receive a reset link.' : 'Use your email and password to continue.')}</p>
                
                {error && (
                  <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 500 }}>
                    {error}
                  </div>
                )}
                {msg && (
                  <div style={{ background: 'var(--okb)', color: 'var(--okc)', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 500 }}>
                    {msg}
                  </div>
                )}

                {!updateMode && (
                  <div className="f">
                    <label>Email</label>
                    <input 
                      type="email" 
                      placeholder="name@university.edu" 
                      autoComplete="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {(!resetMode || updateMode) && (
                  <>
                    <div className="f">
                      <label>Password</label>
                      <div className="pw">
                        <input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="Enter your password" 
                          autoComplete="current-password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    {!updateMode && (
                      <div className="row">
                        <label className="chk">
                          <input type="checkbox" defaultChecked /> Remember me
                        </label>
                        <a href="#" onClick={(e) => { e.preventDefault(); setResetMode(true); setError(null); setMsg(''); }}>Forgot password?</a>
                      </div>
                    )}
                  </>
                )}
                
                <button className="go" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Please wait...' : (updateMode ? 'Update Password' : (resetMode ? 'Send Reset Link' : 'Sign in'))}
                </button>
                
                {!updateMode && (
                  resetMode ? (
                    <p className="alt"><a href="#" onClick={(e) => { e.preventDefault(); setResetMode(false); setError(null); setMsg(''); }}>Back to Sign in</a></p>
                  ) : (
                    <p className="alt">New to SLS? <Link to="/register">Create an account</Link></p>
                  )
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
  );
};
