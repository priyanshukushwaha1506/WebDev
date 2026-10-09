import { useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, Bell, BookOpen, Brain, Check, ChevronDown,
  CircleHelp, Clock3, Code2, Compass, Cpu, Flame, GraduationCap, Layers3,
  Leaf, LogOut, Menu, MoreHorizontal, Pause, Play, Plus, Search, Settings2, Sparkles,
  Timer, Users, X,
} from 'lucide-react';

const paths = [
  {
    id: 'mern', name: 'MERN stack', short: 'MERN', description: 'Build full-stack apps from first component to production.',
    category: 'Full-stack', icon: Layers3, color: 'mint', duration: '12 weeks', lessons: 36,
    topics: ['JavaScript foundations', 'React & component thinking', 'State and hooks', 'Node.js & Express', 'MongoDB data modeling', 'Authentication & deployment'],
    topicDetails: ['Variables, functions, arrays, objects, and modern syntax', 'Reusable components, JSX, props, and composition', 'State, effects, forms, and client-side routing', 'Build REST endpoints and middleware with Express', 'Design collections, queries, and relationships in MongoDB', 'Secure login flows, environment variables, and deployment'],
    subtopics: [
      ['Values, variables & scope', 'Functions, closures & callbacks', 'Arrays, objects & modern syntax'],
      ['JSX and rendering', 'Props and component composition', 'Lists, keys and reusable UI'],
      ['State with useState', 'Effects and lifecycle thinking', 'Forms, validation and routing'],
      ['Node runtime and event loop', 'Express routes and middleware', 'REST errors and API structure'],
      ['Documents and schema design', 'CRUD queries and indexes', 'Relations and aggregation'],
      ['Password hashing and sessions', 'Authorization and security basics', 'Environment config and deployment'],
    ],
  },
  {
    id: 'java', name: 'Java development', short: 'JAVA', description: 'From object-oriented fundamentals to reliable backend systems.',
    category: 'Development', icon: Code2, color: 'coral', duration: '10 weeks', lessons: 32,
    topics: ['Java syntax & types', 'Object-oriented programming', 'Collections framework', 'Exceptions & testing', 'Spring Boot essentials', 'REST APIs & persistence'],
    topicDetails: ['Primitive types, control flow, methods, and packages', 'Classes, interfaces, inheritance, and encapsulation', 'Lists, maps, sets, generics, and iteration', 'Error handling, JUnit, and readable test design', 'Dependency injection, configuration, and application structure', 'HTTP endpoints, validation, and relational persistence'],
    subtopics: [
      ['Primitive and reference types', 'Operators and control flow', 'Methods, packages and access'],
      ['Classes and object lifecycle', 'Encapsulation and inheritance', 'Interfaces and polymorphism'],
      ['Lists, sets and maps', 'Generics and type safety', 'Iterators and collection trade-offs'],
      ['Exceptions and custom errors', 'JUnit tests and assertions', 'Readable test design'],
      ['Dependency injection', 'Controllers and configuration', 'Services and application structure'],
      ['REST endpoints and HTTP', 'Validation and error responses', 'JPA and relational persistence'],
    ],
  },
  {
    id: 'data', name: 'Data science', short: 'DATA', description: 'Turn raw data into clear insights and confident decisions.',
    category: 'Data', icon: Compass, color: 'blue', duration: '14 weeks', lessons: 40,
    topics: ['Python for analysis', 'NumPy & Pandas', 'Data cleaning', 'Exploratory analysis', 'Statistics & probability', 'Visualization with Python'],
    topicDetails: ['Notebooks, Python syntax, and working with datasets', 'Arrays, Series, DataFrames, and vectorized operations', 'Missing values, duplicates, types, and outlier handling', 'Ask useful questions and find patterns in a dataset', 'Distributions, sampling, uncertainty, and useful tests', 'Choose charts that make comparisons and trends clear'],
    subtopics: [
      ['Python syntax and notebooks', 'Functions, modules and environments', 'Read CSV and JSON datasets'],
      ['NumPy arrays and vectorization', 'Pandas Series and DataFrames', 'Filtering, grouping and joins'],
      ['Missing values and duplicates', 'Types, parsing and validation', 'Outliers and reproducible pipelines'],
      ['Ask testable data questions', 'Summaries and group comparisons', 'Find patterns without overclaiming'],
      ['Distributions and sampling', 'Confidence intervals and tests', 'Correlation and statistical limits'],
      ['Choose a chart for a question', 'Labels, scales and accessibility', 'Build a clear analysis narrative'],
    ],
  },
  {
    id: 'aiml', name: 'AI & machine learning', short: 'AI / ML', description: 'Understand the models behind intelligent products.',
    category: 'Artificial intelligence', icon: Brain, color: 'yellow', duration: '16 weeks', lessons: 44,
    topics: ['Linear algebra essentials', 'Supervised learning', 'Model evaluation', 'Neural networks', 'NLP foundations', 'Responsible AI'],
    topicDetails: ['Vectors, matrices, dot products, and intuition for dimensions', 'Regression, classification, features, and training data', 'Train-test splits, metrics, overfitting, and validation', 'Layers, activations, gradient descent, and backpropagation', 'Tokenization, embeddings, and language-model basics', 'Bias, privacy, safety, and human-centered deployment'],
    subtopics: [
      ['Vectors and vector operations', 'Matrices and transformations', 'Dot products and dimensions'],
      ['Regression and loss functions', 'Classification and decision boundaries', 'Features, labels and training data'],
      ['Train, validation and test splits', 'Metrics for different problems', 'Overfitting and cross-validation'],
      ['Neurons, layers and activations', 'Gradient descent intuition', 'Backpropagation and training loops'],
      ['Text cleaning and tokenization', 'Embeddings and semantic meaning', 'Language models and prompting'],
      ['Bias and representative data', 'Privacy, safety and evaluation', 'Human oversight and deployment'],
    ],
  },
  {
    id: 'core', name: 'Core CS concepts', short: 'CORE CS', description: 'Get fluent in the ideas that make great engineers.',
    category: 'Computer science', icon: Cpu, color: 'lavender', duration: '8 weeks', lessons: 28,
    topics: ['Data structures', 'Algorithms & complexity', 'Operating systems', 'Computer networks', 'Database systems', 'System design basics'],
    topicDetails: ['Arrays, linked lists, stacks, queues, trees, and hash maps', 'Big-O, searching, sorting, recursion, and trade-offs', 'Processes, threads, memory, files, and scheduling', 'HTTP, DNS, TCP/IP, routing, and network basics', 'Relational modeling, SQL, indexes, and transactions', 'Scale, caching, queues, and dependable service boundaries'],
    subtopics: [
      ['Arrays and dynamic arrays', 'Linked lists, stacks and queues', 'Hash maps, trees and graphs'],
      ['Big-O time and space', 'Searching and sorting', 'Recursion and algorithm trade-offs'],
      ['Processes and threads', 'Memory, virtual memory and files', 'Scheduling and synchronization'],
      ['TCP/IP and network layers', 'DNS, routing and HTTP', 'Latency, reliability and security'],
      ['Relational models and SQL', 'Indexes and query planning', 'Transactions and consistency'],
      ['Service boundaries and APIs', 'Caching, queues and scaling', 'Reliability and system trade-offs'],
    ],
  },
];

const leafTopicId = (pathId, moduleIndex, topicIndex) => `${pathId}.${moduleIndex}.${topicIndex}`;
const getProgressTotal = (path) => path.subtopics.reduce((sum, topicList) => sum + topicList.length, 0);
const getPathProgress = (path, completedTopicIds) => Math.round((path.subtopics.reduce((sum, topicList, moduleIndex) => sum + topicList.filter((_, topicIndex) => completedTopicIds.includes(leafTopicId(path.id, moduleIndex, topicIndex))).length, 0) / getProgressTotal(path)) * 100);

function App() {
  const [activeView, setActiveView] = useState('home');
  const [selectedPathId, setSelectedPathId] = useState('mern');
  const [appData, setAppData] = useState(null);
  const [apiError, setApiError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ displayName: '', username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [timer, setTimer] = useState(null);
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const [expandedModule, setExpandedModule] = useState(null);
  const [pathSaving, setPathSaving] = useState(false);
  const [pathError, setPathError] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [friendMessage, setFriendMessage] = useState('');
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const customPaths = (appData?.customPaths ?? []).map((path) => ({
    id: path.id,
    name: path.title,
    short: path.category,
    description: path.description,
    category: path.category,
    duration: path.duration,
    color: path.color,
    icon: Layers3,
    topics: path.sections.map((section) => section.title),
    topicDetails: path.sections.map((section) => section.description),
    subtopics: path.sections.map((section) => section.lessons.map((lesson) => lesson.title)),
    subtopicDetails: path.sections.map((section) => section.lessons.map((lesson) => lesson.description)),
    isCustom: true,
    ownerUsername: path.ownerUsername,
  }));
  const allPaths = [...paths, ...customPaths];
  const selectedPath = allPaths.find((path) => path.id === selectedPathId) ?? paths[0];
  const completedTopicIds = appData?.topicIds ?? [];
  const friends = appData?.friends ?? [];
  const activity = appData?.activity ?? [];
  const friendProgress = appData?.friendProgress ?? [];
  const todayCount = appData?.todayCount ?? 0;
  const totalCompleted = completedTopicIds.length;
  const Icon = selectedPath.icon;

  const refreshData = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) throw new Error('The learning database could not be reached.');
      const session = await response.json();
      if (!session.authenticated) {
        setAppData(null);
        setTimer(null);
        setApiError('');
        setAuthLoading(false);
        return;
      }
      setAppData(session.data);
      if (!appData) {
        const savedTimer = session.data.timer;
        setTimer(savedTimer);
        if (savedTimer) {
          setSelectedPathId(savedTimer.pathId);
          setExpandedModule(Number(savedTimer.topicId.split('.')[1]));
          setActiveView('path');
        }
      }
      setApiError('');
    } catch (error) {
      setApiError(error.message || 'The learning database could not be reached.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  useEffect(() => {
    if (!timer?.isRunning) return undefined;
    const interval = window.setInterval(() => setTimer((current) => current ? { ...current, seconds: current.seconds + 1 } : current), 1000);
    return () => window.clearInterval(interval);
  }, [timer?.isRunning]);

  const recordActivity = async (event, refresh = true) => {
    const response = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Activity could not be saved.');
    }
    if (refresh) await refreshData();
  };

  useEffect(() => {
    if (!timer?.isRunning) return undefined;
    const checkpoint = () => {
      const current = timerRef.current;
      if (!current?.isRunning) return;
      recordActivity({
        pathId: current.pathId,
        topicId: current.topicId,
        topicTitle: current.topicTitle,
        eventType: 'timer_checkpoint',
        durationSeconds: current.seconds,
      }, false).catch(() => {});
    };
    const saveBeforeLeaving = () => {
      const current = timerRef.current;
      if (!current?.isRunning) return;
      const payload = JSON.stringify({
        pathId: current.pathId,
        topicId: current.topicId,
        topicTitle: current.topicTitle,
        eventType: 'timer_checkpoint',
        durationSeconds: current.seconds,
      });
      navigator.sendBeacon('/api/activity', new Blob([payload], { type: 'application/json' }));
    };
    const interval = window.setInterval(checkpoint, 10000);
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', saveBeforeLeaving);
    };
  }, [timer?.isRunning, timer?.topicId]);

  const openPath = (id) => {
    setSelectedPathId(id);
    setActiveView('path');
    setMobileOpen(false);
  };

  const toggleTopic = async (pathId, topicId, topicTitle) => {
    const isComplete = completedTopicIds.includes(topicId);
    try {
      await recordActivity({ pathId, topicId, topicTitle, eventType: isComplete ? 'topic_reopened' : 'topic_completed' });
    } catch (error) {
      setFriendMessage(error.message);
    }
  };

  const startTopicTimer = async (pathId, topicId, topicTitle, initialSeconds = 0) => {
    setTimer({ pathId, topicId, topicTitle, seconds: initialSeconds, isRunning: true });
    try {
      await recordActivity({ pathId, topicId, topicTitle, eventType: 'timer_started', durationSeconds: initialSeconds });
    } catch (error) {
      setTimer((current) => current ? { ...current, isRunning: false } : current);
      setFriendMessage(error.message);
    }
  };

  const pauseTopicTimer = async () => {
    if (!timer) return;
    setTimer((current) => current ? { ...current, isRunning: false } : current);
    try {
      await recordActivity({ pathId: timer.pathId, topicId: timer.topicId, topicTitle: timer.topicTitle, eventType: 'timer_paused', durationSeconds: timer.seconds });
    } catch (error) {
      setFriendMessage(error.message);
    }
  };

  const resetTopicTimer = async () => {
    if (!timer) return;
    setTimer(null);
    try {
      await recordActivity({ pathId: timer.pathId, topicId: timer.topicId, topicTitle: timer.topicTitle, eventType: 'timer_reset', durationSeconds: timer.seconds });
    } catch (error) {
      setFriendMessage(error.message);
    }
  };

  const addFriend = (event) => {
    event.preventDefault();
    const handle = friendInput.trim().replace(/^@/, '');
    if (!handle) {
      setFriendMessage('Enter a username to send an invite.');
      return;
    }
    fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendUsername: handle }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Friend could not be added.');
      setFriendInput('');
      setFriendMessage(`${result.name} was added to your study circle.`);
      await refreshData();
    }).catch((error) => setFriendMessage(error.message));
  };

  const createPath = async (draft) => {
    setPathSaving(true);
    setPathError('');
    try {
      const response = await fetch('/api/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The learning path could not be saved.');
      await refreshData();
      setSelectedPathId(result.id);
      setExpandedModule(0);
      setActiveView('path');
    } catch (error) {
      setPathError(error.message || 'The learning path could not be saved.');
    } finally {
      setPathSaving(false);
    }
  };

  const addPathSection = async (pathId, section) => {
    const response = await fetch(`/api/paths/${encodeURIComponent(pathId)}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(section),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The section could not be saved.');
    await refreshData();
    setExpandedModule(selectedPath.topics.length);
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Account request failed.');
      setAuthForm((current) => ({ ...current, password: '' }));
      await refreshData();
    } catch (error) {
      setAuthError(error.message || 'Account request failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const signOut = async () => {
    if (timer?.isRunning) await pauseTopicTimer();
    await fetch('/api/auth/logout', { method: 'POST' });
    setAppData(null);
    setTimer(null);
    setActiveView('home');
    setAuthMode('login');
  };

  const visiblePaths = allPaths.filter((path) => `${path.name} ${path.category} ${path.description} ${path.topics.join(' ')} ${path.topicDetails.join(' ')} ${path.subtopics.flat().join(' ')} ${path.subtopicDetails?.flat().join(' ') ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const timeLabel = `${String(Math.floor((timer?.seconds ?? 0) / 60)).padStart(2, '0')}:${String((timer?.seconds ?? 0) % 60).padStart(2, '0')}`;

  if (authLoading) return <div className="auth-shell"><div className="auth-loading">Opening your learning space…</div></div>;
  if (!appData) return <AuthView mode={authMode} setMode={(mode) => { setAuthMode(mode); setAuthError(''); }} form={authForm} setForm={setAuthForm} onSubmit={submitAuth} error={authError || apiError} isSubmitting={authSubmitting} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#home" onClick={() => setActiveView('home')} aria-label="Pathwise home">
          <span className="brand-mark"><Leaf size={19} strokeWidth={2.5} /></span>
          <span>pathwise<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className={`nav-item ${activeView === 'home' ? 'nav-active' : ''}`} onClick={() => { setActiveView('home'); setMobileOpen(false); }}><BookOpen size={18} /><span>My learning</span><span className="nav-count">{totalCompleted}</span></button>
          <button className={`nav-item ${activeView === 'explore' ? 'nav-active' : ''}`} onClick={() => { setActiveView('explore'); setMobileOpen(false); }}><Compass size={18} /><span>Explore paths</span></button>
          <button className={`nav-item ${activeView === 'friends' ? 'nav-active' : ''}`} onClick={() => { setActiveView('friends'); setMobileOpen(false); }}><Users size={18} /><span>Study circle</span><span className="nav-count">{friends.length}</span></button>
          <button className={`nav-item ${activeView === 'activity' ? 'nav-active' : ''}`} onClick={() => { setActiveView('activity'); setMobileOpen(false); }}><Activity size={18} /><span>Activity feed</span></button>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label path-label">YOUR PATHS <button aria-label="Create a learning path" onClick={() => { setPathError(''); setActiveView('create-path'); }}><Plus size={15} /></button></div>
        <div className="path-nav-list">
          {allPaths.map((path) => {
            const PathIcon = path.icon;
            return <button key={path.id} className={`path-nav-item ${selectedPathId === path.id && activeView === 'path' ? 'path-nav-active' : ''}`} onClick={() => openPath(path.id)}><span className={`mini-icon ${path.color}`}><PathIcon size={15} /></span><span>{path.short === 'AI / ML' ? 'AI & ML' : path.name}</span></button>;
          })}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-quote"><Sparkles size={16} /><p>Small steps, repeated daily, become remarkable things.</p><span>YOUR DAILY REMINDER</span></div>
          <button className="nav-item settings-button" onClick={() => setFriendMessage('Your learning preferences are ready to customize.')}><Settings2 size={18} /><span>Preferences</span></button>
          <div className="profile-row"><div className="avatar avatar-you">{appData.user.initials}</div><div className="profile-copy"><strong>{appData.user.name}</strong><span>@{appData.user.username}</span></div></div>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeView === 'home' ? 'My learning' : activeView === 'explore' ? 'Explore paths' : activeView === 'friends' ? 'Study circle' : activeView === 'activity' ? 'Activity feed' : selectedPath.name}</strong></div>
          <div className="topbar-actions"><div className="streak-pill"><Flame size={16} fill="currentColor" /><span>4 day streak</span></div><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setFriendMessage('You’re all caught up.')}><Bell size={18} /><i /></button><button className="signout-button" onClick={signOut}><span className="top-avatar">{appData.user.initials}</span><span>Sign out</span><LogOut size={14} /></button></div>
        </header>

        {apiError && <div className="api-alert" role="alert">{apiError}</div>}
        {activeView === 'home' && <HomeView paths={allPaths} completedTopicIds={completedTopicIds} openPath={openPath} todayCount={todayCount} totalCompleted={totalCompleted} friends={friends} setActiveView={setActiveView} />}
        {activeView === 'explore' && <ExploreView paths={visiblePaths} completedTopicIds={completedTopicIds} search={search} setSearch={setSearch} openPath={openPath} onCreate={() => { setPathError(''); setActiveView('create-path'); }} />}
        {activeView === 'create-path' && <CreatePathView onCreate={createPath} onCancel={() => setActiveView('explore')} isSaving={pathSaving} error={pathError} />}
        {activeView === 'path' && <PathView path={selectedPath} Icon={Icon} canEdit={selectedPath.isCustom && selectedPath.ownerUsername === appData.user.username} onAddSection={addPathSection} completedTopicIds={completedTopicIds} friendProgress={friendProgress} expandedModule={expandedModule} setExpandedModule={setExpandedModule} toggleTopic={toggleTopic} timer={timer} timeLabel={timeLabel} startTopicTimer={startTopicTimer} pauseTopicTimer={pauseTopicTimer} resetTopicTimer={resetTopicTimer} goHome={() => setActiveView('home')} />}
        {activeView === 'friends' && <FriendsView friends={friends} activity={activity} paths={allPaths} friendInput={friendInput} setFriendInput={setFriendInput} addFriend={addFriend} friendMessage={friendMessage} />}
        {activeView === 'activity' && <ActivityView activity={activity} paths={allPaths} />}
        <footer className="page-footer"><span>Made for the long game.</span><span><CircleHelp size={14} /> Keep showing up</span></footer>
      </main>

      {friendMessage && <div className="toast" role="status"><span>{friendMessage}</span><button aria-label="Dismiss message" onClick={() => setFriendMessage('')}><X size={15} /></button></div>}
    </div>
  );
}

function HomeView({ paths: allPaths, completedTopicIds, openPath, todayCount, totalCompleted, friends, setActiveView }) {
  const now = new Date();
  const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  const shortDate = `${now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} ${String(now.getDate()).padStart(2, '0')}`;
  const progressFor = (path) => Math.round((path.subtopics.reduce((sum, topicList, moduleIndex) => sum + topicList.filter((_, topicIndex) => completedTopicIds.includes(leafTopicId(path.id, moduleIndex, topicIndex))).length, 0) / getProgressTotal(path)) * 100);
  const featured = allPaths.find((path) => path.id === 'mern');
  const customRecommendations = allPaths.filter((path) => path.isCustom).slice(0, 3);
  const recommendedPaths = customRecommendations.length ? customRecommendations : allPaths.filter((path) => path.id !== 'mern').slice(0, 3);
  const FeaturedIcon = featured.icon;
  const nextTopic = featured.topics.find((topic, moduleIndex) => featured.subtopics[moduleIndex].some((_, topicIndex) => !completedTopicIds.includes(leafTopicId(featured.id, moduleIndex, topicIndex)))) ?? featured.topics[featured.topics.length - 1];
  return (
    <div className="page-wrap dashboard-page">
      <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> {fullDate}</div><h1>A little progress<br /><span>goes a long way.</span></h1><p className="welcome-copy">Your future self is built one focused session at a time.</p></div><div className="welcome-stamp"><div className="stamp-flower">✳</div><span>MAKE TODAY<br />COUNT</span></div></section>
      <section className="stats-row" aria-label="Learning summary"><div className="stat-block"><span className="stat-label">TOPICS COMPLETED</span><strong>{String(totalCompleted).padStart(2, '0')}<span className="stat-unit"> topics</span></strong><span className="stat-note"><span className="positive-note"><ArrowDownRight size={14} /> Keep it up</span> one at a time</span></div><div className="stat-block"><span className="stat-label">DAILY MOMENTUM</span><strong>{todayCount}<span className="stat-unit"> / 3</span></strong><span className="stat-note">topics toward your daily goal</span><div className="goal-track"><span style={{ width: `${Math.min((todayCount / 3) * 100, 100)}%` }} /></div></div><div className="stat-block streak-stat"><span className="stat-label">CURRENT STREAK</span><strong>4<span className="stat-unit"> days</span><Flame className="stat-flame" size={22} /></strong><span className="stat-note">You’re building a lovely habit</span></div></section>
      <div className="section-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Your learning desk</h2></div><button className="text-action" onClick={() => setActiveView('explore')}>All paths <ArrowRight size={16} /></button></div>
      <section className="learning-layout">
        <article className="continue-card">
          <div className="continue-card-top"><span className="continue-tag"><span /> IN PROGRESS</span><button className="bare-icon" aria-label="More options"><MoreHorizontal size={19} /></button></div>
          <div className="continue-title-row"><span className={`large-path-icon ${featured.color}`}><FeaturedIcon size={23} /></span><div><span className="path-category">{featured.category}</span><h3>{featured.name}</h3></div></div>
          <p className="continue-description">{featured.description}</p>
          <div className="progress-label"><span>YOUR PROGRESS</span><strong>{progressFor(featured)}%</strong></div><div className="progress-track"><span style={{ width: `${progressFor(featured)}%` }} /></div>
          <div className="next-topic"><div><span className="next-label">UP NEXT</span><strong>{nextTopic}</strong></div><button className="round-arrow" aria-label="Continue learning MERN stack" onClick={() => openPath('mern')}><ArrowRight size={18} /></button></div>
        </article>
        <article className="today-card"><div className="today-head"><div><span className="section-kicker">YOUR PRACTICE</span><h3>Today, gently.</h3></div><span className="date-chip">{shortDate}</span></div><div className="daily-progress"><div className="daily-ring" style={{ '--progress': `${Math.min((todayCount / 3) * 100, 100)}%` }}><span>{todayCount}<small>of 3</small></span></div><div><strong>{todayCount >= 3 ? 'Goal reached!' : todayCount ? 'You’re in motion.' : 'Start with one.'}</strong><p>{todayCount >= 3 ? 'Leave it there, or keep going.' : 'A focused half hour can open a new door.'}</p></div></div><div className="daily-footer"><span><Clock3 size={15} /> 30 min target</span><button onClick={() => openPath('mern')}>Plan a session <ArrowRight size={14} /></button></div></article>
      </section>
      <section className="paths-section"><div className="section-heading compact-heading"><div><span className="section-kicker">A FEW GOOD DIRECTIONS</span><h2>{customRecommendations.length ? 'Paths from your circle' : 'Explore your paths'}</h2></div><button className="text-action" onClick={() => setActiveView('explore')}>See all <ArrowRight size={16} /></button></div><div className="path-grid">{recommendedPaths.map((path) => <PathCard key={path.id} path={path} progress={progressFor(path)} openPath={openPath} />)}</div></section>
      <section className="friends-strip"><div className="friends-strip-copy"><div className="friend-spark">✳</div><div><strong>Good company makes the journey lighter.</strong><span>Find people learning what you’re learning.</span></div></div><div className="friends-stack">{friends.slice(0, 3).map((friend) => <div className={`avatar ${friend.color}`} key={friend.username} title={friend.name}>{friend.initials}</div>)}<button className="avatar add-avatar" aria-label="Find study friends" onClick={() => setActiveView('friends')}><Plus size={17} /></button></div><button className="friends-link" onClick={() => setActiveView('friends')}>Your study circle <ArrowRight size={15} /></button></section>
    </div>
  );
}

function PathCard({ path, progress, openPath }) {
  const CardIcon = path.icon;
  return <button className="path-card" onClick={() => openPath(path.id)}><div className="path-card-head"><span className={`large-path-icon ${path.color}`}><CardIcon size={21} /></span><span className="card-arrow"><ArrowDownRight size={17} /></span></div><span className="path-category">{path.category}</span><h3>{path.name}</h3><p>{path.description}</p><div className="card-meta"><span>{getProgressTotal(path)} lessons</span><span className="meta-dot" /><span>{path.duration}</span></div><div className="card-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress}%</small></div></button>;
}

function ExploreView({ paths: visiblePaths, completedTopicIds, search, setSearch, openPath, onCreate }) {
  return <div className="page-wrap secondary-page">
    <div className="page-intro"><span className="section-kicker">A MAP, NOT A RACE</span><h1>Find your next<br /><span>good direction.</span></h1><p>Each path is a thoughtfully ordered collection of topics. Pick one that makes you curious.</p></div>
    <div className="explore-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search paths or topics" aria-label="Search learning paths" /></div><div className="explore-toolbar-actions"><span className="results-count">{visiblePaths.length} learning paths</span><button className="create-path-button" onClick={onCreate}><Plus size={15} /> Create path</button></div></div>
    {visiblePaths.length ? <div className="explore-grid">{visiblePaths.map((path) => <PathCard key={path.id} path={path} progress={getPathProgress(path, completedTopicIds)} openPath={openPath} />)}</div> : <div className="empty-state"><Compass size={25} /><strong>No paths found</strong><span>Try a different search term.</span></div>}
  </div>;
}

const blankSection = () => ({ title: '', description: '', lessons: [{ title: '', description: '' }] });

function SectionEditor({ section, index, onChange, onRemove, canRemove }) {
  const update = (key, value) => onChange({ ...section, [key]: value });
  const updateLesson = (lessonIndex, key, value) => update('lessons', section.lessons.map((lesson, currentIndex) => currentIndex === lessonIndex ? { ...lesson, [key]: value } : lesson));
  return <section className="section-editor">
    <div className="section-editor-heading"><span>SECTION {String(index + 1).padStart(2, '0')}</span>{canRemove && <button type="button" className="remove-row-button" onClick={onRemove} aria-label={`Remove section ${index + 1}`}><X size={15} /></button>}</div>
    <label>Section title<input maxLength={100} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Data structures" required value={section.title} /></label>
    <label>Section summary<input maxLength={240} onChange={(event) => update('description', event.target.value)} placeholder="What will this section cover?" value={section.description} /></label>
    <div className="lesson-editor-list"><span className="section-kicker">LESSONS</span>{section.lessons.map((lesson, lessonIndex) => <div className="lesson-editor-row" key={lessonIndex}>
      <label>Lesson {lessonIndex + 1}<input maxLength={120} onChange={(event) => updateLesson(lessonIndex, 'title', event.target.value)} placeholder="A focused lesson title" required value={lesson.title} /></label>
      <label>Details<input maxLength={240} onChange={(event) => updateLesson(lessonIndex, 'description', event.target.value)} placeholder="What the learner will study" value={lesson.description} /></label>
      {section.lessons.length > 1 && <button type="button" className="remove-row-button remove-lesson" onClick={() => update('lessons', section.lessons.filter((_, currentIndex) => currentIndex !== lessonIndex))} aria-label={`Remove lesson ${lessonIndex + 1}`}><X size={15} /></button>}
    </div>)}<button type="button" className="add-lesson-button" onClick={() => update('lessons', [...section.lessons, { title: '', description: '' }])}><Plus size={14} /> Add lesson</button></div>
  </section>;
}

function CreatePathView({ onCreate, onCancel, isSaving, error }) {
  const [draft, setDraft] = useState({ title: '', description: '', category: 'Personal path', duration: 'Self-paced', color: 'mint', sections: [blankSection()] });
  const updateSection = (index, section) => setDraft((current) => ({ ...current, sections: current.sections.map((item, itemIndex) => itemIndex === index ? section : item) }));
  const removeSection = (index) => setDraft((current) => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }));
  return <div className="page-wrap secondary-page create-path-page">
    <button className="back-link" onClick={onCancel}><ArrowRight size={15} /> Explore paths</button>
    <div className="page-intro"><span className="section-kicker">MAKE IT YOURS</span><h1>Build a learning<br /><span>path that fits.</span></h1><p>Start with sections and lessons. You can add more sections whenever the path grows.</p></div>
    <form className="path-builder-form" onSubmit={(event) => { event.preventDefault(); onCreate(draft); }}>
      <section className="path-builder-basics"><div className="section-kicker">PATH DETAILS</div><label>Path name<input maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Frontend foundations" required value={draft.title} /></label><label>What is this path about?<textarea maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="A short description to help your friends choose it" rows={2} value={draft.description} /></label><div className="builder-meta-fields"><label>Category<input maxLength={40} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Personal path" required value={draft.category} /></label><label>Pace<select onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))} value={draft.duration}><option>Self-paced</option><option>4 weeks</option><option>8 weeks</option><option>12 weeks</option><option>16 weeks</option></select></label></div><fieldset className="path-colors"><legend>Path color</legend>{['mint', 'coral', 'blue', 'yellow', 'lavender'].map((color) => <label key={color} className={`color-choice color-${color} ${draft.color === color ? 'color-selected' : ''}`}><input checked={draft.color === color} name="pathColor" onChange={() => setDraft((current) => ({ ...current, color }))} type="radio" value={color} /><span>{color}</span></label>)}</fieldset></section>
      <div className="builder-section-heading"><div><span className="section-kicker">CURRICULUM</span><h2>Organize it into sections</h2></div><span>{draft.sections.length} sections</span></div>
      {draft.sections.map((section, index) => <SectionEditor key={index} section={section} index={index} onChange={(value) => updateSection(index, value)} onRemove={() => removeSection(index)} canRemove={draft.sections.length > 1} />)}
      <button type="button" className="add-section-button" onClick={() => setDraft((current) => ({ ...current, sections: [...current.sections, blankSection()] }))}><Plus size={15} /> Add section</button>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="builder-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button type="submit" className="create-path-button" disabled={isSaving}>{isSaving ? 'Saving…' : 'Create learning path'}<ArrowRight size={15} /></button></div>
    </form>
  </div>;
}

function SectionEditorPanel({ onSave, onCancel, isSaving, error }) {
  const [section, setSection] = useState(blankSection);
  return <form className="inline-section-form" onSubmit={(event) => { event.preventDefault(); onSave(section); }}>
    <SectionEditor section={section} index={0} onChange={setSection} canRemove={false} />
    {error && <div className="auth-error" role="alert">{error}</div>}
    <div className="builder-actions"><button type="button" className="cancel-button" onClick={onCancel}>Cancel</button><button type="submit" className="create-path-button" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save section'}<Check size={15} /></button></div>
  </form>;
}

function PathView({ path, Icon, canEdit, onAddSection, completedTopicIds, friendProgress, expandedModule, setExpandedModule, toggleTopic, timer, timeLabel, startTopicTimer, pauseTopicTimer, resetTopicTimer, goHome }) {
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const progressCount = path.subtopics.reduce((sum, topicList, moduleIndex) => sum + topicList.filter((_, topicIndex) => completedTopicIds.includes(leafTopicId(path.id, moduleIndex, topicIndex))).length, 0);
  const progress = Math.round((progressCount / getProgressTotal(path)) * 100);
  const saveSection = async (section) => {
    setSectionSaving(true);
    setSectionError('');
    try {
      await onAddSection(path.id, section);
      setShowSectionEditor(false);
    } catch (error) {
      setSectionError(error.message || 'The section could not be saved.');
    } finally {
      setSectionSaving(false);
    }
  };
  return (
    <div className="page-wrap secondary-page path-detail-page">
      <button className="back-link" onClick={goHome}><ArrowRight size={15} /> My learning</button>
      <div className="path-hero"><div className="path-hero-copy"><span className="section-kicker">{path.category.toUpperCase()} · {path.duration.toUpperCase()}</span><h1>{path.name}<br /><span>learning path.</span></h1><p>{path.description}</p><div className="path-hero-meta"><span><BookOpen size={15} /> {getProgressTotal(path)} lessons</span><span><Check size={15} /> {progressCount} completed</span></div></div><div className={`hero-orbit ${path.color}`}><div className="orbit-ring" /><Icon size={45} strokeWidth={1.5} /><span>{progress}%</span></div></div>
      <div className="path-progress-overview"><div><span className="section-kicker">YOUR PATH PROGRESS</span><strong>{progressCount} <small>of {getProgressTotal(path)} lessons complete</small></strong></div><div className="path-progress-track"><span style={{ width: `${progress}%` }} /></div></div>
      <div className="topic-section-head"><div><span className="section-kicker">THE CURRICULUM</span><h2>Choose a topic to open.</h2></div><div className="path-heading-actions"><span className="completion-count">{progressCount}/{getProgressTotal(path)} COMPLETE</span>{canEdit && <button className="add-section-button inline-add-section" onClick={() => { setSectionError(''); setShowSectionEditor(!showSectionEditor); }}><Plus size={14} /> Add section</button>}</div></div>
      {showSectionEditor && <SectionEditorPanel onSave={saveSection} onCancel={() => setShowSectionEditor(false)} isSaving={sectionSaving} error={sectionError} />}
      <div className="topic-list">{path.topics.map((topic, moduleIndex) => {
        const subtopics = path.subtopics[moduleIndex];
        const moduleComplete = subtopics.filter((_, topicIndex) => completedTopicIds.includes(leafTopicId(path.id, moduleIndex, topicIndex))).length;
        const isExpanded = expandedModule === moduleIndex;
        return <section className={`module-group ${isExpanded ? 'module-expanded' : ''}`} key={topic}>
          <button className="module-heading" aria-expanded={isExpanded} onClick={() => setExpandedModule(isExpanded ? null : moduleIndex)}>
            <span className="topic-index">{String(moduleIndex + 1).padStart(2, '0')}</span>
            <span className="module-copy"><strong>{topic}</strong><small>{path.topicDetails[moduleIndex]}</small></span>
            <span className="module-count">{moduleComplete}/{subtopics.length}</span>
            <ChevronDown className={isExpanded ? 'chevron-up' : ''} size={17} />
          </button>
          {isExpanded && <div className="subtopic-list">{subtopics.map((subtopic, topicIndex) => {
            const topicId = leafTopicId(path.id, moduleIndex, topicIndex);
            const isComplete = completedTopicIds.includes(topicId);
            const activeTimer = timer?.topicId === topicId;
            const completedByFriends = friendProgress.filter((friend) => friend.completedTopicIds.includes(topicId));
            return <article className={`subtopic-row ${isComplete ? 'topic-done' : ''}`} key={topicId}>
              <button className={`topic-check ${isComplete ? 'checked' : ''}`} aria-label={isComplete ? `Mark ${subtopic} incomplete` : `Mark ${subtopic} complete`} onClick={() => toggleTopic(path.id, topicId, subtopic)}>{isComplete && <Check size={15} />}</button>
              <div className="subtopic-copy"><strong>{subtopic}</strong><span>{path.subtopicDetails?.[moduleIndex]?.[topicIndex] || (isComplete ? 'Completed by you' : 'Lesson · work through at your pace')}</span>{completedByFriends.length > 0 && <small className="friend-completions">{completedByFriends.map((friend) => friend.name).join(', ')} completed this</small>}</div>
              {activeTimer ? <div className="topic-timer"><Timer size={15} /><span>{timeLabel}</span>{timer.isRunning ? <button aria-label="Pause timer" onClick={pauseTopicTimer}><Pause size={15} /></button> : <button aria-label="Resume timer" onClick={() => startTopicTimer(path.id, topicId, subtopic, timer.seconds)}><Play size={15} /></button>}<button aria-label="Reset timer" onClick={resetTopicTimer}>Reset</button></div> : <button className="topic-timer-start" onClick={() => startTopicTimer(path.id, topicId, subtopic)}><Clock3 size={15} /><span>Focus timer</span></button>}
            </article>;
          })}</div>}
        </section>;
      })}</div>
      <div className="path-note"><Sparkles size={17} /><span>Progress is shared with your study circle. The best pace is the one you can return to.</span></div>
    </div>
  );
}

function ActivityView({ activity, paths }) {
  return <div className="page-wrap secondary-page activity-page"><div className="page-intro"><span className="section-kicker">YOUR LEARNING, TOGETHER</span><h1>Activity<br /><span>happens here.</span></h1><p>Every lesson and focus session, from you and your study circle.</p></div><ActivityList activity={activity} paths={paths} /></div>;
}

function AuthView({ mode, setMode, form, setForm, onSubmit, error, isSubmitting }) {
  const registering = mode === 'register';
  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return <main className="auth-shell">
    <section className="auth-panel">
      <a className="brand auth-brand" href="#home"><span className="brand-mark"><Leaf size={19} strokeWidth={2.5} /></span><span>pathwise<span className="brand-period">.</span></span></a>
      <div className="auth-intro"><span className="section-kicker">A PLACE TO KEEP GROWING</span><h1>{registering ? 'Start with a path.' : 'Welcome back.'}</h1><p>{registering ? 'Create your account and find your people along the way.' : 'Pick up where your curiosity left off.'}</p></div>
      <div className="auth-tabs" role="tablist" aria-label="Account options"><button type="button" className={!registering ? 'auth-tab-active' : ''} onClick={() => setMode('login')}>Log in</button><button type="button" className={registering ? 'auth-tab-active' : ''} onClick={() => setMode('register')}>Create account</button></div>
      <form className="auth-form" onSubmit={onSubmit}>
        {registering && <label>Display name<input autoComplete="name" maxLength={50} minLength={2} onChange={updateField('displayName')} placeholder="How friends know you" required value={form.displayName} /></label>}
        <label>Username<span className="field-hint">Friends use this to find you</span><input autoComplete="username" maxLength={30} minLength={3} onChange={updateField('username')} placeholder="e.g. alexcodes" required value={form.username} /></label>
        <label>Password{registering && <span className="field-hint">At least 8 characters</span>}<input autoComplete={registering ? 'new-password' : 'current-password'} maxLength={128} minLength={registering ? 8 : undefined} onChange={updateField('password')} placeholder="Your password" required type="password" value={form.password} /></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-submit" disabled={isSubmitting} type="submit">{isSubmitting ? 'Please wait…' : registering ? 'Create account' : 'Log in'}<ArrowRight size={16} /></button>
      </form>
      <div className="auth-footnote"><GraduationCap size={16} /><span>Your learning progress and friend activity stay connected to your account.</span></div>
    </section>
    <aside className="auth-aside"><div className="auth-aside-mark">✳</div><span className="section-kicker">LEARN A LITTLE. OFTEN.</span><h2>Good work grows<br />with good company.</h2><p>Choose a path, take one small step, and let your circle cheer you on.</p><div className="auth-aside-line"><span /><span /><span /></div></aside>
  </main>;
}

function ActivityList({ activity, limit, paths }) {
  const entries = limit ? activity.slice(0, limit) : activity;
  if (!entries.length) return <div className="empty-state"><Activity size={25} /><strong>No activity yet</strong><span>Complete a lesson or start a focus timer.</span></div>;
  return <div className="activity-list">{entries.map((entry) => {
    const eventLabels = { topic_completed: 'completed a lesson', topic_reopened: 'reopened a lesson', timer_started: 'started a focus session', timer_paused: 'paused a focus session', timer_reset: 'reset a focus session', timer_completed: 'completed a focus session' };
    const elapsed = entry.durationSeconds ? ` · ${Math.floor(entry.durationSeconds / 60)} min focused` : '';
    const pathName = paths.find((path) => path.id === entry.pathId)?.name ?? entry.pathId;
    const createdAt = entry.createdAt.endsWith('Z') ? entry.createdAt : `${entry.createdAt}Z`;
    return <article className="activity-row" key={entry.id}><div className={`avatar ${entry.color}`}>{entry.initials}</div><div className="activity-copy"><strong>{entry.name} <span>{eventLabels[entry.eventType] ?? 'logged an activity'}</span></strong><p>{entry.topicTitle}<small>{pathName}{elapsed}</small></p></div><time>{new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></article>;
  })}</div>;
}

function FriendsView({ friends, activity, paths, friendInput, setFriendInput, addFriend, friendMessage }) {
  return <div className="page-wrap secondary-page friends-page"><div className="page-intro friends-intro"><span className="section-kicker">BETTER, TOGETHER</span><h1>Your study<br /><span>circle.</span></h1><p>Keep each other curious. Add a friend and make learning feel a little less solo.</p></div><section className="invite-panel"><div className="invite-icon"><Users size={21} /></div><div className="invite-copy"><strong>Bring someone along</strong><span>They’ll need a Pathwise account first.</span></div><form className="invite-form" onSubmit={addFriend}><div className="handle-input"><span>@</span><input value={friendInput} onChange={(event) => setFriendInput(event.target.value)} placeholder="registered username" aria-label="Friend username" /></div><button type="submit"><Plus size={16} /> Add friend</button></form></section><div className="friend-list-heading"><div><span className="section-kicker">YOUR PEOPLE</span><h2>{friends.length} learners in your circle</h2></div><button className="sort-button">Recently active <ChevronDown size={15} /></button></div><div className="friend-list">{friends.map((friend) => <article className="friend-row" key={friend.username}><div className={`avatar friend-avatar ${friend.color}`}>{friend.initials}</div><div className="friend-main"><strong>{friend.name}</strong><span>@{friend.username}</span></div><div className="friend-status"><i className="status-online" /><span>{friend.status}</span></div><button className="friend-action" aria-label={`More options for ${friend.name}`}><MoreHorizontal size={19} /></button></article>)}</div><div className="circle-note"><Sparkles size={17} /><span>Show up for your own journey. Celebrate theirs, too.</span></div>{friendMessage && <p className="inline-message" role="status">{friendMessage}</p>}<div className="activity-section-heading"><div><span className="section-kicker">RECENT ACTIVITY</span><h2>What your circle is learning</h2></div></div><ActivityList activity={activity} paths={paths} limit={12} /></div>;
}

export default App;
