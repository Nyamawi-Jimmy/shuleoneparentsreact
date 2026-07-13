// ─── In-browser terminal (interactive lessons item 4) ─────────────────────────
//
// A small POSIX-flavoured shell emulator for the Git-adjacent content: a
// virtual filesystem plus a simulated git. Pure JS with zero DOM dependencies —
// the Terminal component renders it, and it unit-tests headlessly in node.
// This is deliberately an EMULATOR, not a sandboxable bash: the command set is
// exactly what the curriculum teaches (files, folders, redirection, git
// init/add/commit/log/status/branch/switch/checkout/remote/push), and
// everything lives in memory.
//
// L4 (Terminal & Git quest) additions — all additive:
//   · branches are real enough to teach: create, list, switch (history stays
//     linear — divergence/merge is beyond this emulator and the intro content)
//   · .gitignore at the repo root is honoured by `status` and `git add .`
//     (comments, blank lines, `*.ext`, `dir/`, exact names)
//   · remotes: `git remote add`, `git remote -v`, and a simulated `git push`
//     so the GitHub lesson's blocks run end-to-end without a network.

const HOME = ['home', 'learner']

function dir(children = {}) { return { type: 'dir', children } }
function file(content = '') { return { type: 'file', content } }

function tokenize(line) {
  // Respects "double" and 'single' quotes: git commit -m "first commit".
  const out = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m
  while ((m = re.exec(line)) !== null) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

export function createShell() {
  const root = dir({
    home: dir({
      learner: dir({
        projects: dir({}),
        'notes.txt': file('Welcome to the ShuleOne terminal.\nTry: ls, cd projects, git init\n'),
      }),
    }),
  })
  let cwd = [...HOME]
  // One simulated repo at a time — plenty for the intro content.
  // { root, staged:Set<relPath>, committed:Map<relPath,content>, commits:[{msg,files,when,branch}],
  //   branch, branches:Set<name>, remotes:Map<name,url>, pushedCount:int }
  let repo = null

  const nodeAt = (parts) => {
    let n = root
    for (const p of parts) {
      if (!n || n.type !== 'dir' || !n.children[p]) return null
      n = n.children[p]
    }
    return n
  }

  function resolve(pathStr) {
    // → array of parts, or null on invalid traversal. Does NOT require existence.
    let parts = pathStr.startsWith('/') ? [] : pathStr.startsWith('~') ? [...HOME] : [...cwd]
    const raw = pathStr.replace(/^~\/?/, '').split('/').filter(Boolean)
    for (const seg of raw) {
      if (seg === '.') continue
      if (seg === '..') { if (parts.length) parts.pop(); continue }
      parts.push(seg)
    }
    return parts
  }

  const pathStrOf = (parts) => `/${parts.join('/')}`
  const inRepo = (parts) => repo && pathStrOf(parts).startsWith(pathStrOf(repo.root))
  const relToRepo = (parts) => parts.slice(repo.root.length).join('/')

  function listFilesUnder(parts, prefix = '') {
    // All files (recursively) under a directory, as repo-relative-ish paths.
    const n = nodeAt(parts)
    if (!n || n.type !== 'dir') return []
    const out = []
    for (const [name, child] of Object.entries(n.children)) {
      const p = prefix ? `${prefix}/${name}` : name
      if (child.type === 'file') out.push(p)
      else out.push(...listFilesUnder([...parts, name], p))
    }
    return out
  }

  function writeFile(parts, content, append) {
    const parent = nodeAt(parts.slice(0, -1))
    const name = parts[parts.length - 1]
    if (!parent || parent.type !== 'dir') return `bash: ${name}: No such file or directory`
    const existing = parent.children[name]
    if (existing && existing.type === 'dir') return `bash: ${name}: Is a directory`
    if (existing && append) existing.content += content
    else parent.children[name] = file(content)
    return null
  }

  // ---- git simulation --------------------------------------------------------

  // Read .gitignore at the repo root → predicate over repo-relative paths.
  // Supported (the exact subset the .gitignore lesson teaches): blank lines,
  // '#' comments, '*.ext' suffix patterns, 'dir/' folder patterns, exact names
  // (matched against the basename or the full relative path). The .gitignore
  // file itself is never ignored.
  function ignoredBy() {
    if (!repo) return () => false
    const gi = nodeAt([...repo.root, '.gitignore'])
    if (!gi || gi.type !== 'file') return () => false
    const rules = gi.content.split('\n').map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
    if (!rules.length) return () => false
    return (rel) => {
      if (rel === '.gitignore') return false
      const base = rel.split('/').pop()
      return rules.some((r) => {
        if (r.startsWith('*.')) return base.endsWith(r.slice(1))
        if (r.endsWith('/')) return rel === r.slice(0, -1) || rel.startsWith(r) || rel.split('/').includes(r.slice(0, -1))
        return base === r || rel === r
      })
    }
  }

  function git(args) {
    const sub = args[0]
    if (!sub) return ['usage: git <init|status|add|commit|log|branch|switch|checkout|remote|push>']
    if (sub === 'init') {
      repo = { root: [...cwd], staged: new Set(), committed: new Map(), commits: [],
               branch: 'main', branches: new Set(['main']), remotes: new Map(), pushedCount: 0 }
      return [`Initialized empty Git repository in ${pathStrOf(cwd)}/.git/`]
    }
    if (!repo || !inRepo(cwd)) return ['fatal: not a git repository (or any of the parent directories): .git']
    if (sub === 'status') {
      const ignored = ignoredBy()
      const all = listFilesUnder(repo.root)
      const staged = [...repo.staged].filter((f) => all.includes(f))
      const untracked = all.filter((f) => !repo.staged.has(f) && !repo.committed.has(f) && !ignored(f))
      const modified = all.filter((f) => repo.committed.has(f) && !repo.staged.has(f)
          && repo.committed.get(f) !== (nodeAt([...repo.root, ...f.split('/')])?.content ?? ''))
      const out = [`On branch ${repo.branch}`]
      if (repo.commits.length === 0) out.push('', 'No commits yet')
      if (staged.length) {
        out.push('', 'Changes to be committed:')
        staged.forEach((f) => out.push(`\tnew file:   ${f}`))
      }
      if (modified.length) {
        out.push('', 'Changes not staged for commit:')
        modified.forEach((f) => out.push(`\tmodified:   ${f}`))
      }
      if (untracked.length) {
        out.push('', 'Untracked files:')
        untracked.forEach((f) => out.push(`\t${f}`))
      }
      if (!staged.length && !untracked.length && !modified.length) {
        out.push('nothing to commit, working tree clean')
      }
      return out
    }
    if (sub === 'add') {
      const target = args[1]
      if (!target) return ['Nothing specified, nothing added.']
      const ignored = ignoredBy()
      const all = listFilesUnder(repo.root)
      if (target === '.' || target === '-A' || target === '--all') {
        all.forEach((f) => { if (!ignored(f)) repo.staged.add(f) })
        return []
      }
      const parts = resolve(target)
      if (!nodeAt(parts)) return [`fatal: pathspec '${target}' did not match any files`]
      const n = nodeAt(parts)
      if (n.type === 'file' && ignored(relToRepo(parts))) {
        return ['The following paths are ignored by one of your .gitignore files:',
                relToRepo(parts),
                "hint: Use -f if you really want to add them (this terminal doesn't)."]
      }
      if (n.type === 'dir') listFilesUnder(parts, relToRepo(parts)).forEach((f) => { if (!ignored(f)) repo.staged.add(f) })
      else repo.staged.add(relToRepo(parts))
      return []
    }
    if (sub === 'commit') {
      const mIdx = args.indexOf('-m')
      const msg = mIdx >= 0 ? args[mIdx + 1] : null
      if (!msg) return ['error: switch `-m` requires a value (try: git commit -m "your message")']
      if (repo.staged.size === 0) return ['nothing to commit (use "git add" to stage files)']
      const files = [...repo.staged]
      files.forEach((f) => {
        const n = nodeAt([...repo.root, ...f.split('/')])
        repo.committed.set(f, n ? n.content : '')
      })
      repo.commits.push({ msg, files, when: new Date(), branch: repo.branch })
      repo.staged.clear()
      return [`[${repo.branch} ${repo.commits.length === 1 ? '(root-commit) ' : ''}${hash()}] ${msg}`,
              ` ${files.length} file${files.length === 1 ? '' : 's'} changed`]
    }
    if (sub === 'log') {
      if (repo.commits.length === 0) return [`fatal: your current branch '${repo.branch}' does not have any commits yet`]
      const out = []
      ;[...repo.commits].reverse().forEach((c) => {
        out.push(`commit ${hash()}${out.length === 0 ? ` (HEAD -> ${repo.branch})` : ''}`)
        out.push('Author: learner <learner@shuleone.co.ke>')
        out.push(`Date:   ${c.when.toString().slice(0, 24)}`)
        out.push('', `    ${c.msg}`, '')
      })
      return out
    }
    if (sub === 'branch') {
      if (!args[1]) {
        return [...repo.branches].sort().map((b) => (b === repo.branch ? `* ${b}` : `  ${b}`))
      }
      const name = args[1]
      if (repo.branches.has(name)) return [`fatal: a branch named '${name}' already exists`]
      repo.branches.add(name)
      return []
    }
    if (sub === 'switch' || sub === 'checkout') {
      // switch -c <name> / checkout -b <name> → create AND move. History stays
      // linear in this emulator (no divergence/merge) — plenty for the intro.
      const create = args[1] === '-c' || args[1] === '-b'
      const name = create ? args[2] : args[1]
      if (!name) return [`fatal: missing branch name (try: git ${sub} ${create ? (sub === 'switch' ? '-c' : '-b') + ' ' : ''}<name>)`]
      if (create) {
        if (repo.branches.has(name)) return [`fatal: a branch named '${name}' already exists`]
        repo.branches.add(name)
        repo.branch = name
        return [`Switched to a new branch '${name}'`]
      }
      if (!repo.branches.has(name)) return [`fatal: invalid reference: ${name}`]
      if (repo.branch === name) return [`Already on '${name}'`]
      repo.branch = name
      return [`Switched to branch '${name}'`]
    }
    if (sub === 'remote') {
      if (args[1] === 'add') {
        const [, , name, url] = args
        if (!name || !url) return ['usage: git remote add <name> <url>']
        if (repo.remotes.has(name)) return [`error: remote ${name} already exists.`]
        repo.remotes.set(name, url)
        return []
      }
      if (!args[1] || args[1] === '-v') {
        const rows = []
        repo.remotes.forEach((url, name) => {
          if (args[1] === '-v') rows.push(`${name}\t${url} (fetch)`, `${name}\t${url} (push)`)
          else rows.push(name)
        })
        return rows
      }
      return ['usage: git remote [-v] | git remote add <name> <url>']
    }
    if (sub === 'push') {
      // Simulated: no network — the point is the ritual and the output shape.
      const name = args[1] && !args[1].startsWith('-') ? args[1]
        : args[1] === '-u' ? args[2] : 'origin'
      const url = repo.remotes.get(name || 'origin')
      if (!url) return [`fatal: '${name || 'origin'}' does not appear to be a git repository`,
                        "hint: add one first: git remote add origin <url>"]
      if (repo.commits.length === 0) return [`error: src refspec ${repo.branch} does not match any`,
                                             'hint: make a commit first']
      if (repo.pushedCount >= repo.commits.length) return ['Everything up-to-date']
      const fresh = repo.commits.length - repo.pushedCount
      const first = repo.pushedCount === 0
      repo.pushedCount = repo.commits.length
      return [`Enumerating objects: ${fresh * 3}, done.`,
              `Writing objects: 100% (${fresh * 3}/${fresh * 3}), done.`,
              `To ${url}`,
              first ? ` * [new branch]      ${repo.branch} -> ${repo.branch}`
                    : `   ${hash()}..${hash()}  ${repo.branch} -> ${repo.branch}`]
    }
    return [`git: '${sub}' is not a git command this terminal teaches. Try: init, status, add, commit, log, branch, switch, checkout, remote, push`]
  }

  const hash = () => Math.random().toString(16).slice(2, 9)

  // ---- the shell -------------------------------------------------------------
  function run(line) {
    const trimmed = String(line || '').replace(/^\s*\$\s?/, '').trim() // tolerate pasted '$ ' prompts
    if (!trimmed) return []
    const args = tokenize(trimmed)
    const cmd = args.shift()

    switch (cmd) {
      case 'pwd': return [pathStrOf(cwd)]
      case 'whoami': return ['learner']
      case 'date': return [new Date().toString()]
      case 'clear': return ['\u0000CLEAR']
      case 'help': return ['Commands: pwd ls cd mkdir touch cat echo rm cp mv clear whoami date help',
                           'Git:      git init | status | add | commit -m "msg" | log | branch',
                           '          git switch [-c] | checkout [-b] | remote add <name> <url> | remote -v | push',
                           'Files:    echo "text" > file (write) · echo "text" >> file (append) · .gitignore is honoured']
      case 'ls': {
        const parts = args[0] && !args[0].startsWith('-') ? resolve(args[0]) : cwd
        const n = nodeAt(parts)
        if (!n) return [`ls: cannot access '${args[0]}': No such file or directory`]
        if (n.type === 'file') return [parts[parts.length - 1]]
        const names = Object.keys(n.children).sort()
        return names.length ? [names.map((k) => (n.children[k].type === 'dir' ? `${k}/` : k)).join('  ')] : []
      }
      case 'cd': {
        const parts = resolve(args[0] || '~')
        const n = nodeAt(parts)
        if (!n) return [`bash: cd: ${args[0]}: No such file or directory`]
        if (n.type !== 'dir') return [`bash: cd: ${args[0]}: Not a directory`]
        cwd = parts
        return []
      }
      case 'mkdir': {
        if (!args.length) return ['mkdir: missing operand']
        const out = []
        for (const a of args.filter((x) => !x.startsWith('-'))) {
          const parts = resolve(a)
          const parent = nodeAt(parts.slice(0, -1))
          if (!parent || parent.type !== 'dir') { out.push(`mkdir: cannot create directory '${a}': No such file or directory`); continue }
          if (parent.children[parts[parts.length - 1]]) { out.push(`mkdir: cannot create directory '${a}': File exists`); continue }
          parent.children[parts[parts.length - 1]] = dir()
        }
        return out
      }
      case 'touch': {
        if (!args.length) return ['touch: missing file operand']
        const out = []
        for (const a of args) {
          const err = nodeAt(resolve(a)) ? null : writeFile(resolve(a), '', false)
          if (err) out.push(err.replace('bash:', 'touch: cannot touch'))
        }
        return out
      }
      case 'cat': {
        if (!args[0]) return ['cat: missing file operand']
        const n = nodeAt(resolve(args[0]))
        if (!n) return [`cat: ${args[0]}: No such file or directory`]
        if (n.type === 'dir') return [`cat: ${args[0]}: Is a directory`]
        return n.content ? n.content.replace(/\n$/, '').split('\n') : []
      }
      case 'echo': {
        const gt = args.indexOf('>')
        const gtgt = args.indexOf('>>')
        const cut = gt >= 0 ? gt : gtgt
        if (cut >= 0) {
          const target = args[cut + 1]
          if (!target) return ['bash: syntax error near unexpected token `newline\'']
          const text = `${args.slice(0, cut).join(' ')}\n`
          const err = writeFile(resolve(target), text, gtgt >= 0)
          return err ? [err] : []
        }
        return [args.join(' ')]
      }
      case 'rm': {
        const flags = args.filter((a) => a.startsWith('-')).join('')
        const targets = args.filter((a) => !a.startsWith('-'))
        if (!targets.length) return ['rm: missing operand']
        const out = []
        for (const a of targets) {
          const parts = resolve(a)
          const parent = nodeAt(parts.slice(0, -1))
          const name = parts[parts.length - 1]
          const n = parent?.children?.[name]
          if (!n) { out.push(`rm: cannot remove '${a}': No such file or directory`); continue }
          if (n.type === 'dir' && !flags.includes('r')) { out.push(`rm: cannot remove '${a}': Is a directory`); continue }
          delete parent.children[name]
        }
        return out
      }
      case 'cp':
      case 'mv': {
        const [srcA, dstA] = args.filter((a) => !a.startsWith('-'))
        if (!srcA || !dstA) return [`${cmd}: missing file operand`]
        const src = resolve(srcA)
        const n = nodeAt(src)
        if (!n) return [`${cmd}: cannot stat '${srcA}': No such file or directory`]
        let dst = resolve(dstA)
        const dstNode = nodeAt(dst)
        if (dstNode && dstNode.type === 'dir') dst = [...dst, src[src.length - 1]]
        const parent = nodeAt(dst.slice(0, -1))
        if (!parent || parent.type !== 'dir') return [`${cmd}: cannot create '${dstA}': No such file or directory`]
        parent.children[dst[dst.length - 1]] = JSON.parse(JSON.stringify(n))
        if (cmd === 'mv') {
          const sp = nodeAt(src.slice(0, -1))
          delete sp.children[src[src.length - 1]]
        }
        return []
      }
      case 'git': return git(args)
      default:
        return [`bash: ${cmd}: command not found (type 'help' for what this terminal knows)`]
    }
  }

  function prompt() {
    const inHome = pathStrOf(cwd).startsWith(pathStrOf(HOME))
    const shown = inHome ? `~${pathStrOf(cwd).slice(pathStrOf(HOME).length)}` : pathStrOf(cwd)
    const branch = repo && inRepo(cwd) ? ` (${repo.branch})` : ''
    return `learner@shuleone:${shown}${branch}$`
  }

  return { run, prompt }
}
