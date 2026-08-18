import { useEffect, useMemo, useRef, useState } from 'react'
import PhoneShell from '../components/PhoneShell'
import { checkTaskAnswer, fetchSkillTasks, submitPlate } from '../api/client'
import './LessonScreen.css'

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function LessonScreen({ skillSlug, user, onUserXp, onExit, onComplete }) {
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
  const [phase, setPhase] = useState('task')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoName, setPhotoName] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileInputRef = useRef(null)

  const task = tasks[index]
  const payload = task?.payload
  const mode = payload?.answer?.mode ?? 'single'
  const isRecipe = mode === 'recipe' || task?.type === 'RECIPE_COMPLETE'
  const photoConfig = payload?.photo
  const progress =
    phase === 'photo'
      ? 100
      : tasks.length
        ? Math.round((index / tasks.length) * 100)
        : 0

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
        const firstOpen = data.tasks.findIndex((item) => !item.completed)
        setIndex(firstOpen === -1 ? 0 : firstOpen)
        setEarnedXp(0)
        setResult(null)
        setPhase('task')
        setPhotoFile(null)
        setPhotoPreview(null)
        setPhotoName('')
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
    if (!task || phase !== 'task') return
    setSelectedIds([])
    setResult(null)
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoName('')
    if (task.payload?.answer?.mode === 'ordered') {
      setOrderedIds(shuffle(task.payload.choices.map((choice) => choice.id)))
    } else {
      setOrderedIds([])
    }
    // Only reset when moving to a different task, not when the same task is marked completed.
  }, [task?.id, phase])

  function toggleChoice(id) {
    if (result?.correct) return

    if (mode === 'single') {
      setSelectedIds([id])
      setResult(null)
      return
    }

    if (mode === 'multiple' || mode === 'recipe') {
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
        if (typeof data.userXp === 'number') onUserXp?.(data.userXp)
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id ? { ...item, completed: true } : item,
          ),
        )
        if (index < tasks.length - 1) {
          setIndex((value) => value + 1)
        }
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
      if (photoConfig) {
        setPhase('photo')
        return
      }
      onComplete?.({ skill, earnedXp })
      return
    }
    setIndex((value) => value + 1)
  }

  function handlePhotoPick(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function finishWithPlate({ skipped }) {
    setPhotoBusy(true)
    try {
      const data = await submitPlate(skillSlug, {
        file: skipped ? undefined : photoFile,
        skipped,
      })
      if (typeof data.userXp === 'number') onUserXp?.(data.userXp)
      if (data.xpBonus) setEarnedXp((xp) => xp + data.xpBonus)
      onComplete?.({
        skill,
        earnedXp: earnedXp + (data.xpBonus || 0),
        photoUploaded: !data.plate?.skipped,
        photoSkipped: Boolean(data.plate?.skipped),
      })
    } catch (err) {
      setError(err.message || 'Could not save plate')
    } finally {
      setPhotoBusy(false)
    }
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

        {!loading && !error && phase === 'photo' && photoConfig && (
          <section className="photo-finish" aria-labelledby="photo-finish-title">
            <p className="lesson-kicker">{skill?.title} · Finish course</p>
            <h1 id="photo-finish-title" className="lesson-prompt">
              {photoConfig.prompt}
            </h1>
            <p className="lesson-mode">Optional — you can skip this step</p>

            <button
              type="button"
              className="photo-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Your plated dish preview" className="photo-dropzone__preview" />
              ) : (
                <span className="photo-dropzone__hint">
                  Tap to upload a plate photo
                  <small>JPG or PNG</small>
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="photo-input"
              onChange={handlePhotoPick}
            />
            {photoName && <p className="photo-filename">{photoName}</p>}

            <div className="lesson-actions lesson-actions--stack">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => finishWithPlate({ skipped: false })}
                disabled={!photoPreview || photoBusy}
              >
                {photoBusy
                  ? 'Saving…'
                  : photoConfig.xpBonus
                    ? `Share Plate (+${photoConfig.xpBonus} XP)`
                    : 'Share Plate'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => finishWithPlate({ skipped: true })}
                disabled={photoBusy}
              >
                {photoConfig.skipLabel || 'Skip for now'}
              </button>
            </div>
          </section>
        )}

        {!loading && !error && phase === 'task' && task && (
          <>
            <p className="lesson-kicker">
              {skill?.title} · Task {index + 1}/{tasks.length}
              {user?.xp != null ? ` · ${user.xp} XP total` : ''}
            </p>
            <h1 className="lesson-prompt">{task.prompt}</h1>

            {isRecipe && payload?.recipe && (
              <article className="recipe-card">
                <h2 className="recipe-card__title">{payload.recipe.title}</h2>
                <div className="recipe-card__meta">
                  <span>{payload.recipe.time}</span>
                  <span>{payload.recipe.difficulty}</span>
                  {payload.recipe.servings && <span>{payload.recipe.servings}</span>}
                </div>
              </article>
            )}

            <p className="lesson-mode">
              {mode === 'single' && 'Choose one answer'}
              {mode === 'multiple' && 'Select all that apply'}
              {mode === 'ordered' && 'Put the steps in order'}
              {mode === 'recipe' && 'Check off each step as you cook'}
            </p>

            <ul className="lesson-choices">
              {displayChoices.map((choice, choiceIndex) => {
                const active =
                  mode === 'ordered' ? false : selectedIds.includes(choice.id)
                const showCorrect =
                  result && !result.correct && result.correctIds?.includes(choice.id)

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
                        className={`lesson-choice${isRecipe ? ' lesson-choice--check' : ''}${
                          active ? ' is-selected' : ''
                        }${result?.correct && active ? ' is-correct' : ''}${
                          result && !result.correct && active ? ' is-wrong' : ''
                        }${showCorrect ? ' is-reveal' : ''}`}
                        onClick={() => toggleChoice(choice.id)}
                      >
                        {(mode === 'multiple' || mode === 'recipe') && (
                          <span className={`lesson-check${active ? ' is-on' : ''}`} aria-hidden="true">
                            {active ? '✓' : ''}
                          </span>
                        )}
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
                  {index >= tasks.length - 1
                    ? photoConfig
                      ? 'Finish Course'
                      : 'Finish Lesson'
                    : 'Continue'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleCheck}
                  disabled={!canCheck || checking}
                >
                  {checking ? 'Checking…' : isRecipe ? 'Mark Recipe Done' : 'Check'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </PhoneShell>
  )
}
