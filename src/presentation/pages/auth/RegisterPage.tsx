import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import './auth.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    university: '',
    program: '',
    semester: 'Semester 1',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Create profile entry if registration successful
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: formData.fullName,
            university_info: `${formData.university} - ${formData.program} (${formData.semester})`
          }
        ]);

      if (profileError) {
        // Technically they registered but profile failed, we should still handle it
        console.error("Profile creation error:", profileError);
      }
      
      // Usually requires email confirmation, but we'll try to navigate or show message
      alert("Registration successful! Please sign in.");
      navigate('/login');
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
            <form className="form v-reg" onSubmit={handleRegister}>
              <h1>Create account</h1>
              <p className="lead">Set up your student profile.</p>
              
              {error && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div className="f">
                <label>Full name</label>
                <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Asif Khan" autoComplete="name" required />
              </div>
              <div className="f">
                <label>Email</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="name@example.com" autoComplete="email" required />
              </div>
              <div className="f">
                <label>University</label>
                <input name="university" value={formData.university} onChange={handleChange} placeholder="University name" required />
              </div>
              <div className="two">
                <div className="f">
                  <label>Program</label>
                  <input name="program" value={formData.program} onChange={handleChange} placeholder="BS Computer Science" required />
                </div>
                <div className="f">
                  <label>Semester</label>
                  <select name="semester" value={formData.semester} onChange={handleChange}>
                    <option>Semester 1</option>
                    <option>Semester 2</option>
                    <option>Semester 3</option>
                    <option>Semester 4</option>
                    <option>Semester 5</option>
                    <option>Semester 6</option>
                    <option>Semester 7</option>
                    <option>Semester 8</option>
                  </select>
                </div>
              </div>
              <div className="f">
                <label>Password</label>
                <div className="pw">
                  <input name="password" value={formData.password} onChange={handleChange} type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="f">
                <label>Confirm password</label>
                <input name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} type="password" placeholder="Re-enter password" required />
              </div>
              <button className="go" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <p className="alt">Already registered? <Link to="/login">Sign in</Link></p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
