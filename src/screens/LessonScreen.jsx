import { useEffect, useMemo, useState } from 'react'
import PhoneShell from '../components/PhoneShell'
import { checkTaskAnswer, fetchSkillTasks } from '../api/client'
import './LessonScreen.css'

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export default function LessonScreen({ skillSlug, onExit, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skill, setSkill] = useState(null)
  const [tasks, setTasks] = useState([])
  const [index, setIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState([])
  const [orderedIds, setOrderedIds] = useState([])
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [earnedXp, setEarnedXp] = useState(0)

  const task = tasks[index]
  const payload = task?.payload
  const mode = payload?.answer?.mode ?? 'single'
  const progress = tasks.length ? Math.round((index / tasks.length) * 100) : 0

  const displayChoices = useMemo(() => {
    if (!payload?.choices) return []
    if (mode === 'ordered') {
      return orderedIds
        .map((id) => payload.choices.find((choice) => choice.id === id))
        .filter(Boolean)
    }
    return payload.choices
  }, [payload, mode, orderedIds])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchSkillTasks(skillSlug)
        if (cancelled) return
        setSkill(data.skill)
        setTasks(data.tasks)
        setIndex(0)
        setEarnedXp(0)
        setResult(null)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load lesson')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [skillSlug])

  useEffect(() => {
    if (!task) return
    setSelectedIds([])
    setResult(null)
    if (task.payload?.answer?.mode === 'ordered') {
      setOrderedIds(shuffle(task.payload.choices.map((choice) => choice.id)))
    } else {
      setOrderedIds([])
    }
  }, [task])

  function toggleChoice(id) {
    if (result?.correct) return

    if (mode === 'single') {
      setSelectedIds([id])
      setResult(null)
      return
    }

    if (mode === 'multiple') {
      setSelectedIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      )
      setResult(null)
    }
  }

  function moveOrdered(id, direction) {
    if (result?.correct) return
    setOrderedIds((current) => {
      const at = current.indexOf(id)
      const next = at + direction
      if (at < 0 || next < 0 || next >= current.length) return current
      const copy = [...current]
      ;[copy[at], copy[next]] = [copy[next], copy[at]]
      return copy
    })
    setResult(null)
  }

  async function handleCheck() {
    if (!task) return
    const answerIds = mode === 'ordered' ? orderedIds : selectedIds
    if (mode !== 'ordered' && answerIds.length === 0) return

    setChecking(true)
    try {
      const data = await checkTaskAnswer(skillSlug, task.id, answerIds)
      setResult(data)
      if (data.correct) {
        setEarnedXp((xp) => xp + data.xpAwarded)
      }
    } catch (err) {
      setResult({
        correct: false,
        feedback: err.message || 'Could not check answer',
      })
    } finally {
      setChecking(false)
    }
  }

  function handleContinue() {
    if (index >= tasks.length - 1) {
      onComplete?.({ skill, earnedXp })
      return
    }
    setIndex((value) => value + 1)
  }

  const canCheck =
    mode === 'ordered'
      ? orderedIds.length > 0 && !result?.correct
      : selectedIds.length > 0 && !result?.correct

  return (
    <PhoneShell>
      <main className="screen lesson-screen">
        <header className="lesson-top">
          <button type="button" className="lesson-close" onClick={onExit} aria-label="Close lesson">
            ✕
          </button>
          <div
            className="progress lesson-top__progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="lesson-xp">+{earnedXp} XP</span>
        </header>

        {loading && <p className="lesson-status">Loading lesson…</p>}
        {error && !loading && (
          <div className="lesson-status lesson-status--error">
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={onExit}>
              Back to Path
            </button>
          </div>
        )}

        {!loading && !error && task && (
          <>
            <p className="lesson-kicker">
              {skill?.title} · Task {index + 1}/{tasks.length}
            </p>
            <h1 className="lesson-prompt">{task.prompt}</h1>
            <p className="lesson-mode">
              {mode === 'single' && 'Choose one answer'}
              {mode === 'multiple' && 'Select all that apply'}
              {mode === 'ordered' && 'Put the steps in order'}
            </p>

            <ul className="lesson-choices">
              {displayChoices.map((choice, choiceIndex) => {
                const active =
                  mode === 'ordered' ? false : selectedIds.includes(choice.id)
                const showCorrect =
                  result &&
                  (result.correct
                    ? (mode === 'ordered'
                        ? arraysEqual(orderedIds, result.correctIds ?? orderedIds)
                        : selectedIds.includes(choice.id))
                    : result.correctIds?.includes(choice.id))

                return (
                  <li key={choice.id}>
                    {mode === 'ordered' ? (
                      <div
                        className={`lesson-choice lesson-choice--ordered${
                          result?.correct ? ' is-correct' : ''
                        }${result && !result.correct ? ' is-wrong' : ''}`}
                      >
                        <span className="lesson-choice__index">{choiceIndex + 1}</span>
                        <span className="lesson-choice__text">{choice.text}</span>
                        <div className="lesson-choice__moves">
                          <button
                            type="button"
                            aria-label="Move up"
                            disabled={choiceIndex === 0 || result?.correct}
                            onClick={() => moveOrdered(choice.id, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            disabled={
                              choiceIndex === displayChoices.length - 1 || result?.correct
                            }
                            onClick={() => moveOrdered(choice.id, 1)}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`lesson-choice${active ? ' is-selected' : ''}${
                          result?.correct && active ? ' is-correct' : ''
                        }${result && !result.correct && active ? ' is-wrong' : ''}${
                          showCorrect && result && !result.correct ? ' is-reveal' : ''
                        }`}
                        onClick={() => toggleChoice(choice.id)}
                      >
                        <span className="lesson-choice__text">{choice.text}</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            {result && (
              <div
                className={`lesson-feedback${result.correct ? ' is-correct' : ' is-wrong'}`}
                role="status"
              >
                <p>{result.feedback}</p>
                {result.correct && result.xpAwarded > 0 && (
                  <p className="lesson-feedback__xp">+{result.xpAwarded} XP</p>
                )}
              </div>
            )}

            <div className="lesson-actions">
              {result?.correct ? (
                <button type="button" className="btn btn--primary" onClick={handleContinue}>
                  {index >= tasks.length - 1 ? 'Finish Lesson' : 'Continue'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleCheck}
                  disabled={!canCheck || checking}
                >
                  {checking ? 'Checking…' : 'Check'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </PhoneShell>
  )
}
