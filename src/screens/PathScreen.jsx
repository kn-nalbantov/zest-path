import { useEffect, useState } from 'react'
import PhoneShell from '../components/PhoneShell'
import BottomNav from '../components/BottomNav'
import {
  CrownIcon,
  FlameIcon,
  LockIcon,
  PlayIcon,
  StarIcon,
} from '../components/Icons'
import { fetchSkills } from '../api/client'
import './PathScreen.css'

function NodeIcon({ status, icon }) {
  if (status === 'complete' || icon === 'crown') return <CrownIcon size={30} />
  if (status === 'current' || icon === 'flame') return <FlameIcon size={28} />
  return <LockIcon size={26} />
}

export default function PathScreen({ activeTab, onTabChange, onStartLesson }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchSkills()
        if (!cancelled) setSkills(data.skills)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load path')
          setSkills([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const currentSkill = skills.find((skill) => skill.status === 'current') ?? skills[0]

  return (
    <PhoneShell>
      <main className="screen path-screen">
        <header className="screen-header">
          <div className="screen-header__identity">
            <div className="avatar" aria-hidden="true">
              <span>ZP</span>
            </div>
            <h1 className="brand">ZestPath</h1>
          </div>

          <div className="screen-header__stats">
            <div className="chip chip--xp-outline" title="Experience points">
              <StarIcon size={16} />
              <span>525 XP</span>
            </div>
          </div>
        </header>

        {loading && <p className="path-status">Loading your cooking path…</p>}
        {error && !loading && (
          <p className="path-status path-status--error">
            {error}. Is the API running on port 4000?
          </p>
        )}

        {!loading && !error && (
          <ol className="skill-path" aria-label="Cooking skill path">
            {skills.map((node, index) => {
              const next = skills[index + 1]
              const connectorClass =
                node.status === 'complete'
                  ? 'skill-path__connector is-complete'
                  : 'skill-path__connector is-locked'
              const canOpen = node.status !== 'locked'

              return (
                <li key={node.id} className={`skill-node skill-node--${node.status}`}>
                  <div className="skill-node__rail">
                    <button
                      type="button"
                      className="skill-node__bubble"
                      aria-current={node.status === 'current' ? 'step' : undefined}
                      aria-label={`${node.title}, ${node.status}`}
                      disabled={!canOpen}
                      onClick={() => canOpen && onStartLesson?.(node.slug)}
                    >
                      <span className="skill-node__icon">
                        <NodeIcon status={node.status} icon={node.icon} />
                      </span>
                      {node.status === 'current' && (
                        <span className="skill-node__pulse" aria-hidden="true" />
                      )}
                    </button>

                    {next && <div className={connectorClass} aria-hidden="true" />}
                  </div>

                  <div className="skill-node__content">
                    {node.tip && node.status === 'current' && (
                      <div className="speech-bubble" role="note">
                        <p>{node.tip}</p>
                      </div>
                    )}

                    <h2 className="skill-node__title">{node.title}</h2>
                    <p className="skill-node__meta">{node.taskCount} tasks</p>

                    {typeof node.progress === 'number' && node.status !== 'locked' && (
                      <div
                        className="progress skill-node__progress"
                        role="progressbar"
                        aria-valuenow={node.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${node.title} progress`}
                      >
                        <div
                          className="progress__fill"
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        <div className="path-screen__cta">
          <button
            type="button"
            className="btn btn--primary btn--continue"
            disabled={!currentSkill || currentSkill.status === 'locked'}
            onClick={() => currentSkill && onStartLesson?.(currentSkill.slug)}
          >
            Continue Path
            <PlayIcon />
          </button>
        </div>
      </main>

      <BottomNav active={activeTab} onChange={onTabChange} />
    </PhoneShell>
  )
}
