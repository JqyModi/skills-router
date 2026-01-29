import { useState, useEffect } from 'react'
import './App.css'

interface Skill {
  path: string
  // skillMdPath: string // Implicit in path + /SKILL.md usually, but scanner returns skillMdPath
  skillMdPath: string
  metadata: {
    name: string
    description: string
    parameters?: any
    scripts?: string[]
  }
  content?: string
  error?: string
}

function App() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, FLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  // 'view' | 'edit' | 'run'
  const [mode, setMode] = useState<'view' | 'edit' | 'run'>('view')

  // Editor State
  const [editContent, setEditContent] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  // Runner State
  const [runArgs, setRunArgs] = useState<Record<string, string>>({})
  const [runOutput, setRunOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  // Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    loadSkills()
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    }
  }, [])

  useEffect(() => {
    if (selectedSkill) {
      setEditContent(selectedSkill.content || '')
      setMode('view')
      setRunOutput('')
      setRunArgs({})
    }
  }, [selectedSkill])

  const loadSkills = async () => {
    try {
      FLoading(true)
      const result = await window.ipcRenderer.invoke('get-skills')
      console.log('Skills loaded:', result)
      setSkills(result || [])
    } catch (e) {
      console.error(e)
    } finally {
      FLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedSkill) return
    setSaveStatus('Saving...')
    try {
      const res = await window.ipcRenderer.invoke('save-skill', selectedSkill.skillMdPath, editContent)
      if (res.success) {
        setSaveStatus('Saved!')
        // Refresh local state content
        setSelectedSkill({ ...selectedSkill, content: editContent })
        // Reload list to update metadata if parsed differently
        loadSkills()
      } else {
        setSaveStatus('Error: ' + res.error)
      }
    } catch (e: any) {
      setSaveStatus('Error: ' + e.message)
    }
  }

  const handleRun = async () => {
    if (!selectedSkill) return
    setIsRunning(true)
    setRunOutput('')

    const scriptName = selectedSkill.metadata.scripts?.[0] || ''

    // For prompt-only skills, just show the prompt content stripped of frontmatter? 
    // Or actually invoking the tool via scanner? 
    // For MVP we just run the executor if script exists.

    if (!scriptName) {
      setRunOutput("This is a prompt-only skill (no script). \n\n" + editContent.replace(/^---[\s\S]*?---/, '').trim())
      setIsRunning(false)
      return
    }

    try {
      const res = await window.ipcRenderer.invoke('run-skill', selectedSkill.path, scriptName, runArgs)
      if (res.success) {
        setRunOutput(res.output)
      } else {
        setRunOutput('Error: ' + res.error)
      }
    } catch (e: any) {
      setRunOutput('System Error: ' + e.message)
    } finally {
      setIsRunning(false)
    }
  }

  const handleCreateSkill = async () => {
    if (!newSkillName) return;
    try {
      const res = await window.ipcRenderer.invoke('create-skill', newSkillName);
      if (res.success) {
        setShowCreateDialog(false);
        setNewSkillName('');
        loadSkills();
      } else {
        alert('Error creating skill: ' + res.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  const handleDeleteSkill = async () => {
    if (!selectedSkill) return;
    if (!confirm(`Are you sure you want to delete ${selectedSkill.metadata.name}? This cannot be undone.`)) return;

    try {
      const res = await window.ipcRenderer.invoke('delete-skill', selectedSkill.path);
      if (res.success) {
        setSelectedSkill(null);
        loadSkills();
      } else {
        alert('Error deleting skill: ' + res.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Skills Router</h1>
        <div className="header-actions">
          <button onClick={toggleTheme} className="theme-toggle" title="Toggle Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowCreateDialog(true)} className="create-btn">+ New Skill</button>
          <button onClick={loadSkills} className="refresh-btn">Refresh</button>
        </div>
      </header>

      <div className="content">
        <div className="sidebar">
          {loading && <div className="loading">Loading...</div>}
          {!loading && skills.length === 0 && <div className="empty">No skills found. Check your skills directory.</div>}

          <div className="skill-list">
            {skills.map((skill, idx) => (
              <div
                key={idx}
                className={`nav-item ${selectedSkill === skill ? 'active' : ''}`}
                onClick={() => setSelectedSkill(skill)}
              >
                <div className="nav-title">{skill.metadata.name}</div>
                <div className="nav-desc">{skill.metadata.description.substring(0, 50)}...</div>
              </div>
            ))}
          </div>
        </div>

        <div className="main-area">
          {!selectedSkill ? (
            <div className="placeholder">Select a skill to view details</div>
          ) : (
            <div className="workspace">
              <div className="tabs-header">
                <div className="tabs">
                  <button className={mode === 'view' ? 'active' : ''} onClick={() => setMode('view')}>Overview</button>
                  <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Editor</button>
                  <button className={mode === 'run' ? 'active' : ''} onClick={() => setMode('run')}>Simulator</button>
                </div>
                <button onClick={handleDeleteSkill} className="delete-btn" title="Delete Skill">
                  🗑️
                </button>
              </div>

              <div className="tab-content">
                {mode === 'view' && (
                  <div className="view-pane">
                    <h2>{selectedSkill.metadata.name}</h2>
                    <p>{selectedSkill.metadata.description}</p>
                    <h3>Parameters</h3>
                    <pre>{JSON.stringify(selectedSkill.metadata.parameters, null, 2)}</pre>
                    <h3>Scripts</h3>
                    <pre>{JSON.stringify(selectedSkill.metadata.scripts, null, 2)}</pre>
                    <div className="path-info">Path: {selectedSkill.path}</div>
                  </div>
                )}

                {mode === 'edit' && (
                  <div className="edit-pane">
                    <div className="toolbar">
                      <button onClick={handleSave} disabled={saveStatus === 'Saving...'}>Save Changes</button>
                      <span className="status">{saveStatus}</span>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="editor"
                    />
                  </div>
                )}

                {mode === 'run' && (
                  <div className="run-pane">
                    <div className="config-area">
                      <h3>Arguments</h3>
                      {Object.keys(selectedSkill.metadata.parameters || {}).length === 0 ? (
                        <p>No parameters defined.</p>
                      ) : (
                        Object.keys(selectedSkill.metadata.parameters || {}).map(key => (
                          <div key={key} className="field">
                            <label>{key}</label>
                            <input
                              type="text"
                              value={runArgs[key] || ''}
                              onChange={e => setRunArgs({ ...runArgs, [key]: e.target.value })}
                              placeholder={`Enter ${key}...`}
                            />
                          </div>
                        ))
                      )}
                      <button onClick={handleRun} disabled={isRunning} className="primary-btn">
                        {isRunning ? 'Running...' : 'Execute Skill'}
                      </button>
                    </div>

                    <div className="output-area">
                      <h3>Output</h3>
                      <pre>{runOutput}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Create New Skill</h3>
            <input
              autoFocus
              placeholder="Skill Name (e.g. my-new-skill)"
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateSkill()}
            />
            <div className="dialog-actions">
              <button onClick={() => setShowCreateDialog(false)}>Cancel</button>
              <button onClick={handleCreateSkill} className="primary-btn">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
