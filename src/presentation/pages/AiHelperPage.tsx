import React, { useState, useRef } from 'react';
import './other-pages.css';
import { Send, Plus, FileText, Link as LinkIcon, Type, X } from 'lucide-react';
import { openRouterService } from '../../business/services/openRouterService';
import { MarkdownText } from '../components/MarkdownText';

export const AiHelperPage: React.FC = () => {
  const [mode, setMode] = useState<'ask' | 'quiz'>('ask');
  
  // Source State
  const [sourceType, setSourceType] = useState<'text' | 'pdf' | 'link' | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Ask Mode State
  const [chat, setChat] = useState<{role: 'u'|'a', text: string}[]>([]);
  const [askQuery, setAskQuery] = useState('');
  const [asking, setAsking] = useState(false);

  // Quiz Mode State
  const [numQs, setNumQs] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [qType, setQType] = useState('MCQ');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quiz, setQuiz] = useState<{q: string, opts: string[], a: string, showAns?: boolean}[] | null>(null);
  const [quizType, setQuizType] = useState('MCQ'); // type the current quiz was generated with
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<boolean[] | null>(null); // null = not submitted yet
  const [grading, setGrading] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState<{show: boolean, count: number}>({show: false, count: 0});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSourceFile(e.target.files[0]);
      setSourceType('pdf');
      setShowAddMenu(false);
    }
  };

  const handleTextSubmit = () => {
    if (sourceText.trim()) setSourceType('text');
    setShowTextInput(false);
  };

  const handleLinkSubmit = () => {
    if (sourceText.trim()) setSourceType('link');
    setShowLinkInput(false);
  };

  const clearSource = () => {
    setSourceType(null);
    setSourceText('');
    setSourceFile(null);
  };

  const handleAsk = async () => {
    if (!askQuery.trim()) return;
    const q = askQuery;
    setAskQuery('');
    setChat(prev => [...prev, { role: 'u', text: q }]);
    
    // Auto-scroll
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    
    try {
      setAsking(true);
      const st = sourceType || 'text'; // default text if null
      const ans = await openRouterService.askQuestion(chat, q, st, sourceText, sourceFile);
      setChat(prev => [...prev, { role: 'a', text: ans }]);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || 'Failed to get answer.';
      setChat(prev => [...prev, { role: 'a', text: `Error: ${errMsg}` }]);
    } finally {
      setAsking(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!sourceType) return alert("Please add a source (Text, Link, or PDF) first!");
    
    try {
      setGeneratingQuiz(true);
      setQuiz(null);
      setResults(null);
      const generated = await openRouterService.generateQuiz(numQs, difficulty, qType, sourceType, sourceText, sourceFile);
      setQuiz(generated.map((item: any) => ({ ...item, opts: Array.isArray(item.opts) ? item.opts : [], a: String(item.a ?? '') })));
      setAnswers(generated.map(() => ''));
      setQuizType(qType);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.message || 'Unknown error';
      alert(`Failed to generate quiz:\n${errMsg}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const setAnswer = (index: number, value: string) => {
    if (results) return; // locked after submit
    setAnswers(prev => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleSubmitQuiz = async (force: boolean = false) => {
    if (!quiz) return;
    const unanswered = answers.filter(a => !a.trim()).length;
    
    if (unanswered > 0 && !force) {
      setConfirmSubmit({show: true, count: unanswered});
      return;
    }
    
    setConfirmSubmit({show: false, count: 0});

    try {
      setGrading(true);
      if (quizType === 'Short answer') {
        setResults(await openRouterService.gradeShortAnswers(quiz.map((q, i) => ({ q: q.q, a: q.a, user: answers[i] }))));
      } else {
        // MCQ and fill-in-the-blank: compare normalized text
        setResults(quiz.map((q, i) => !!answers[i].trim() && norm(answers[i]) === norm(q.a)));
      }
    } catch (e: any) {
      alert(`Failed to grade quiz:\n${e.message || 'Unknown error'}`);
    } finally {
      setGrading(false);
    }
  };

  const retryQuiz = () => {
    if (!quiz) return;
    setAnswers(quiz.map(() => ''));
    setResults(null);
  };

  const score = results ? results.filter(Boolean).length : 0;

  const renderSourcePill = () => {
    if (!sourceType) return null;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--tint)', padding: '6px 12px', borderRadius: 20, fontSize: 13, color: 'var(--blue)', marginBottom: 10, fontWeight: 500 }}>
        {sourceType === 'pdf' && <FileText style={{ width: 14, height: 14, marginRight: 6 }} />}
        {sourceType === 'link' && <LinkIcon style={{ width: 14, height: 14, marginRight: 6 }} />}
        {sourceType === 'text' && <Type style={{ width: 14, height: 14, marginRight: 6 }} />}
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sourceType === 'pdf' ? sourceFile?.name : sourceType === 'link' ? sourceText : 'Pasted Text'}
        </span>
        <button onClick={clearSource} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6, display: 'flex', color: 'var(--blue)' }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="hdr">
        <h2>AI Helper</h2>
        <div className="r">
          <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--okc)' }} />
            Gemini AI Connected
          </div>
        </div>
      </div>
      
      <div className="content">
        <div className="cw">
          <div className="pg">
            
            <div className="seg" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 340, marginBottom: 20 }}>
              <span className={mode === 'ask' ? 'on' : ''} onClick={() => setMode('ask')}>Ask & Explain</span>
              <span className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>Quiz Generator</span>
            </div>

            {mode === 'ask' ? (
              <div className="card cp" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', height: 'calc(100vh - 280px)' }}>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10, display: 'flex', flexDirection: 'column' }}>
                  {chat.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)' }}>
                      <h3 style={{ marginBottom: 8, color: 'var(--ink)' }}>How can I help you study today?</h3>
                      <p style={{ fontSize: 14, maxWidth: 400 }}>Click the + button to add a file, link, or text. Then ask me to explain concepts, summarize notes, or define terms!</p>
                    </div>
                  ) : (
                    chat.map((msg, i) => (
                      <div key={i} className={`bub ${msg.role}`} style={{ whiteSpace: msg.role === 'u' ? 'pre-wrap' : 'normal', alignSelf: msg.role === 'u' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        {msg.role === 'a' ? <MarkdownText text={msg.text} /> : msg.text}
                      </div>
                    ))
                  )}
                  {asking && <div className="bub a" style={{ alignSelf: 'flex-start' }}>Thinking...</div>}
                  <div ref={chatEndRef} />
                </div>
                
                <div style={{ marginTop: 20, position: 'relative' }}>
                  {renderSourcePill()}
                  
                  {/* Plus Menu Popup */}
                  {showAddMenu && (
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 10, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4, width: 200 }}>
                      <button className="btn ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { setShowTextInput(true); setShowAddMenu(false); }}>
                        <Type className="i" style={{ marginRight: 8 }} /> Paste Text
                      </button>
                      <button className="btn ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { setShowLinkInput(true); setShowAddMenu(false); }}>
                        <LinkIcon className="i" style={{ marginRight: 8 }} /> Add Link
                      </button>
                      <button className="btn ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { fileInputRef.current?.click(); }}>
                        <FileText className="i" style={{ marginRight: 8 }} /> Upload PDF
                      </button>
                    </div>
                  )}

                  {/* Input Overlays */}
                  {showTextInput && (
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 10, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <b style={{ fontSize: 13 }}>Paste Text Source</b>
                        <button className="btn sm ghost" onClick={() => setShowTextInput(false)}><X className="i" style={{ width: 14, height: 14 }}/></button>
                      </div>
                      <textarea className="in" style={{ width: '100%', height: 120, resize: 'none' }} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="Paste notes here..." />
                      <button className="btn pri sm" style={{ marginTop: 8 }} onClick={handleTextSubmit}>Save Text</button>
                    </div>
                  )}

                  {showLinkInput && (
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 10, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                        <b style={{ fontSize: 13 }}>Add Link Source</b>
                        <button className="btn sm ghost" onClick={() => setShowLinkInput(false)}><X className="i" style={{ width: 14, height: 14 }}/></button>
                      </div>
                      <input className="in" style={{ width: '100%' }} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="https://..." />
                      <button className="btn pri sm" style={{ marginTop: 8 }} onClick={handleLinkSubmit}>Save Link</button>
                    </div>
                  )}

                  <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

                  <div className="g" style={{ gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center', background: 'var(--wb)', border: '1px solid var(--line)', borderRadius: 24, padding: '6px 6px 6px 12px' }}>
                    <button className="btn ghost" style={{ padding: 6, borderRadius: '50%', color: 'var(--muted)' }} onClick={() => setShowAddMenu(!showAddMenu)}>
                      <Plus style={{ width: 20, height: 20 }} />
                    </button>
                    <input 
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--ink)', width: '100%' }}
                      placeholder="Ask a question..." 
                      value={askQuery}
                      onChange={e => setAskQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAsk()}
                      disabled={asking}
                    />
                    <button className="btn pri" style={{ padding: 8, borderRadius: '50%' }} onClick={handleAsk} disabled={asking || !askQuery.trim()}>
                      <Send style={{ width: 16, height: 16, transform: 'translateX(-1px)' }} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card cp">
                <h3>Generate a Quiz</h3>
                
                <div style={{ marginBottom: 20, position: 'relative' }}>
                  {renderSourcePill()}
                  {!sourceType && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <button className="btn" onClick={() => setShowTextInput(true)}>
                        <Type className="i" style={{ marginRight: 6 }} /> Paste Text
                      </button>
                      <button className="btn" onClick={() => setShowLinkInput(true)}>
                        <LinkIcon className="i" style={{ marginRight: 6 }} /> Add Link
                      </button>
                      <button className="btn" onClick={() => fileInputRef.current?.click()}>
                        <FileText className="i" style={{ marginRight: 6 }} /> Upload PDF
                      </button>
                    </div>
                  )}
                  
                  {/* Modals for Text/Link same as ask mode */}
                  {showTextInput && (
                    <div style={{ marginTop: 10, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                      <textarea className="in" style={{ width: '100%', height: 120, resize: 'none' }} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="Paste notes here..." />
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="btn pri sm" onClick={handleTextSubmit}>Save Text</button>
                        <button className="btn sm ghost" onClick={() => setShowTextInput(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {showLinkInput && (
                    <div style={{ marginTop: 10, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                      <input className="in" style={{ width: '100%' }} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="https://..." />
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button className="btn pri sm" onClick={handleLinkSubmit}>Save Link</button>
                        <button className="btn sm ghost" onClick={() => setShowLinkInput(false)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  <input type="file" accept="application/pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                </div>

                <div className="g c3" style={{ gap: 10, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Questions</label>
                    <select className="in" style={{ width: '100%' }} value={numQs} onChange={e => setNumQs(Number(e.target.value))}>
                      <option value="5">5 questions</option>
                      <option value="10">10 questions</option>
                      <option value="15">15 questions</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Difficulty</label>
                    <select className="in" style={{ width: '100%' }} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>Type</label>
                    <select className="in" style={{ width: '100%' }} value={qType} onChange={e => setQType(e.target.value)}>
                      <option value="MCQ">MCQ</option>
                      <option value="Fill in the blanks">Fill in the blank</option>
                      <option value="Short answer">Short answer</option>
                    </select>
                  </div>
                </div>

                {!generatingQuiz ? (
                  <button 
                    className="btn pri" 
                    style={{ width: '100%', padding: '12px' }} 
                    onClick={handleGenerateQuiz}
                    disabled={!sourceType}
                  >
                    Generate AI Quiz
                  </button>
                ) : (
                  <div className="study-loader-container">
                    <img src="/study-loader.jpg" alt="Loading" className="study-loader-img" />
                    <div className="study-loader-text">AI is reading your materials and crafting the quiz...</div>
                  </div>
                )}
                
                {quiz && (
                  <div className="g" style={{ gap: 16, marginTop: 24 }}>
                    <h3 style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>Your Quiz</h3>

                    {results && (
                      <div style={{ padding: 16, borderRadius: 12, textAlign: 'center', background: score / quiz.length >= 0.5 ? 'var(--okb)' : 'var(--tint)', border: `1px solid ${score / quiz.length >= 0.5 ? 'var(--okc)' : 'var(--line)'}` }}>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Your Score</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>{score} / {quiz.length}</div>
                        <div style={{ fontSize: 14, color: 'var(--muted)' }}>{Math.round((score / quiz.length) * 100)}% correct</div>
                      </div>
                    )}

                    {quiz.map((q, i) => {
                      const ok = results?.[i];
                      return (
                      <div key={i} className="card pad" style={{ border: `1px solid ${results ? (ok ? 'var(--okc)' : 'var(--rc)') : 'var(--line)'}`, background: 'var(--bg)' }}>
                        <div className="sw">
                          <span className="sub" style={{ color: 'var(--ink)' }}><b>Question {i + 1}</b></span>
                          {results && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--okc)' : 'var(--rc)' }}>{ok ? '✓ Correct' : '✗ Incorrect'}</span>
                          )}
                        </div>
                        <div className="t" style={{ fontSize: 15, marginBottom: 12, marginTop: 6 }}><MarkdownText text={q.q} /></div>
                        
                        {quizType === 'MCQ' && q.opts.length > 0 ? (
                          <div className="g" style={{ gap: 6, marginBottom: 12 }}>
                            {q.opts.map((o, oi) => {
                              const selected = answers[i] === o;
                              const isCorrect = norm(o) === norm(q.a);
                              let bg = selected ? 'var(--tint)' : 'transparent';
                              let border = selected ? 'var(--blue)' : 'var(--field)';
                              if (results && isCorrect) { bg = 'var(--okb)'; border = 'var(--okc)'; }
                              else if (results && selected) { bg = 'transparent'; border = 'var(--rc)'; }
                              return (
                                <div key={oi} className="opt" onClick={() => setAnswer(i, o)} style={{ 
                                  background: bg, border: `1.5px solid ${border}`,
                                  padding: '8px 12px', borderRadius: 8, fontSize: 14,
                                  cursor: results ? 'default' : 'pointer', fontWeight: selected ? 600 : 400,
                                  transition: 'all .15s'
                                }}>
                                  {String.fromCharCode(65 + oi)}. {o}
                                </div>
                              );
                            })}
                          </div>
                        ) : quizType === 'Short answer' ? (
                          <textarea className="in" style={{ width: '100%', minHeight: 70, resize: 'vertical', marginBottom: 12 }}
                            placeholder="Type your answer..." value={answers[i] ?? ''} disabled={!!results}
                            onChange={e => setAnswer(i, e.target.value)} />
                        ) : (
                          <input className="in" style={{ width: '100%', marginBottom: 12 }}
                            placeholder="Fill in the blank..." value={answers[i] ?? ''} disabled={!!results}
                            onChange={e => setAnswer(i, e.target.value)} />
                        )}

                        {results && !ok && (
                          <div style={{ marginTop: 4, padding: 12, background: 'var(--tint)', borderRadius: 8, fontSize: 14, color: 'var(--blue)' }}>
                            {quizType !== 'MCQ' && <div style={{ marginBottom: 4, color: 'var(--muted)' }}><b>Your answer:</b> {answers[i] || '(blank)'}</div>}
                            <b>Correct Answer:</b> {q.a}
                          </div>
                        )}
                      </div>
                    );})}

                    {!results ? (
                      grading ? (
                        <div className="study-loader-container">
                          <img src="/study-loader.jpg" alt="Grading" className="study-loader-img" style={{ width: 80, height: 80 }} />
                          <div className="study-loader-text">Grading your answers...</div>
                        </div>
                      ) : (
                        <button className="btn pri" style={{ width: '100%', padding: 12 }} onClick={() => handleSubmitQuiz(false)}>
                          Submit Quiz
                        </button>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn" style={{ flex: 1, padding: 12 }} onClick={retryQuiz}>Retry Quiz</button>
                        <button className="btn pri" style={{ flex: 1, padding: 12 }} onClick={handleGenerateQuiz} disabled={generatingQuiz}>
                          {generatingQuiz ? 'Generating...' : 'New Quiz'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmSubmit.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <div className="card pad" style={{ width: '100%', maxWidth: 400, background: 'var(--bg)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', border: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 16 }}>Unanswered Questions</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
              You left {confirmSubmit.count} question(s) unanswered. Are you sure you want to submit anyway?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmSubmit({show: false, count: 0})}>Cancel</button>
              <button className="btn pri" style={{ background: 'var(--rc)', borderColor: 'var(--rc)' }} onClick={() => handleSubmitQuiz(true)}>Submit Anyway</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
