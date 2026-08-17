import { useState } from 'react'
import StartScreen from './screens/StartScreen'
import PathScreen from './screens/PathScreen'
import './styles/shared.css'
import './App.css'

const PLACEHOLDER_TABS = new Set(['ai', 'social'])

export default function App() {
  const [tab, setTab] = useState('home')

  const handleTabChange = (next) => {
    if (PLACEHOLDER_TABS.has(next)) return
    setTab(next)
  }

  return (
    <div className="app">
      {tab === 'path' ? (
        <PathScreen activeTab={tab} onTabChange={handleTabChange} />
      ) : (
        <StartScreen activeTab={tab} onTabChange={handleTabChange} />
      )}
    </div>
  )
}
