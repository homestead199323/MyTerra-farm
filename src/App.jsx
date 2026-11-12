import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Leaf, User, UserRound, MessageSquare, MessageCircle, Settings, ChevronRight,
  Sun, ListChecks, Tractor, CalendarDays, Menu, BookOpen, TrendingUp, Package, Wallet, Lightbulb, X
} from "lucide-react";
import { Overlay } from "./components/ui";

import {
  loadFarm, saveFarm, flushFarm, exportFarm,
  loadFarmOwner, saveFarmOwner, clearFarm,
  loadPage, savePage,
  loadTheme, saveTheme,
  loadFeedbackDone,
  loadFeedbackDismissed, markFeedbackDismissed,
  loadFirstUse, saveFirstUse,
} from "./lib/storage";
import { C, F, SX } from "./lib/theme";
import { todayLocalKey, localDateFromKey } from "./lib/utils";
import { buildTaskPlan } from "./lib/task-queue";
import { fetchForecast } from "./lib/weather";
import { syncDigests, disablePush, pushPrefs } from "./lib/push";
import { usePushPrefs } from "./lib/use-push-prefs";
import { migrateZones, migratePlotSchema, migrateGamify, migrateCompletions, migrateProfile as migrateProfileBase, migrateYardLine, updateGamify } from "./lib/migrations";
import { migratePerennials } from "./lib/perennial";
import { migratePantry } from "./lib/inventory";
import { migrateMemory } from "./lib/memory";
import { migratePlanned } from "./lib/planned";
import { CROP_MAP } from "./data/crops";
// migrateMemory last: it reads the pantry log that migratePantry normalises.
const migrateProfile = (d) => migrateMemory(migratePantry(migratePlanned(migratePerennials(migrateProfileBase(d), CROP_MAP, todayLocalKey()), todayLocalKey())), todayLocalKey());
// Same chain as the local/cloud load paths, for a backup file's raw object.
const migrateBackup = (d) => migrateYardLine(migrateProfile(migrateCompletions(migrateGamify(migratePlotSchema(migrateZones({...DEF, ...d, log: d.log||[], costs: d.costs||{items:[]}}))))));
import Pantry from "./features/pantry/Pantry";
import Financials from "./features/financials/Financials";
import Manuals from "./features/manuals/Manuals";
import Livestock from "./features/animals/Livestock";
import MapScreen, { CropsScreen } from "./features/farm/Farm";
import TaskQueue from "./features/tasks/TaskQueue";
import GroveHome from "./features/grove/GroveHome";
import HomeV2 from "./features/home/HomeV2";
import GameDock from "./features/home/GameDock";
import SetupV2 from "./features/home/SetupV2";
import { useHomeV2 } from "./lib/home-v2";
import AIAssistant from "./features/assistant/AIAssistant";
import FeedbackSurvey, { FeedbackPrompt } from "./features/feedback/FeedbackSurvey";
import { BadgeCelebration } from "./components/BadgeCelebration";
import Toaster from "./components/Toaster";
import Onboarding from "./features/onboarding/Onboarding";
import { SECTIONS, ADMIN_NAV, sectionOf, normalizePage } from "./app/navigation";
import PlanScreen from "./features/plan/PlanScreen";
import ProgressScreen from "./features/progress/ProgressScreen";
import InsightsScreen from "./features/progress/InsightsScreen";
import { DEF, dataReducer } from "./app/state";
import { isSupabaseConfigured, recoveryInUrl, authLinkError } from "./lib/db";
import { getSession, onAuthChange, signOut, signOutLocal } from "./lib/auth";
import { pullFarmWithTimeout, pushFarm, flushPush, initSyncReconnect, pullIfRemoteNewer, noteAppliedUpdatedAt, resetSync, getSyncStatus } from "./lib/sync";
import { SyncStatus } from "./components/SyncStatus";
import AuthScreen from "./features/auth/AuthScreen";
import SettingsPanel from "./features/settings/SettingsPanel";
import AdminDashboard from "./features/admin/AdminDashboard";
import { checkIsAdmin } from "./lib/admin";
import { fetchEntitlement, getCachedEntitlement, resetEntitlement, hasFeature, planLabel } from "./services/payments/entitlements";
import { spaceTitle } from "./lib/environment";
import { parseBackup, farmSummary, describeSummary } from "./lib/backup";
import { toast } from "./lib/toast";
import { TrialBanner, UpgradeSheet, LockedAssistantFab, onPaddlePurchase } from "./features/payments/Paywall";
/* ═══════════════════════════════════════════
   ERROR BOUNDARY — graceful crash recovery
   ═══════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("MyTerra Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",background:C.bg,fontFamily:F.body,padding:32}}>
          <div style={{background:C.card,borderRadius:C.r,padding:32,maxWidth:480,boxShadow:C.shL,textAlign:"center"}}>
            
            <h2 style={{fontFamily:F.head,fontSize:22,marginBottom:8}}>Something went wrong</h2>
            <p style={{color:C.t2,fontSize:14,marginBottom:16}}>Your farm data is safe in your browser. Try reloading.</p>
            <p style={{color:C.t2,fontSize:12,marginBottom:20,fontFamily:F.mono,background:C.soft,padding:8,borderRadius:8,textAlign:"left",wordBreak:"break-word"}}>{String(this.state.error)}</p>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={() => {
                try {
                  const raw = exportFarm();
                  if (raw) {
                    const blob = new Blob([raw], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `myterra-emergency-backup-${todayLocalKey()}.json`;
                    a.click();
                  }
                } catch(e) { alert("Could not export: " + e.message); }
              }} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:13,fontWeight:600}}>
                Export Backup
              </button>
              <button onClick={() => window.location.reload()} style={{padding:"10px 20px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════
   BOTTOM NAVIGATION — mobile (< 768px)
   Stage 5: the five areas (Today, Farm, Plan, Learn, Progress).
   An area opens its first page; the pages inside an area are the tabs
   at the top of the screen (SectionBar).
   ═══════════════════════════════════════════ */
/* Phone tab bar (2026-11-11, Dervis): a phone is for today, the tasks, the map and the calendar, so those are the tabs.
   What to read or review at a desk (guides, progress, pantry, money, insights) and the assistant sit behind More. */
const PHONE_TABS = [
  { id: "today", l: "Today", E: Sun, page: "home", pages: ["home"] },
  { id: "tasks", l: "Tasks", E: ListChecks, page: "tasks", pages: ["tasks"] },
  { id: "farm", l: "Farm", E: Tractor, page: "crops", pages: ["crops", "live", "map"] },
  { id: "cal", l: "Calendar", E: CalendarDays, page: "plan", pages: ["plan"] },
];
const MORE_ROWS = [
  { page: "manuals", l: "Learn", s: "Guides for crops, animals, preserving", E: BookOpen },
  { page: "progress", l: "Progress", s: "What your space has given you", E: TrendingUp },
  { page: "pantry", l: "Pantry", s: "What is in stock", E: Package },
  { page: "fin", l: "Money", s: "Costs and income", E: Wallet },
  { page: "insights", l: "Insights", s: "Yields and cost per kilo", E: Lightbulb },
];
const BottomNav = React.memo(function BottomNav({page, setPage, taskCount, onAsk, aiLocked}) {
  const [more, setMore] = useState(false);
  const inMore = !PHONE_TABS.some(function(t){ return t.pages.includes(page); });
  const moreOn = more || inMore;
  const tabStyle = function(active){ return {flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", gap:2, border:"none", background:"transparent", cursor:"pointer", padding:"2px 4px", minHeight:44, color: active ? C.green : C.t2, position:"relative"}; };
  const tabLabel = function(text, active){ return <span className="mt-tablabel" style={{fontSize:10,fontWeight:active?700:500,fontFamily:F.body,letterSpacing:"0.01em",whiteSpace:"nowrap"}}>{text}</span>; };
  return (
    <>
    <nav aria-label="Main navigation" style={{
      position:"fixed", bottom:0, left:0, right:0,
      height:"calc(56px + env(safe-area-inset-bottom))",
      background:C.card, borderTop:`1px solid ${C.bdr}`,
      display:"flex", alignItems:"flex-start", paddingTop:6,
      paddingBottom:"env(safe-area-inset-bottom)",
      zIndex:400, boxShadow:"0 -1px 12px rgba(0,0,0,.06)",
    }}>
      {PHONE_TABS.map(function(t) {
        const isActive = !more && t.pages.includes(page);
        return (
          <button key={t.id} aria-label={t.l} aria-current={isActive?"page":undefined} onClick={function(){ setMore(false); setPage(t.page); }} style={tabStyle(isActive)}>
            <span style={{display:"flex",alignItems:"center",justifyContent:"center",opacity:isActive?1:0.5,transition:"opacity .15s"}}><t.E size={22} strokeWidth={isActive?2.2:1.7}/></span>
            {tabLabel(t.l, isActive)}
            {t.id==="tasks"&&taskCount>0&&(
              <span style={{position:"absolute",top:0,right:"calc(50% - 20px)",background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center",lineHeight:"14px"}}>{taskCount}</span>
            )}
          </button>
        );
      })}
      <button aria-label="More" aria-expanded={more} onClick={function(){ setMore(!more); }} style={tabStyle(moreOn)}>
        <span style={{display:"flex",alignItems:"center",justifyContent:"center",opacity:moreOn?1:0.5,transition:"opacity .15s"}}><Menu size={22} strokeWidth={moreOn?2.2:1.7}/></span>
        {tabLabel("More", moreOn)}
      </button>
    </nav>
    {more && (
      <Overlay title="More" onClose={function(){ setMore(false); }}>
        <div className="mt-more">
          {MORE_ROWS.map(function(r) {
            return <button key={r.page} type="button" aria-current={page===r.page?"page":undefined} onClick={function(){ setMore(false); setPage(r.page); }}><r.E size={22} strokeWidth={1.8}/><span><strong>{r.l}</strong><small>{r.s}</small></span><ChevronRight size={18}/></button>;
          })}
          <button type="button" onClick={function(){ setMore(false); onAsk(); }}><MessageCircle size={22} strokeWidth={1.8}/><span><strong>Ask the assistant</strong><small>{aiLocked ? "Part of Pro" : "Answers about your crops and animals"}</small></span><ChevronRight size={18}/></button>
        </div>
      </Overlay>
    )}
    </>
  );
});

/* Pages inside the current area, as tabs above the page (phones + tablets),
   plus the account button on phones (Settings, feedback, plan). */
const SectionBar = React.memo(function SectionBar({page, setPage, onAccount, onClose}) {
  const sec = sectionOf(page);
  const pages = sec ? sec.pages : [];
  return (
    <div className="mt-secbar">
      {pages.length > 1 && !(onAccount && sec.id === "today") /* on a phone Today and Tasks are tabs at the bottom */
        ? <div className="mt-secbar-tabs" role="tablist" aria-label={sec.l}>
            {pages.map(function(p) {
              return <button key={p.id} type="button" role="tab" aria-selected={page===p.id} onClick={function(){ setPage(p.id); }}>{p.l}</button>;
            })}
          </div>
        : <span className="mt-secbar-brand"><Leaf size={16} strokeWidth={2.2}/> MyTerra</span>}
      {onAccount && (
        <button type="button" className="mt-secbar-me" aria-label="Account, settings and feedback" onClick={onAccount}>
          <UserRound size={19} strokeWidth={1.9}/>
        </button>
      )}
      {onClose && (
        <button type="button" className="mt-secbar-me mt-secbar-x" aria-label="Back to the farm" onClick={onClose}>
          <X size={20} strokeWidth={2}/>
        </button>
      )}
    </div>
  );
});

const AccountSheet = React.memo(function AccountSheet({page, setPage, onClose, onOpenSettings, isAdmin, title, plan, onUpgrade}) {
  const rowStyle = {display:"flex",alignItems:"center",gap:14,width:"100%",padding:"14px 20px",border:"none",background:"transparent",color:C.text,cursor:"pointer",fontSize:15,fontFamily:F.body,textAlign:"left"};
  const ico = {width:28,display:"flex",alignItems:"center",justifyContent:"center",color:C.t2};
  return createPortal(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(18,26,20,.3)",zIndex:2100}}/>
      <div className="overlay-pop" role="dialog" aria-modal="true" aria-label="Account" style={{
        position:"fixed", top:"50%", left:"50%", zIndex:2101,
        translate:"-50% -50%",
        width:"min(400px, calc(100vw - 24px))",
        background:C.card, borderRadius:C.r+4,
        padding:"8px 0", boxShadow:"0 20px 60px rgba(0,0,0,.22), 0 8px 20px rgba(0,0,0,.1)",
        maxHeight:"min(80dvh, 640px)", overflowY:"auto", overscrollBehavior:"contain",
      }}>
        {/* Profile section */}
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"10px 20px 14px",borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{width:44,height:44,borderRadius:22,background:C.grdHero,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <User size={22} strokeWidth={1.8} color="#fff"/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F.body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</div>
            <div style={{fontSize:11,color:C.t2,marginTop:1}}>{plan ? `MyTerra · ${plan}` : "MyTerra"}</div>
          </div>
          {plan && plan !== "Lifetime Pro" && onUpgrade && (
            <button type="button" onClick={function(){ onClose(); onUpgrade(); }} style={{border:`1px solid ${C.bdr}`,background:C.card,color:C.green,borderRadius:10,padding:"7px 10px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F.body,whiteSpace:"nowrap"}}>
              Plans
            </button>
          )}
        </div>
        <div style={{padding:"4px 0"}}>
          <button type="button" onClick={function(){ onOpenSettings(); }} style={rowStyle}>
            <span style={ico}><Settings size={19} strokeWidth={1.8}/></span><span style={{flex:1}}>Settings</span><ChevronRight size={17} color="currentColor" style={{opacity:.4}}/>
          </button>
          <button type="button" onClick={function(){ setPage("feedback"); onClose(); }} aria-current={page==="feedback"?"page":undefined} style={rowStyle}>
            <span style={ico}><MessageSquare size={19} strokeWidth={1.8}/></span><span style={{flex:1}}>Give feedback</span><ChevronRight size={17} color="currentColor" style={{opacity:.4}}/>
          </button>
          {isAdmin && (
            <button type="button" onClick={function(){ setPage(ADMIN_NAV.id); onClose(); }} aria-current={page===ADMIN_NAV.id?"page":undefined} style={rowStyle}>
              <span style={ico}><ADMIN_NAV.E size={19} strokeWidth={1.8}/></span><span style={{flex:1}}>{ADMIN_NAV.l}</span><ChevronRight size={17} color="currentColor" style={{opacity:.4}}/>
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
});

// Demo mode (no account). The farm lives in this browser's cache only,
// stamped with DEMO_OWNER so a later sign-in never mistakes it for a user's
// farm. Full write access, Pro screens open; the AI assistant stays off (it
// needs a session). Nothing is ever fetched or pushed.
const DEMO_OWNER = "demo";
const DEMO_ENT = { plan: "demo", state: "demo", canWrite: true, isPro: true, trialDaysLeft: 0 };

// No session → open the demo, EXCEPT when the visitor clearly wants the
// auth screen: a ?signup / ?signin / ?reset link (pricing cards, "Sign in"),
// an expired email link, or a returning user whose own farm is cached on
// this device (they get "Sign in", never a demo that would replace it).
function wantsAuthScreen() {
  try {
    if (recoveryInUrl || authLinkError) return true;
    const q = new URLSearchParams(window.location.search);
    if (q.has("demo")) return false;
    if (q.has("signup") || q.has("signin") || q.has("reset") || q.get("mode")) return true;
    const owner = loadFarmOwner();
    return !!(owner && owner !== DEMO_OWNER);
  } catch (e) { return true; }
}

function DemoBanner({ onSignup, onSignin }) {
  return (
    <div role="status" style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:C.gp,border:`1px solid ${C.bdr}`,borderRadius:12,padding:"8px 12px",marginBottom:14,fontFamily:F.body}}>
      <span style={{fontSize:12.5,color:C.text,fontWeight:500,flex:1,minWidth:180}}>Demo mode — this farm lives only on this device. Create a free account to keep it and get 7 days of Pro.</span>
      {onSignin && <button type="button" onClick={onSignin} style={{border:`1px solid ${C.bdr}`,background:"transparent",color:C.text,cursor:"pointer",borderRadius:10,padding:"7px 12px",fontSize:12.5,fontWeight:600,fontFamily:F.body,whiteSpace:"nowrap"}}>Sign in</button>}
      <button type="button" onClick={onSignup} style={{border:"none",background:C.green,color:"#fff",cursor:"pointer",borderRadius:10,padding:"7px 12px",fontSize:12.5,fontWeight:700,fontFamily:F.body,whiteSpace:"nowrap"}}>Create free account</button>
    </div>
  );
}

function AppInner({ cloudData, allowLocal, seedCloud, onSignOut, onAccountDeleted, demo, onExitDemo, onDemoSignup, onDemoSignin }) {
  // Lazy initializer — loads data synchronously, no loading flash
  // Wrapped in try-catch: if storage is corrupt or migration throws, fall back to DEF
  // instead of crashing the reducer with undefined state.
  // Seed priority:
  //   1. cloudData (reconciled cloud farm from AuthGate) — always wins.
  //   2. local cache — ONLY when allowLocal is true (this browser's local
  //      farm belongs to the current user, or we're in local-only mode).
  //      When false (fresh account / different owner), local is ignored so
  //      one user never inherits another's cached farm.
  //   3. DEF — clean slate.
  const initData = () => {
    try {
      const local = allowLocal ? loadFarm() : null;
      const d = cloudData || local;
      let initial = d ? {...DEF,...d,log:d.log||[],costs:d.costs||{items:[]}} : DEF;
      if (!initial.schemaVersion) initial = {...initial, schemaVersion: 7};
      initial = migrateZones(initial);
      initial = migratePlotSchema(initial);
      initial = migrateGamify(initial);
      initial = migrateCompletions(initial);
      initial = migrateYardLine(migrateProfile(initial));
      return initial;
    } catch (e) {
      console.error("initData failed, falling back to DEF:", e);
      return DEF;
    }
  };

  const [page,setPageRaw]=useState(() => {
    try { return normalizePage(loadPage()); } catch(e) { return "home"; }
  });
  const [pageData,setPageData]=useState(null);
  const [data,dispatchData]=useReducer(dataReducer, null, initData);
  const [viewW,setViewW]=useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [accountOpen,setAccountOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  // Owner flag — controls Admin nav visibility only. The admin RPC
  // re-verifies identity server-side, so this is purely cosmetic.
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(() => {
    let on = true;
    checkIsAdmin().then(v => { if (on) setIsAdmin(v); });
    return () => { on = false; };
  }, []);
  const [darkMode,setDarkMode]=useState(() => {
    try {
      const saved = loadTheme();
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch(e) { return false; }
  });
  const [showFeedbackPrompt,setShowFeedbackPrompt]=useState(false);
  // Phase 8.4 — queue of badge ids waiting to be shown in the celebration overlay
  const [badgeQueue,setBadgeQueue]=useState([]);

  // Phase 8.2 (payments) — entitlement drives the read-only lock, trial
  // banner, and Pro gates. Seeded synchronously from the offline-grace
  // cache, then verified against Supabase on mount and on tab focus.
  // 'unknown' (no cache yet, fetch pending) is treated optimistically as
  // unlocked — the farms RLS is the real security boundary, and blocking a
  // paying user on a network blip is worse than letting a write bounce.
  const [ent, setEnt] = useState(() => demo ? DEMO_ENT : getCachedEntitlement());
  const entRef = useRef(ent);
  useEffect(() => { entRef.current = ent; }, [ent]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // In the demo there is nothing to buy: every "upgrade" path leads to
  // creating the free account instead (the demo farm comes along).
  const openUpgrade = useCallback(() => {
    if (demo) { if (onDemoSignup) onDemoSignup(); return; }
    setUpgradeOpen(true);
  }, [demo, onDemoSignup]);
  useEffect(() => {
    if (demo) return undefined;
    let on = true;
    fetchEntitlement().then((e) => { if (on) setEnt(e); });
    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchEntitlement().then((e) => { if (on) setEnt(e); });
    };
    window.addEventListener("focus", refresh);
    return () => { on = false; window.removeEventListener("focus", refresh); };
  }, [demo]);
  // Checkout completed: the plan is unlocked by the Paddle webhook a few
  // seconds later. Close the plan sheet and re-check the entitlement until it
  // changes (up to ~90 s), so the user isn't left on the picker, read-only,
  // wondering whether the payment worked.
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const unsub = onPaddlePurchase(() => {
      setUpgradeOpen(false);
      toast("Payment received", { detail: "Activating your plan…" });
      const before = entRef.current;
      let tries = 0;
      const poll = () => {
        if (cancelled) return;
        fetchEntitlement().then((e) => {
          if (cancelled) return;
          setEnt(e);
          // A purchase always lands on a paid plan: trial → basic/pro/lifetime, or an
          // ended subscription back to active. Anything else is the webhook not there yet.
          const paid = e.canWrite && e.plan !== "trial" && e.plan !== "none";
          const changed = e.plan !== before.plan || e.state !== before.state;
          if (paid && changed) { toast("You're on " + (planLabel(e) || "your new plan"), { detail: "Thanks for supporting MyTerra 🌱" }); return; }
          if (++tries < 30) timer = setTimeout(poll, 3000);
          else toast("Still activating", { detail: "Your payment went through; the plan unlocks within a few minutes. Reload if it hasn't." });
        }).catch(() => { if (!cancelled && ++tries < 30) timer = setTimeout(poll, 3000); });
      };
      timer = setTimeout(poll, 2500);
    });
    return () => { cancelled = true; if (timer) clearTimeout(timer); unsub(); };
  }, []);
  const locked = ent.state !== "unknown" && !ent.canWrite;
  const aiAllowed = !demo && (ent.state === "unknown" || hasFeature(ent, "ai"));
  const planText = demo ? "Demo" : planLabel(ent);
  const analyticsAllowed = ent.state === "unknown" || hasFeature(ent, "analytics");
  // Ref mirror so the stable setData callback (empty deps) sees the live
  // lock without being re-created on every entitlement change.
  const lockedRef = useRef(false);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  // 7-day feedback prompt — record first use, show prompt after 7 days (once)
  useEffect(() => {
    try {
      if (loadFeedbackDone()) return; // already submitted
      if (loadFeedbackDismissed()) return; // user said "maybe later"
      let firstUse = loadFirstUse();
      if (!firstUse) {
        saveFirstUse(Date.now());
        return; // just started using, check again next time
      }
      const daysSinceFirst = (Date.now() - parseInt(firstUse)) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst >= 7) setShowFeedbackPrompt(true);
    } catch(e) {}
  }, []);

  // Responsive breakpoint listener
  useEffect(() => {
    const check = () => setViewW(window.innerWidth);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = viewW < 768;
  // Map-first home (spec 2026-11-12): a device switch while it is tried out. Phone and desktop.
  const homeV2 = useHomeV2();
  const noSide = isMobile || homeV2; // the new home has a dock on every screen size, so no sidebar
  useEffect(() => { document.body.classList.toggle("mt-home-v2", homeV2); return () => document.body.classList.remove("mt-home-v2"); }, [homeV2]);
  const isTablet = viewW >= 768 && viewW < 1024;

  // Flush pending save on tab close / navigate away
  useEffect(() => {
    const flush = () => { flushFarm(); flushPush(); };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Wire the reconnect handler once so a queued offline cloud-write drains
  // when connectivity returns.
  useEffect(() => { initSyncReconnect(); }, []);

  // Phase 6 — multi-device: when the tab regains focus/visibility, pull the
  // cloud row if another device wrote a newer copy. pullIfRemoteNewer no-ops
  // when offline, signed out, or when we have unpushed local edits (so an
  // in-progress edit is never clobbered — last-write-wins favours it). The
  // pulled blob runs the same migration chain as initData before dispatch.
  useEffect(() => {
    const maybePull = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      pullIfRemoteNewer().then((fresh) => {
        if (!fresh) return;
        try {
          let migrated = {...DEF, ...fresh, log: fresh.log||[], costs: fresh.costs||{items:[]}};
          if (!migrated.schemaVersion) migrated = {...migrated, schemaVersion: 7};
          migrated = migrateYardLine(migrateProfile(migrateCompletions(migrateGamify(migratePlotSchema(migrateZones(migrated))))));
          dispatchData({ type: "SET_ALL", data: migrated });
          saveFarm(migrated); // keep local cache aligned; do NOT re-push
        } catch (e) { console.warn("[sync] hydrate from remote failed:", e); }
      }).catch(() => { /* network hiccup — local stays authoritative */ });
    };
    const onVis = () => { if (document.visibilityState === "visible") maybePull(); };
    window.addEventListener("focus", maybePull);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", maybePull);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // One-time initial cloud push on mount — ONLY when AuthGate saw an empty
  // cloud row (fresh signup, or a farm built offline before the first push).
  // When the farm came from the cloud there is nothing to push, and when the
  // cloud could not be reached (timeout / error) pushing would overwrite the
  // real farm with this device's cache or a blank DEF. Ongoing changes push
  // via setData as usual.
  useEffect(() => {
    if (seedCloud && data && !lockedRef.current) pushFarm(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dark mode — apply data-theme attribute and persist
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      saveTheme(darkMode ? 'dark' : 'light');
    } catch(e) {}
  }, [darkMode]);

  // Navigate + persist current page
  const setPage = useCallback((p, pData) => {
    setPageRaw(p);
    setPageData(pData || null);
    try { savePage(p); } catch(e) {}
  }, []);

  // Latest committed farm, for functional updates (see setData).
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Save wrapper — backward-compatible setData that dispatches + debounced save
  // Also runs gamification updates (streak, badges) on every data change.
  // Accepts a whole farm object, or an updater `(latest) => next` for changes
  // that must build on the CURRENT farm (toast "Undo" after other edits, a
  // cloud pull landing in between) rather than on a snapshot taken earlier.
  const setData = useCallback((nd) => {
    const resolved = typeof nd === "function" ? nd(dataRef.current) : nd;
    if (!resolved || typeof resolved !== "object") return;
    // Nothing changed (an updater handed the farm back as it was, e.g. the
    // hourly forecast refresh once the town's position is stored): save and
    // push nothing. Pushing it anyway uploaded this tab's whole copy of the
    // farm every hour, so a tab or phone left open with an older copy
    // overwrote newer edits made elsewhere (farm size, type of space,
    // anything) and the next focus pulled that older copy back.
    if (resolved === dataRef.current) return;
    // Phase 8.2 — read-only after trial/subscription expiry. The farms RLS
    // rejects the upsert anyway; blocking here keeps local state consistent
    // with the cloud and turns a dead click into an upgrade prompt.
    if (lockedRef.current) { setUpgradeOpen(true); return; }
    const withGamify = updateGamify(resolved);
    // Phase 8.4 — extract transient _pendingCelebrations before persisting
    const { _pendingCelebrations, ...persistable } = withGamify;
    if (Array.isArray(_pendingCelebrations) && _pendingCelebrations.length > 0) {
      setBadgeQueue(q => [...q, ..._pendingCelebrations]);
    }
    dataRef.current = persistable; // keep functional updates in the same tick consistent
    dispatchData({type:'SET_ALL', data: persistable});
    saveFarm(persistable);
    if (!demo) pushFarm(persistable); // cloud backup (debounced, offline-aware); never from the demo
    // silent save — no UI indicator
  }, [demo]);

  // Phase 8.4 — when a badge is dismissed, mark it celebrated so it never
  // shows again, then pop it off the queue. The next updateGamify pass will
  // see this badge already in `badges` and produce no new _pendingCelebrations.
  const dismissBadge = useCallback((badgeId) => {
    setBadgeQueue(q => q.filter(id => id !== badgeId));
    setData({
      ...data,
      gamify: {
        ...data.gamify,
        celebratedBadges: [...(data.gamify.celebratedBadges || []), badgeId],
      },
    });
  }, [data, setData]);

  // Export farm data as JSON backup
  const exportData = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myterra-backup-${todayLocalKey()}.json`;
      a.click();
      // Delay revocation — revoking synchronously after click() cancels the
      // download in Safari (and races in other browsers).
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch(e) { console.warn("Export failed:", e); }
  }, [data]);

  // Import, step 1: read + check a backup file WITHOUT touching the farm, so
  // Settings can show what it holds and ask before replacing anything.
  const readBackup = useCallback((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try { resolve(parseBackup(String(e.target.result || ""), migrateBackup)); }
      catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Couldn't read that file. Try again."));
    reader.readAsText(file);
  }), []);

  // Import, step 2 (after the user confirms): replace the farm, with Undo.
  const restoreBackup = useCallback((next) => {
    if (lockedRef.current) { setUpgradeOpen(true); return false; }
    const previous = data;
    setData(next);
    setSettingsOpen(false);
    toast("Backup restored", { detail: describeSummary(farmSummary(next)), actionLabel: "Undo", onAction: () => setData(previous) });
    return true;
  }, [data, setData]);

  // Show onboarding on first visit AND after data reset
  // Condition: no zones and setupDone not set — same as old setup redirect but uses overlay now
  const showOnboarding = !!(data && !data.setupDone && Array.isArray(data.zones) && data.zones.length === 0);

  const handleOnboardingComplete = useCallback((updates) => {
    setData({ ...data, ...updates });
  }, [data, setData]);

  // Compute tasks ONCE — passed down to Dashboard + TaskQueue
  // Null guard: if data hasn't initialized yet, return empty tasks rather than crashing buildTaskQueue.
  // 7-day forecast for the farm's city: weather jobs + jobs that move with the
  // weather (lib/weather-alerts.js). Refetched hourly while open; cached 3 h.
  const city = data?.city || "";
  // forecastState: null (no city) | { loading } | the fetchForecast result (ok or error) — Home shows which.
  const [forecastState, setForecastState] = useState(null);
  const forecast = forecastState && forecastState.ok ? forecastState : null;
  useEffect(() => {
    let active = true;
    if (!city) { setForecastState(null); return undefined; }
    setForecastState({ loading: true }); // new town: never show the old town's week
    const load = () => fetchForecast(city).then((f) => {
      if (!active) return;
      setForecastState(f || { ok: false, error: "exception" });
      // the town's latitude drives the 3D map's sun; stored once per town so the map works offline too
      if (f && f.ok && typeof f.lat === "number" && typeof f.lng === "number") setData((d) => d && (d.cityGeo?.lat !== f.lat || d.cityGeo?.lng !== f.lng) ? { ...d, cityGeo: { lat: f.lat, lng: f.lng } } : d);
    });
    load();
    const id = setInterval(load, 60 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, [city, setData]);
  // Day tick: a PWA left open overnight must move on to the new day. Every
  // screen reads todayLocalKey() per render, so one state change here is
  // enough to refresh the plan, the calendar projection and the 3D map.
  const [dayKey, setDayKey] = useState(todayLocalKey);
  useEffect(() => {
    const check = () => { const k = todayLocalKey(); setDayKey((prev) => (prev === k ? prev : k)); };
    const id = setInterval(check, 60 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);
  const plan = useMemo(() => data ? buildTaskPlan(data, { forecast, now: localDateFromKey(dayKey) }) : { tasks: [], alerts: [] }, [data, forecast, dayKey]);
  const tasks = plan.tasks;
  // Reminders on for this device → keep the next 7 mornings' digests current (lib/push.js).
  const pushOn = usePushPrefs().on;
  useEffect(() => {
    if (!pushOn || !data) return undefined;
    const id = setTimeout(() => { syncDigests(data, forecast).catch(() => {}); }, 4000);
    return () => clearTimeout(id);
  }, [data, forecast, pushOn]);
  const taskCount = useMemo(() => tasks.filter(t => t.pri <= 2).length, [tasks]);
  const clearFarmPageData = useCallback(() => setPageData(null), []);

  // Loading fallback — if reducer somehow returns null, render a safe placeholder instead of crashing pg()
  if (!data) {
    return <div style={{padding:40,textAlign:"center",color:C.t2,fontFamily:F.body}}>Loading…</div>;
  }

  const currentSection = sectionOf(page);
  // The map is the whole screen on the new home (an empty space still gets the old page with its set-up prompt).
  // New home: the farm is a stage that stays mounted; every other page opens as a panel over it.
  const stage = homeV2 && (data.zones || []).length > 0 && !showOnboarding;
  const mapHome = stage && page === "home";
  const goFarm = () => setPage("home");

  const pg = () => {
    switch(page) {
      case "tasks": return <TaskQueue data={data} setData={setData} setPage={setPage} tasks={tasks} forecast={forecast} pageData={pageData} clearPageData={clearFarmPageData}/>;
      case "map": return <MapScreen data={data} setData={setData} pageData={pageData} clearPageData={clearFarmPageData} setPage={setPage}/>;
      case "crops": return <CropsScreen data={data} setData={setData} pageData={pageData} clearPageData={clearFarmPageData} setPage={setPage}/>;
      case "live": return <Livestock data={data} setData={setData} pageData={pageData} clearPageData={clearFarmPageData}/>;
      case "pantry": return <Pantry data={data} setData={setData} pageData={pageData} clearPageData={clearFarmPageData}/>;
      case "fin": return <Financials data={data} setData={setData}/>;
      case "manuals": return <Manuals data={data}/>;
      case "plan": return <PlanScreen data={data} setData={setData} setPage={setPage}/>;
      case "progress": return <ProgressScreen data={data} setPage={setPage}/>;
      case "insights": return <InsightsScreen data={data} setPage={setPage} locked={!analyticsAllowed} onUpgrade={openUpgrade}/>;
      case "feedback": return <FeedbackSurvey setPage={setPage}/>;
      case "admin": return <AdminDashboard/>;
      default: return stage ? null
        : <GroveHome data={data} setData={setData} setPage={setPage} tasks={tasks} forecast={forecast} forecastState={forecastState} alerts={plan.alerts}/>;
    }
  };

  return (
    <>
      {/* Fonts loaded via system fallback for offline use */}
      <div className="mt-shell" style={{display:"flex",fontFamily:F.body,background:C.bg,color:C.text,overflow:"hidden",letterSpacing:"0.005em"}}>
        <nav style={{width:noSide?0:isTablet?64:220,minWidth:noSide?0:isTablet?64:220,background:C.card,borderRight:noSide?"none":`1px solid ${C.bdr}`,display:noSide?"none":"flex",flexDirection:"column",padding:"0",overflow:"hidden",position:"relative",transition:"width .3s cubic-bezier(.25,.46,.45,.94)"}}>
          {/* Premium brand header */}
          <div style={{padding:isTablet?"16px 0":"24px 20px 20px",marginBottom:4,background:C.grdHero,borderRadius:isTablet?"0":"0 0 20px 0",display:"flex",flexDirection:"column",alignItems:isTablet?"center":"flex-start"}}>
            <div style={{fontSize:isTablet?22:21,fontFamily:F.head,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",display:"flex",alignItems:"center",gap:6}}><Leaf size={isTablet?22:20} strokeWidth={2}/>{!isTablet&&" MyTerra"}</div>
            {!isTablet&&<div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:3,fontWeight:500}}>Farm Manager</div>}
          </div>
          <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:2}}>
          {SECTIONS.map(function(sec, idx) {
            const inSec = !!currentSection && currentSection.id === sec.id;
            const single = sec.pages.length === 1;
            return (
            <React.Fragment key={sec.id}>
            {isTablet && idx !== 0 && <div style={{height:1,background:C.bdr,margin:"4px 12px"}}/>}
            <button onClick={function(){ setPage(sec.pages[0].id); }} className="nav-item" aria-current={inSec&&(single||isTablet)?"page":undefined} style={{display:"flex",alignItems:"center",gap:isTablet?0:11,padding:isTablet?"10px 0":"10px 14px",marginTop:!isTablet&&idx!==0?6:0,justifyContent:isTablet?"center":"flex-start",border:"none",background:inSec&&(single||isTablet)?C.gp:"transparent",color:inSec?C.green:C.text,cursor:"pointer",fontSize:14,fontFamily:F.body,fontWeight:inSec?700:600,textAlign:"left",width:"100%",borderRadius:10,borderLeft:isTablet?"none":inSec&&single?`3px solid ${C.green}`:"3px solid transparent",position:"relative",letterSpacing:"0.01em"}} title={isTablet?sec.l:undefined} aria-label={isTablet?sec.l:undefined}>
              <span style={{width:isTablet?undefined:24,display:"flex",alignItems:"center",justifyContent:"center",opacity:inSec?1:0.6,transition:"opacity .2s"}}><sec.E size={isTablet?20:17} strokeWidth={inSec?2.2:1.8}/></span>{!isTablet&&sec.l}
              {sec.id==="today"&&taskCount>0&&<span style={{position:"absolute",right:isTablet?4:10,top:isTablet?4:undefined,background:"linear-gradient(135deg, #f59e0b, #d97706)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,boxShadow:"0 2px 6px rgba(245,158,11,.3)"}}>{taskCount}</span>}
            </button>
            {!isTablet && !single && sec.pages.map(function(pg2) {
              const on = page === pg2.id;
              return (
                <button key={pg2.id} onClick={function(){ setPage(pg2.id); }} className="nav-item" aria-current={on?"page":undefined} style={{display:"flex",alignItems:"center",padding:"7px 14px 7px 49px",border:"none",background:on?C.gp:"transparent",color:on?C.green:C.t2,cursor:"pointer",fontSize:13,fontFamily:F.body,fontWeight:on?600:500,textAlign:"left",width:"100%",borderRadius:10,borderLeft:on?`3px solid ${C.green}`:"3px solid transparent"}}>
                  {pg2.l}
                </button>
              );
            })}
            </React.Fragment>
            );
          })}
          {isAdmin && (
            <button onClick={function(){ setPage(ADMIN_NAV.id); }} className="nav-item" aria-current={page===ADMIN_NAV.id?"page":undefined} style={{display:"flex",alignItems:"center",gap:isTablet?0:11,padding:isTablet?"10px 0":"10px 14px",marginTop:10,justifyContent:isTablet?"center":"flex-start",border:"none",background:page===ADMIN_NAV.id?C.gp:"transparent",color:page===ADMIN_NAV.id?C.green:C.t2,cursor:"pointer",fontSize:13,fontFamily:F.body,fontWeight:600,textAlign:"left",width:"100%",borderRadius:10}} title={isTablet?ADMIN_NAV.l:undefined}>
              <span style={{width:isTablet?undefined:24,display:"flex",alignItems:"center",justifyContent:"center"}}><ADMIN_NAV.E size={isTablet?20:16} strokeWidth={1.8}/></span>{!isTablet&&ADMIN_NAV.l}
            </button>
          )}
          </div>
          <div style={SX.flex1}/>
          <div style={{borderTop:`1px solid ${C.bdr}`,margin:isTablet?"0 8px":"0 10px"}}/>
          <button onClick={()=>setPage("feedback")} style={{display:"flex",alignItems:"center",gap:isTablet?0:8,padding:isTablet?"10px 0":"10px 20px 6px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:F.body,fontWeight:500,width:"100%",justifyContent:isTablet?"center":"flex-start"}} title="Give feedback">
            <MessageSquare size={isTablet?20:14} strokeWidth={1.8}/>{!isTablet&&<span style={{marginLeft:2}}>Give Feedback</span>}
          </button>
          <button onClick={()=>setSettingsOpen(true)} style={{display:"flex",alignItems:"center",gap:isTablet?0:8,padding:isTablet?"10px 0":"6px 20px 14px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:F.body,fontWeight:500,width:"100%",justifyContent:isTablet?"center":"flex-start"}} title="Settings">
            <Settings size={isTablet?20:14} strokeWidth={1.8}/>{!isTablet&&<span style={{marginLeft:2}}>Settings</span>}
          </button>
        </nav>
        {stage && <HomeV2 wide={!isMobile} covered={!mapHome} data={data} setData={setData} setPage={setPage} tasks={tasks} forecast={forecast} forecastState={forecastState} alerts={plan.alerts} demo={demo} onDemoSignup={openUpgrade}/>}
        {stage && !mapHome && <button type="button" className="hv2-page-strip" aria-label="Back to the farm" onClick={goFarm}/>}
        {stage && !mapHome && <div className={`hv2-page-bg${isMobile ? "" : " is-wide"}`} aria-hidden="true"/>}
        <main className={stage ? `hv2-page${isMobile ? "" : " is-wide"}` : undefined} hidden={mapHome} style={stage ? undefined : {flex:1,overflow:"auto",padding:isMobile?"16px 16px calc(80px + env(safe-area-inset-bottom))":homeV2?(isTablet?"24px 24px 104px":"32px 36px 104px"):isTablet?"24px":"32px 36px",background:C.bg}}>
          {stage && isMobile && <span className="hv2-page-grab" aria-hidden="true"/>}
          {/* Nothing renders under the first-run setup: the 3D map would otherwise
              animate behind it and drain a phone's battery for no one. */}
          {!showOnboarding && !mapHome && (viewW < 1024 || homeV2) && <SectionBar page={page} setPage={setPage} onAccount={noSide ? () => setAccountOpen(true) : null} onClose={stage ? goFarm : null}/>}
          {!showOnboarding && !mapHome && (demo ? <DemoBanner onSignup={openUpgrade} onSignin={onDemoSignin}/> : <TrialBanner ent={ent} onUpgrade={openUpgrade}/>)}
          {!showOnboarding && pg()}
        </main>
      </div>
      {noSide&&!showOnboarding&&(homeV2
        ? <GameDock wide={!isMobile} page={page} setPage={setPage} data={data} aiLocked={!aiAllowed} onAsk={aiAllowed ? function(){ window.dispatchEvent(new Event("mt-assistant")); } : openUpgrade} onAccount={function(){ setAccountOpen(true); }}/>
        : <BottomNav page={page} setPage={setPage} taskCount={taskCount} aiLocked={!aiAllowed} onAsk={aiAllowed ? function(){ window.dispatchEvent(new Event("mt-assistant")); } : openUpgrade}/>)}
      {noSide&&accountOpen&&<AccountSheet page={page} setPage={setPage} isAdmin={isAdmin} title={spaceTitle(data)} plan={planText} onUpgrade={openUpgrade} onClose={()=>setAccountOpen(false)} onOpenSettings={()=>{setAccountOpen(false);setSettingsOpen(true);}}/>}
      {showFeedbackPrompt && <FeedbackPrompt onOpen={() => { setShowFeedbackPrompt(false); setPage("feedback"); }} onDismiss={() => { setShowFeedbackPrompt(false); try { markFeedbackDismissed(); } catch(e) { console.warn("Could not save feedback dismissal state:", e); } }}/>}
      <BadgeCelebration queue={badgeQueue} onDismiss={dismissBadge}/>
      {!showOnboarding && (aiAllowed
        ? <AIAssistant data={data} setData={setData} lift={page === "home"}/>
        : <LockedAssistantFab lift={page === "home"} onClick={openUpgrade}/>)}
      <Toaster/>
      <UpgradeSheet open={upgradeOpen} onClose={() => setUpgradeOpen(false)} ent={ent}/>
      {settingsOpen && <SettingsPanel onClose={()=>setSettingsOpen(false)} data={data} setData={setData} exportData={exportData} readBackup={readBackup} restoreBackup={restoreBackup} darkMode={darkMode} setDarkMode={setDarkMode} onSignOut={demo ? null : onSignOut} onExitDemo={demo ? onExitDemo : null} plan={planText} ent={ent} onAccountDeleted={demo ? null : onAccountDeleted} onUpgrade={()=>{setSettingsOpen(false);openUpgrade();}}/>}
      {showOnboarding && (homeV2 ? <SetupV2 onComplete={handleOnboardingComplete}/> : <Onboarding onComplete={handleOnboardingComplete}/>)}
    </>
  );
}

/* ═══════════════════════════════════════════
   AUTH GATE — mandatory sign-in wall + cloud reconcile (Phase 5)

   Flow:
   1. On mount, check for an existing session (getSession) and subscribe
      to auth changes (onAuthChange) so sign-in/out swaps the view live.
   2. No session  → render <AuthScreen/>.
   3. Has session → pull the cloud farm (12 s deadline) and reconcile cloud
      vs local BEFORE mounting AppInner. Cloud farm → use it. Confirmed
      empty → seed from this user's own cache or DEF and push once.
      Timeout/error → this user's own cache if there is one (no push), else
      a "can't reach your farm" screen with Retry. A blank farm is never
      seeded over an unreadable cloud one.
   4. AppInner mounts once with the reconciled `cloudData` seed.

   If Supabase isn't configured (missing env vars), skip the wall
   entirely and run local-only — the app still works offline-first.
   ═══════════════════════════════════════════ */
// How long the first cloud pull may take before we stop waiting. Slow mobile
// networks and a cold Supabase project both exceed 3 s regularly; a timeout
// must never be mistaken for "this user has no farm".
const RECONCILE_TIMEOUT_MS = 12000;

function AuthGate() {
  const [phase, setPhase] = useState("checking"); // checking | signedout | recovery | reconciling | unreachable | ready | demo
  // Opened from a password-reset email: hold the recovery session on the
  // "choose a new password" screen instead of walking straight into the app.
  const recoveryRef = useRef(recoveryInUrl);
  const [authNotice, setAuthNotice] = useState(authLinkError
    ? "That email link has expired or was already used. Sign in below, or use “Forgot password?” to get a new link."
    : "");
  const [cloudData, setCloudData] = useState(null);
  // When true, AppInner's initData may seed from the local cache; when false
  // it ignores local and starts from DEF. Set per-account by reconcileAndReady
  // so a fresh user on a shared browser never inherits a prior user's farm.
  const [allowLocal, setAllowLocal] = useState(false);
  // True only when the cloud row was confirmed EMPTY: AppInner then pushes
  // its seed (local cache or DEF) once on mount. Never true after a timeout
  // or error, so a blank farm can't overwrite a real one (data-loss fix,
  // 2026-10-12).
  const [seedCloud, setSeedCloud] = useState(false);
  // bump remounts AppInner cleanly on each fresh sign-in so its reducer
  // re-seeds from the new user's reconciled data.
  const [sessionKey, setSessionKey] = useState(0);
  // Which user id we've already reconciled for. supabase-js v2 re-emits
  // SIGNED_IN on tab focus/visibility; without this guard every focus ran
  // reconcileAndReady → sessionKey bump → FULL AppInner remount (onboarding
  // wizard reset to step 0, open overlays closed, "Loading your farm…" flash).
  const reconciledFor = useRef(null);

  // Demo mode — try the app without an account (see DEMO_OWNER above).
  const [authMode, setAuthMode] = useState(undefined);
  const demoHandoffRef = useRef(false);
  const startDemo = useCallback(() => {
    try {
      const owner = loadFarmOwner();
      if (owner && owner !== DEMO_OWNER) clearFarm(); // never adopt another account's cache
      saveFarmOwner(DEMO_OWNER);
    } catch (e) { /* ignore */ }
    resetSync();
    setCloudData(null);
    setAllowLocal(true);
    setSeedCloud(false);
    setSessionKey(k => k + 1);
    setPhase("demo");
  }, []);
  const exitDemo = useCallback(() => {
    try { flushFarm(); } catch (e) { /* ignore */ }
    setAuthMode(undefined);
    setAuthNotice("");
    setPhase("signedout");
  }, []);
  // "Create free account" from inside the demo: reconcileAndReady hands the
  // local demo farm to the new account when its cloud row is empty.
  const demoSignin = useCallback(() => {
    try { flushFarm(); } catch (e) { /* ignore */ }
    demoHandoffRef.current = true;
    setAuthMode("signin");
    setAuthNotice("");
    setPhase("signedout");
  }, []);
  const demoSignup = useCallback(() => {
    try { flushFarm(); } catch (e) { /* ignore */ }
    demoHandoffRef.current = true;
    setAuthMode("signup");
    setAuthNotice("Create your free account and the farm you built in the demo comes with you.");
    setPhase("signedout");
  }, []);

  // Local-only escape hatch: if env vars are absent, never gate, and allow
  // the local cache (single-user, no accounts — original pre-Phase-5 behavior).
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAllowLocal(true);
      setPhase("ready");
    }
  }, []);

  // Reconcile cloud vs local for a freshly-detected session, then go ready.
  // Multi-account guard: the local farm cache is shared across everyone who
  // signs in on this browser. We stamp it with the owning user id. If the
  // current user differs from the stamp, local belongs to someone else and
  // must be ignored (and cleared) — otherwise user B would inherit user A's
  // cached farm.
  const reconcileAndReady = useCallback(async () => {
    setPhase("reconciling");

    // Decide what to seed from, then mount. The cloud is the source of truth;
    // this device's cache is only ever used when it belongs to THIS user.
    const mount = (cloud, local, seed) => {
      setAuthMode(undefined);
      setCloudData(cloud);
      setAllowLocal(local);
      setSeedCloud(seed);
      setSessionKey(k => k + 1);
      setPhase("ready");
    };

    let localBelongsToUser = false;
    try {
      const session = await getSession();
      const userId = session && session.user ? session.user.id : null;
      if (!userId) { setPhase("signedout"); return; }

      // Owner check BEFORE deciding what to seed.
      try {
        const owner = loadFarmOwner();
        localBelongsToUser = owner === userId;
      } catch (e) { localBelongsToUser = false; }

      // Demo → account handoff: the demo farm is adopted ONLY into an empty
      // cloud row (fresh signup). A farm already in the cloud always wins.
      let handoff = false;
      try { handoff = demoHandoffRef.current && loadFarmOwner() === DEMO_OWNER; } catch (e) { handoff = false; }
      demoHandoffRef.current = false;

      // If local belongs to a different (or no) user, wipe it now so a stale
      // cache can't leak into this account or get pushed up under the wrong id.
      if (!localBelongsToUser && !handoff) {
        try { clearFarm(); } catch (e) { /* ignore */ }
      }

      // { data, source: cloud|empty|error|timeout, updatedAt } | null (signed out)
      const pulled = await pullFarmWithTimeout(RECONCILE_TIMEOUT_MS);
      if (!pulled) { setPhase("signedout"); return; }

      if (pulled.source === "cloud" && pulled.data) {
        // Cloud has a real saved farm — use it. Nothing to push back.
        if (handoff) { try { clearFarm(); } catch (e) { /* ignore */ } } // demo farm discarded
        try { saveFarmOwner(userId); } catch (e) { /* ignore */ }
        noteAppliedUpdatedAt(pulled.updatedAt || 0);
        mount(pulled.data, false, false);
        return;
      }
      if (pulled.source === "empty") {
        // Confirmed empty (fresh signup, or row exists but data === {}).
        // Seed from local ONLY if that local farm belongs to THIS user
        // (e.g. they built offline before their first successful push),
        // otherwise start clean from DEF — and push that seed up once.
        try { saveFarmOwner(userId); } catch (e) { /* ignore */ }
        noteAppliedUpdatedAt(pulled.updatedAt || 0);
        mount(null, localBelongsToUser || handoff, true);
        return;
      }

      // Timeout or query error: the cloud farm may exist, we just can't see
      // it. NEVER seed DEF here (that showed the onboarding wizard and — via
      // the mount push — overwrote the real farm with a blank one). Open this
      // user's own offline cache if there is one; the next focus-pull picks
      // up the cloud copy, and any edit pushes as usual. Otherwise ask to retry.
      console.warn("[auth] cloud pull " + pulled.source + " — not seeding a blank farm");
      noteAppliedUpdatedAt(0);
      if (localBelongsToUser && loadFarm()) {
        mount(null, true, false);
      } else {
        setPhase("unreachable");
      }
    } catch (e) {
      console.warn("[auth] reconcile failed:", e);
      noteAppliedUpdatedAt(0);
      if (localBelongsToUser && loadFarm()) mount(null, true, false);
      else setPhase("unreachable");
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    // Initial session check on load.
    getSession().then(session => {
      if (!active) return;
      if (session && recoveryRef.current) { setPhase("recovery"); return; }
      if (!session && recoveryRef.current) {
        recoveryRef.current = false;
        setAuthNotice("That reset link has expired or was already used. Request a new one with “Forgot password?”.");
      }
      if (session) {
        if (reconciledFor.current !== session.user.id) {
          reconciledFor.current = session.user.id;
          reconcileAndReady();
        }
      } else if (!wantsAuthScreen()) {
        startDemo(); // no account needed to look around (TikTok / landing traffic)
      } else {
        setPhase("signedout");
      }
    }).catch(() => {
      if (active) setPhase("signedout");
    });

    // Live auth-state subscription (sign-in, sign-out, token refresh).
    const unsub = onAuthChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        recoveryRef.current = true;
        setPhase("recovery");
        return;
      }
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && recoveryRef.current) return; // wait for the new password
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // Dedupe: SIGNED_IN re-fires on tab focus for an unchanged session.
        // Only a genuinely new user id triggers a fresh reconcile + remount.
        if (session && reconciledFor.current !== session.user.id) {
          reconciledFor.current = session.user.id;
          reconcileAndReady();
        }
      } else if (event === "SIGNED_OUT") {
        reconciledFor.current = null;
        setCloudData(null);
        resetSync(); // server-side sign-outs / token revocation take this path too
        resetEntitlement(); // Phase 8.2 — a paid user's offline-grace cache must not leak to the next account
        setPhase(p => p === "demo" ? p : "signedout");
      }
      // TOKEN_REFRESHED / USER_UPDATED: no view change needed.
    });

    return () => { active = false; unsub(); };
  }, [reconcileAndReady, startDemo]);

  // New password saved: drop the recovery hold and open the farm as a normal sign-in.
  const finishRecovery = useCallback(async () => {
    recoveryRef.current = false;
    try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* ignore */ }
    const session = await getSession();
    if (session && session.user) {
      reconciledFor.current = session.user.id;
      reconcileAndReady();
    } else {
      setPhase("signedout");
    }
  }, [reconcileAndReady]);

  const handleSignOut = useCallback(async () => {
    try {
      flushFarm();
      await flushPush(); // push any pending change before dropping the session
      // Unsynced edits (offline, or the push just failed) would be lost with
      // the local cache below — say so and let the user keep them.
      const status = getSyncStatus();
      if (status === "offline" || status === "error" || status === "syncing") {
        const ok = window.confirm(
          "Your latest changes haven't reached the cloud yet" +
          (status === "offline" ? " (you're offline)." : ".") +
          " Sign out anyway? Changes that aren't backed up will be lost."
        );
        if (!ok) return;
      }
      // This device stops getting this account's reminders once it signs out.
      if (pushPrefs().on) await disablePush().catch(() => {});
      // supabase-js reports a failed sign-out (no network) as { error } and
      // KEEPS the session — wiping the cache in that state would leave the
      // only copy of the farm in memory. Fall back to a local sign-out when
      // offline (the user just confirmed above); otherwise stop and say so.
      const { error } = await signOut();
      if (error) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          await signOutLocal();
        } else {
          toast("Couldn't sign out", { detail: "Check your connection and try again." });
          return;
        }
      }
      // Wipe the local farm cache + owner stamp so the next account that
      // signs in on this browser starts clean instead of inheriting this
      // user's farm. (Cloud copy is already saved by the flush above.)
      clearFarm();
      // Drop any push that DIDN'T flush (e.g. signed out while offline) so
      // it can't drain into the next account's row on reconnect.
      resetSync();
      resetEntitlement(); // Phase 8.2 — same hygiene as resetSync (see entitlements.js)
    } catch (e) {
      console.warn("[auth] sign-out error:", e);
      toast("Couldn't sign out", { detail: "Check your connection and try again." });
    }
    // onAuthChange SIGNED_OUT will flip phase to "signedout".
  }, []);

  // "Can't reach your farm" screen: leave this device without touching any
  // farm data (there is nothing of this user's here to keep).
  const handleUnreachableSignOut = useCallback(async () => {
    const { error } = await signOut().catch((e) => ({ error: e }));
    if (error) { try { await signOutLocal(); } catch (e) { /* ignore */ } }
    resetSync();
    resetEntitlement();
    reconciledFor.current = null;
    setPhase("signedout");
  }, []);

  // Settings → Delete account succeeded: the cloud rows and the login are
  // gone. Drop everything this device still holds (queued pushes included,
  // they must not re-create a farm row), end the session locally, and say so.
  const handleAccountDeleted = useCallback(async () => {
    resetSync();
    try { clearFarm(); } catch (e) { /* ignore */ }
    resetEntitlement();
    // The server rows are gone (cascade); drop this device's browser
    // subscription + "reminders on" flag too, or the next account here shows
    // reminders as on with no server row behind them.
    if (pushPrefs().on) { try { await disablePush(); } catch (e) { /* ignore */ } }
    reconciledFor.current = null;
    setCloudData(null);
    setAuthNotice("Your account and your farm have been deleted. Thanks for growing with MyTerra.");
    try { await signOutLocal(); } catch (e) { /* session already invalid */ }
    setPhase("signedout");
  }, []);

  if (phase === "checking" || phase === "reconciling") {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:F.body,flexDirection:"column",gap:14}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,color:C.green,fontFamily:F.head,fontSize:22,fontWeight:800}}>
          <Leaf size={22} strokeWidth={2}/> MyTerra
        </div>
        <div style={{fontSize:13,color:C.t2}}>{phase === "reconciling" ? "Loading your farm…" : "…"}</div>
      </div>
    );
  }

  if (phase === "unreachable") {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:F.body,padding:24}}>
        <div role="alert" style={{background:C.card,borderRadius:C.r,padding:28,maxWidth:420,boxShadow:C.shL,textAlign:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,color:C.green,fontFamily:F.head,fontSize:22,fontWeight:800,marginBottom:12}}>
            <Leaf size={22} strokeWidth={2}/> MyTerra
          </div>
          <h2 style={{fontFamily:F.head,fontSize:19,margin:"0 0 8px"}}>Can't reach your farm right now</h2>
          <p style={{color:C.t2,fontSize:14,margin:"0 0 18px",lineHeight:1.5}}>
            Your farm is saved in the cloud, but this device can't connect to it at the moment. Check your connection and try again — nothing has been changed.
          </p>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <button type="button" onClick={() => { reconcileAndReady(); }} style={{padding:"10px 20px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:F.body}}>
              Try again
            </button>
            <button type="button" onClick={handleUnreachableSignOut} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.bdr}`,background:C.card,color:C.text,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:F.body}}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "recovery") {
    return <AuthScreen initialMode="reset" onPasswordUpdated={finishRecovery}/>;
  }

  if (phase === "demo") {
    return <AppInner key={"demo-" + sessionKey} cloudData={null} allowLocal={true} seedCloud={false} demo onExitDemo={exitDemo} onDemoSignup={demoSignup} onDemoSignin={demoSignin} onSignOut={null} onAccountDeleted={null}/>;
  }

  if (phase === "signedout") {
    return <AuthScreen key={authMode || "default"} initialMode={authMode} initialNotice={authNotice} onTryDemo={startDemo}/>;
  }

  // ready
  return <AppInner key={sessionKey} cloudData={cloudData} allowLocal={allowLocal} seedCloud={seedCloud} onSignOut={isSupabaseConfigured ? handleSignOut : null} onAccountDeleted={isSupabaseConfigured ? handleAccountDeleted : null}/>;
}

export default function App() {
  return <ErrorBoundary><AuthGate/></ErrorBoundary>;
}
