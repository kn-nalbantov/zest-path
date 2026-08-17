import { useState } from 'react'
import StartScreen from './screens/StartScreen'
import PathScreen from './screens/PathScreen'
import LessonScreen from './screens/LessonScreen'
import './styles/shared.css'
import './App.css'

const PLACEHOLDER_TABS = new Set(['ai', 'social'])

export default function App() {
  const [tab, setTab] = useState('home')
  const [lessonSlug, setLessonSlug] = useState(null)

  const handleTabChange = (next) => {
    if (PLACEHOLDER_TABS.has(next)) return
    setLessonSlug(null)
    setTab(next)
  }

  if (lessonSlug) {
    return (
      <div className="app">
        <LessonScreen
          skillSlug={lessonSlug}
          onExit={() => setLessonSlug(null)}
          onComplete={() => {
            setLessonSlug(null)
            setTab('path')
          }}
        />
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'path' ? (
        <PathScreen
          activeTab={tab}
          onTabChange={handleTabChange}
          onStartLesson={setLessonSlug}
        />
      ) : (
        <StartScreen activeTab={tab} onTabChange={handleTabChange} />
      )}
    </div>
  )
}
