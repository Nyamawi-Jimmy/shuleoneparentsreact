// Playground runner — the web Sandbox's languages, ACTUALLY RUNNING on the
// phone, in the app's own stacked mobile design (editor on top, output below,
// instead of the web's side-by-side panes):
//
//   PYTHON  real Python via Pyodide (same CDN engine as the web)
//   JS      sandboxed eval with console capture
//   SQL     real SQLite via sql.js, seeded with the same school dataset,
//           persisting across runs + Reset DB
//   WEB     HTML/CSS/JS pane chips composed into a LIVE preview
//   BASH    the same emulated shell + git as the web (ported 1:1)
//   SCRATCH/BLOCKS  the ShuleOne Scratch editor in a full WebView
//   MICROBIT        MakeCode in a full WebView
//   ARDUINO/ROBOT   editor + how-it-runs note (like the web)
//
// Python/JS/SQL execute inside ONE hidden WebView that lazy-loads each engine
// on first use — mirroring the web's shared-runtime pattern.

import React, { useCallback, useRef, useState } from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C, useSchemeTick } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createShell } = require('../codingShell');

// ── Language catalogue (labels match the web PlaygroundTab) ──────
const KINDS: Record<string, { icon: string; label: string; language: string; c1: string; c2: string }> = {
  PYTHON: { icon: '🐍', label: 'Python', language: 'Python', c1: '#1fc99a', c2: '#0f9e8e' },
  JS: { icon: '🟨', label: 'JavaScript', language: 'JavaScript', c1: '#f4a716', c2: '#d97706' },
  SQL: { icon: '🗄️', label: 'SQL', language: 'SQL (SQLite)', c1: '#5b6cff', c2: '#4338ca' },
  BASH: { icon: '💻', label: 'Terminal', language: 'Bash + Git (emulated)', c1: '#475569', c2: '#1e293b' },
  WEB: { icon: '🌐', label: 'Web', language: 'HTML / CSS / JS', c1: '#3a8bff', c2: '#e91e63' },
  SCRATCH: { icon: '🐱', label: 'Scratch', language: 'Shule One Scratch', c1: '#ff8a3d', c2: '#ff5e9c' },
  BLOCKS: { icon: '🧩', label: 'Blocks', language: 'Shule One Scratch', c1: '#ff9a3d', c2: '#ff6aa0' },
  MICROBIT: { icon: '📟', label: 'micro:bit', language: 'MakeCode', c1: '#00b8d4', c2: '#3a8bff' },
  ARDUINO: { icon: '🔌', label: 'Arduino', language: 'Arduino (C++)', c1: '#19b39b', c2: '#1577c2' },
  ROBOT: { icon: '🤖', label: 'Robot', language: 'mBot2', c1: '#e91e63', c2: '#ff8fc0' },
};

// The self-hosted Shule One Scratch editor (matches the web's SCRATCH_LAUNCH_URL).
const SCRATCH_URL = 'https://scratch.shuleone.co.ke/';
const MAKECODE_URL = 'https://makecode.microbit.org/';

// Starter snippets — same as the web Sandbox.
const STARTER: Record<string, string> = {
  PYTHON: `# Write your Python here
name = "coder"
print("Hello,", name + "!")
for i in range(1, 4):
    print("Step", i)`,
  JS: `// Write your JavaScript here
const name = "coder";
console.log("Hello, " + name + "!");
for (let i = 1; i <= 3; i++) {
  console.log("Step", i);
}`,
  SQL: `-- A sample school database is loaded: students, courses, enrollments.
SELECT s.name, s.county, e.score
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
WHERE c.title = 'Python Foundations'
ORDER BY e.score DESC;`,
  WEB_HTML: `<h1>Hello! 👋</h1>
<p>Edit the HTML, CSS and JS — the preview updates by itself.</p>
<button id="magic">Click me</button>`,
  WEB_CSS: `body { font-family: sans-serif; text-align: center; padding: 2rem; }
h1 { color: #6c4cff; }
button { padding: 8px 18px; border-radius: 10px; border: 0; background: #e91e63; color: #fff; font-weight: 700; }`,
  WEB_JS: `document.getElementById('magic').onclick = () => {
  document.querySelector('h1').textContent = 'You did it! 🎉';
};`,
  ARDUINO: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`,
  ROBOT: `# mBot2 program (mBlock)
# Drive forward, then turn.
forward(speed=50, time=1)
turn_right(angle=90)`,
};

// The same seeded school dataset as the web sqlRuntime.
const SQL_SEED = `
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, form INTEGER, county TEXT);
CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL, level INTEGER);
CREATE TABLE enrollments (student_id INTEGER REFERENCES students(id), course_id INTEGER REFERENCES courses(id), score INTEGER);
INSERT INTO students VALUES
 (1,'Amina Yusuf',3,'Mombasa'),(2,'Brian Otieno',4,'Kisumu'),(3,'Cynthia Wanjiru',3,'Kiambu'),
 (4,'David Kiprop',2,'Uasin Gishu'),(5,'Esther Mwikali',4,'Machakos'),(6,'Felix Njoroge',3,'Nairobi');
INSERT INTO courses VALUES (1,'Python Foundations',2),(2,'Web Development',3),(3,'JavaScript',3),(4,'Databases & SQL',4);
INSERT INTO enrollments VALUES (1,1,78),(1,2,84),(2,1,91),(2,4,88),(3,2,69),(3,3,74),(4,1,55),(5,3,95),(5,4,81),(6,2,62),(6,1,70);
`;

// One hidden engine page: lazy-loads Pyodide / sql.js on first use (the web's
// shared-runtime pattern) and answers over postMessage.
const ENGINE_HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
var RN=function(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));};
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('Could not load the engine — check your connection.'))};document.head.appendChild(s);});}
var pyodide=null,pyLoading=null;
function ensurePy(){if(pyodide)return Promise.resolve(pyodide);if(!pyLoading){pyLoading=(async function(){RN({type:'status',engine:'py',state:'loading'});await loadScript('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');pyodide=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'});RN({type:'status',engine:'py',state:'ready'});return pyodide;})();}return pyLoading;}
async function runPy(id,code){var lines=[];try{var py=await ensurePy();py.setStdout({batched:function(t){lines.push(t);}});py.setStderr({batched:function(t){lines.push(t);}});py.setStdin({stdin:function(){return '';}});await py.runPythonAsync(code);RN({type:'result',id:id,lines:lines.length?lines:['(no output)'],error:false});}catch(e){var msg=String(e&&e.message||e);var tail=msg.indexOf('Traceback')>=0?msg.slice(msg.indexOf('Traceback')):msg;RN({type:'result',id:id,lines:lines.concat([tail]),error:true});}}
function fmt(args){var out=[];for(var i=0;i<args.length;i++){var x=args[i];try{out.push(typeof x==='object'&&x!==null?JSON.stringify(x):String(x));}catch(e){out.push(String(x));}}return out.join(' ');}
function runJs(id,code){var lines=[];var error=false;var o={log:console.log,error:console.error,warn:console.warn};
console.log=function(){lines.push(fmt(arguments));};console.error=function(){lines.push('✗ '+fmt(arguments));};console.warn=function(){lines.push('⚠ '+fmt(arguments));};
try{(new Function(code))();}catch(e){lines.push(String(e));error=true;}
setTimeout(function(){console.log=o.log;console.error=o.error;console.warn=o.warn;RN({type:'result',id:id,lines:lines.length?lines:['(no output)'],error:error});},800);}
var SQLLib=null,db=null,sqlLoading=null;
var SEED=${JSON.stringify(SQL_SEED)};
function ensureSql(){if(SQLLib)return Promise.resolve(SQLLib);if(!sqlLoading){sqlLoading=(async function(){RN({type:'status',engine:'sql',state:'loading'});await loadScript('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js');SQLLib=await initSqlJs({locateFile:function(f){return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/'+f;}});RN({type:'status',engine:'sql',state:'ready'});return SQLLib;})();}return sqlLoading;}
async function runSql(id,code,reset){try{var S=await ensureSql();if(reset||!db){try{if(db)db.close();}catch(e){}db=new S.Database();db.exec(SEED);}
if(reset&&!code){RN({type:'result',id:id,sql:{results:[],changed:0,error:null},reset:true});return;}
var results=db.exec(code)||[];var changed=db.getRowsModified();
RN({type:'result',id:id,sql:{results:results.map(function(r){return {columns:r.columns,values:r.values};}),changed:changed,error:null}});}catch(e){RN({type:'result',id:id,sql:{results:[],changed:0,error:String(e&&e.message||e)}});}}
function handler(ev){try{var m=JSON.parse(ev.data);if(m.type==='py')runPy(m.id,m.code);else if(m.type==='js')runJs(m.id,m.code);else if(m.type==='sql')runSql(m.id,m.code,m.reset);}catch(e){}}
document.addEventListener('message',handler);window.addEventListener('message',handler);
RN({type:'boot'});
</script></body></html>`;

interface SqlOut {
  results: { columns: string[]; values: (string | number | null)[][] }[];
  changed: number;
  error: string | null;
}

export const PlaygroundRunner: React.FC = () => {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind = String(kindParam || 'PYTHON').toUpperCase();
  const k = KINDS[kind] ?? KINDS.PYTHON;
  const insets = useSafeAreaInsets();
  useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)
  const topPad = insets.top > 0 ? insets.top : 24;

  // ── External editors: Scratch / Blocks / MakeCode ─────
  if (kind === 'SCRATCH' || kind === 'BLOCKS' || kind === 'MICROBIT') {
    const url = kind === 'MICROBIT' ? MAKECODE_URL : SCRATCH_URL;
    return <ExternalEditor url={url} k={k} topPad={topPad} />;
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.head, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.headTitleRow}>
            <Text style={styles.headIcon}>{k.icon}</Text>
            <Text style={styles.headTitle} numberOfLines={1}>{k.label}</Text>
          </View>
          <Text style={styles.headSub} numberOfLines={1}>{k.language}</Text>
        </View>
      </View>

      {kind === 'WEB' ? <WebPlayground k={k} />
        : kind === 'BASH' ? <BashPlayground />
        : (kind === 'ARDUINO' || kind === 'ROBOT') ? <NotesEditor kind={kind} k={k} />
        : <EnginePlayground kind={kind} k={k} />}
    </View>
  );
};

// =================================================================
// External editors (Scratch / Blocks / MakeCode) — a full WebView with a
// loading spinner and an honest "open in browser" fallback if the in-app view
// is blocked (some editors reject embedding on certain networks).
// =================================================================
const ExternalEditor: React.FC<{ url: string; k: typeof KINDS[string]; topPad: number }> = ({ url, k, topPad }) => {
  useSchemeTick();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  return (
    <View style={styles.safe}>
      <View style={[styles.head, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headTitleRow}>
          <Text style={styles.headIcon}>{k.icon}</Text>
          <Text style={styles.headTitle} numberOfLines={1}>{k.label}</Text>
        </View>
        <TouchableOpacity style={styles.extBtn} hitSlop={8} onPress={() => Linking.openURL(url)}>
          <Ionicons name="open-outline" size={16} color="#7c5cff" />
        </TouchableOpacity>
      </View>
      {failed ? (
        <View style={styles.webErr}>
          <Text style={{ fontSize: 46 }}>{k.icon}</Text>
          <Text style={styles.webErrTitle}>Couldn’t open {k.label} here</Text>
          <Text style={styles.webErrText}>
            The editor couldn’t load inside the app. Open it in your browser — you’ll stay signed in.
          </Text>
          <TouchableOpacity style={styles.webErrBtn} activeOpacity={0.85} onPress={() => Linking.openURL(url)}>
            <Ionicons name="open-outline" size={15} color="#fff" />
            <Text style={styles.webErrBtnText}>Open in browser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: url }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
            onRenderProcessGone={() => setFailed(true)}
          />
          {loading && (
            <View style={styles.webLoading} pointerEvents="none">
              <ActivityIndicator size="large" color="#7c5cff" />
              <Text style={styles.webLoadingText}>Loading {k.label}…</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// =================================================================
// PYTHON / JS / SQL — editor + Run + output over the hidden engine.
// =================================================================
const EnginePlayground: React.FC<{ kind: string; k: typeof KINDS[string] }> = ({ kind, k }) => {
  const [code, setCode] = useState(STARTER[kind] ?? '');
  const [lines, setLines] = useState<string[] | null>(null);
  const [sqlOut, setSqlOut] = useState<SqlOut | null>(null);
  const [isErr, setIsErr] = useState(false);
  const [running, setRunning] = useState(false);
  const [engineNote, setEngineNote] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);
  const idRef = useRef(0);

  const send = useCallback((msg: object) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  const onMessage = useCallback((ev: { nativeEvent: { data: string } }) => {
    try {
      const m = JSON.parse(ev.nativeEvent.data);
      if (m.type === 'status') {
        setEngineNote(m.state === 'loading'
          ? `Starting ${m.engine === 'py' ? 'Python' : 'the SQL engine'}… (first run loads it)`
          : null);
      } else if (m.type === 'result') {
        setRunning(false);
        setEngineNote(null);
        if (m.sql) {
          setSqlOut(m.sql as SqlOut);
          setIsErr(!!m.sql.error);
          if (m.reset) setLines(['✓ Fresh database — sample tables restored.']);
          else setLines(null);
        } else {
          setLines(Array.isArray(m.lines) ? m.lines : []);
          setIsErr(!!m.error);
          setSqlOut(null);
        }
      }
    } catch { /* ignore malformed */ }
  }, []);

  const run = (reset = false) => {
    if (running) return;
    setRunning(true);
    idRef.current += 1;
    if (kind === 'SQL') send({ type: 'sql', id: idRef.current, code: reset ? '' : code, reset });
    else if (kind === 'JS') send({ type: 'js', id: idRef.current, code });
    else send({ type: 'py', id: idRef.current, code });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Hidden engine */}
      <View style={{ height: 0, opacity: 0 }}>
        <WebView
          ref={webRef}
          source={{ html: ENGINE_HTML, baseUrl: 'https://playground.shuleone.local' }}
          originWhitelist={['*']}
          javaScriptEnabled
          onMessage={onMessage}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Editor card */}
        <View style={styles.editorCard}>
          <View style={styles.editorHead}>
            <Text style={styles.editorHeadText}>{k.icon}</Text>
            <Text style={styles.editorHeadText}>Editor</Text>
            <View style={{ flex: 1 }} />
            {kind === 'SQL' && (
              <TouchableOpacity style={styles.resetBtn} disabled={running} onPress={() => run(true)}>
                <Text style={styles.resetBtnText}>↺ Reset DB</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity activeOpacity={0.85} disabled={running} onPress={() => run(false)}>
              <LinearGradient colors={[k.c1, k.c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.runBtn}>
                <Text style={styles.runBtnText}>{running ? 'Running…' : '▶ Run'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.codeInput}
            multiline
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
            placeholderTextColor="#5b5a7a"
          />
        </View>

        {/* Output */}
        <View style={styles.outCard}>
          <Text style={styles.outHead}>
            {kind === 'SQL' ? '📊 Results · tables: students, courses, enrollments' : '🖥️ Console'}
          </Text>
          {engineNote && <Text style={styles.engineNote}>{engineNote}</Text>}

          {kind === 'SQL' && sqlOut ? (
            <SqlResults out={sqlOut} extra={lines} />
          ) : (
            <Text style={[styles.outText, isErr && { color: '#fda4af' }]}>
              {running && !engineNote ? 'Running…'
                : lines ? lines.join('\n')
                : 'Press ▶ Run — your output appears here.'}
            </Text>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/** SELECT results as scrollable tables; DML shows rows-changed. */
const SqlResults: React.FC<{ out: SqlOut; extra: string[] | null }> = ({ out, extra }) => (
  <View>
    {extra && <Text style={styles.outText}>{extra.join('\n')}</Text>}
    {out.error ? (
      <Text style={[styles.outText, { color: '#fda4af' }]}>{out.error}</Text>
    ) : out.results.length === 0 && !extra ? (
      <Text style={styles.outText}>
        ✓ Done{out.changed ? ` — ${out.changed} row${out.changed === 1 ? '' : 's'} changed` : ' — no rows returned'}.
      </Text>
    ) : (
      out.results.map((r, i) => (
        <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View>
            <View style={styles.sqlRow}>
              {r.columns.map((c, j) => (
                <Text key={j} style={[styles.sqlCell, styles.sqlHeadCell]}>{c}</Text>
              ))}
            </View>
            {r.values.map((row, ri) => (
              <View key={ri} style={[styles.sqlRow, ri % 2 === 1 && { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                {row.map((v, vi) => (
                  <Text key={vi} style={styles.sqlCell}>{v == null ? 'NULL' : String(v)}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      ))
    )}
  </View>
);

// =================================================================
// WEB — HTML/CSS/JS pane chips + LIVE preview.
// =================================================================
const WEB_PANES = [
  { key: 'html', icon: '🧱', label: 'HTML' },
  { key: 'css', icon: '🎨', label: 'CSS' },
  { key: 'js', icon: '⚡', label: 'JS' },
] as const;

function composeWebDoc(html: string, css: string, js: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>
${css || ''}
</style></head><body>
${html || ''}
<script>
${js || ''}
</${'script'}></body></html>`;
}

const WebPlayground: React.FC<{ k: typeof KINDS[string] }> = ({ k }) => {
  const [parts, setParts] = useState({ html: STARTER.WEB_HTML, css: STARTER.WEB_CSS, js: STARTER.WEB_JS });
  const [pane, setPane] = useState<'html' | 'css' | 'js'>('html');
  const [doc, setDoc] = useState(() => composeWebDoc(STARTER.WEB_HTML, STARTER.WEB_CSS, STARTER.WEB_JS));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.editorCard}>
          <View style={styles.editorHead}>
            {WEB_PANES.map((p) => (
              <TouchableOpacity key={p.key} activeOpacity={0.8} onPress={() => setPane(p.key)}
                style={[styles.paneChip, pane === p.key && styles.paneChipOn]}>
                <Text style={styles.paneChipIcon}>{p.icon}</Text>
                <Text style={[styles.paneChipText, pane === p.key && { color: '#fff' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ flex: 1 }} />
            <TouchableOpacity activeOpacity={0.85}
              onPress={() => setDoc(composeWebDoc(parts.html, parts.css, parts.js))}>
              <LinearGradient colors={[k.c1, k.c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.runBtn}>
                <Text style={styles.runBtnText}>▶ Preview</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.codeInput}
            multiline
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect={false}
            value={parts[pane]}
            onChangeText={(t) => setParts((p) => ({ ...p, [pane]: t }))}
          />
        </View>

        <View style={[styles.outCard, { padding: 0, overflow: 'hidden' }]}>
          <Text style={[styles.outHead, { padding: 12, paddingBottom: 8 }]}>👀 Preview</Text>
          <View style={styles.previewBox}>
            <WebView
              source={{ html: doc }}
              originWhitelist={['*']}
              javaScriptEnabled
              style={{ backgroundColor: C.card }}
            />
          </View>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// =================================================================
// BASH — the emulated shell + git, native UI over codingShell.
// =================================================================
const BashPlayground: React.FC = () => {
  // Lazy state init keeps the emulator instance stable without touching refs in render.
  const [sh] = useState<{ run: (l: string) => string[]; prompt: () => string }>(() => createShell());
  const [promptStr, setPromptStr] = useState<string>(() => sh.prompt());

  const [lines, setLines] = useState<{ prompt?: string; text: string }[]>([
    { text: 'ShuleOne terminal — type help for the commands this shell knows.' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const execute = () => {
    const raw = input;
    setInput('');
    const promptNow = sh.prompt();
    const out = sh.run(raw);
    setPromptStr(sh.prompt());
    setLines((prev) => {
      if (out[0] === '\u0000CLEAR') return [];
      return [...prev, { prompt: promptNow, text: raw }, ...out.map((t: string) => ({ text: t }))];
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.body, { flex: 1 }]}>
        <View style={styles.termCard}>
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            {lines.map((l, i) => (
              <Text key={i} style={styles.termLine}>
                {l.prompt ? <Text style={styles.termPrompt}>{l.prompt} </Text> : null}
                {l.text || ' '}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.termInputRow}>
            <Text style={styles.termPrompt} numberOfLines={1}>{promptStr}</Text>
            <TextInput
              style={styles.termInput}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={execute}
              blurOnSubmit={false}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="type a command…"
              placeholderTextColor="#5b5a7a"
              returnKeyType="send"
            />
            <TouchableOpacity hitSlop={8} onPress={execute}>
              <Ionicons name="return-down-back" size={18} color="#a5f3d0" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// =================================================================
// ARDUINO / ROBOT — editor + how-it-runs note (like the web).
// =================================================================
const NotesEditor: React.FC<{ kind: string; k: typeof KINDS[string] }> = ({ kind, k }) => {
  const [code, setCode] = useState(STARTER[kind] ?? '');
  const note = kind === 'ARDUINO'
    ? 'Upload this sketch to your Arduino board from the Arduino IDE to run it.'
    : 'Send this program to your mBot2 from mBlock to run it.';
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.editorCard}>
          <View style={styles.editorHead}>
            <Text style={styles.editorHeadText}>{k.icon} Editor</Text>
          </View>
          <TextInput
            style={styles.codeInput}
            multiline
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
          />
        </View>
        <View style={styles.noteRow}>
          <Text style={styles.noteText}>ℹ️ {note}</Text>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// =================================================================
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.soft },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    alignItems: 'center', justifyContent: 'center',
  },
  headTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headIcon: { fontSize: 15 },
  headTitle: { fontSize: 15.5, fontWeight: '800', color: S.ink, flexShrink: 1 },
  headSub: { fontSize: 11, fontWeight: '700', color: S.inkSoft, marginTop: 1 },
  extBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: S.ring, alignItems: 'center', justifyContent: 'center',
  },

  // External-editor WebView loading + error fallback
  webLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: S.soft,
  },
  webLoadingText: { fontSize: 13, fontWeight: '700', color: S.inkSoft },
  webErr: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 6 },
  webErrTitle: { fontSize: 16, fontWeight: '800', color: S.ink, marginTop: 8 },
  webErrText: { fontSize: 13, fontWeight: '600', color: S.inkSoft, textAlign: 'center', lineHeight: 19 },
  webErrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
    backgroundColor: '#7c5cff', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
  },
  webErrBtnText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },

  body: { padding: 14 },

  editorCard: {
    backgroundColor: '#1e1b3a', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  editorHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  editorHeadText: { color: '#c9c4ee', fontSize: 12, fontWeight: '800' },
  runBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  runBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  resetBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6, marginRight: 4,
  },
  resetBtnText: { color: '#c9c4ee', fontWeight: '800', fontSize: 11 },
  codeInput: {
    minHeight: 220, padding: 14, textAlignVertical: 'top',
    color: '#e8e6ff', fontSize: 13, lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  paneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  paneChipOn: { backgroundColor: '#7c5cff' },
  paneChipIcon: { fontSize: 11 },
  paneChipText: { color: '#c9c4ee', fontWeight: '800', fontSize: 11 },

  outCard: {
    backgroundColor: '#141228', borderRadius: 18, padding: 12, marginTop: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  outHead: { color: S.faint, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  engineNote: { color: '#ffd766', fontSize: 11.5, fontWeight: '700', marginTop: 8 },
  outText: {
    color: '#a5f3d0', fontSize: 12.5, lineHeight: 19, marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  sqlRow: { flexDirection: 'row' },
  sqlCell: {
    minWidth: 92, paddingHorizontal: 8, paddingVertical: 6,
    color: '#e8e6ff', fontSize: 11.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sqlHeadCell: { color: '#ffd766', fontWeight: '700' },

  previewBox: { height: 380, backgroundColor: S.card },

  termCard: {
    flex: 1, backgroundColor: '#141228', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  termLine: {
    color: '#d6d2f2', fontSize: 12, lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  termPrompt: { color: '#a5f3d0', fontWeight: '700' },
  termInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  termInput: {
    flex: 1, color: '#e8e6ff', fontSize: 12.5, padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  noteRow: { backgroundColor: S.warnSoft, borderRadius: 14, padding: 12, marginTop: 12 },
  noteText: { color: S.warnInk, fontSize: 12, fontWeight: '600', lineHeight: 17 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

