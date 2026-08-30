import { useEffect, useRef, useState } from 'react'
import PhoneShell from '../components/PhoneShell'
import BottomNav from '../components/BottomNav'
import { ChefBotIcon, StarIcon } from '../components/Icons'
import { fetchInventory, sendAiChat } from '../api/client'
import './AiChefScreen.css'

const STARTER =
  "Hey Chef! What's in your fridge today? I can already see your pantry — ask me to cook something from it."

export default function AiChefScreen({
  activeTab,
  onTabChange,
  user,
  onOpenProfile,
}) {
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [items, setItems] = useState([])
  const [inventoryError, setInventoryError] = useState('')
  const [messages, setMessages] = useState([
    { id: 'boot', role: 'assistant', content: STARTER },
  ])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recipe, setRecipe] = useState(null)
  const [shopping, setShopping] = useState(null)
  const listRef = useRef(null)

  const displayName = user?.isGuest ? 'Guest Chef' : user?.name || 'Chef'
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    let cancelled = false
    fetchInventory()
      .then((data) => {
        if (!cancelled) setItems(data.items ?? [])
      })
      .catch((err) => {
        if (!cancelled) setInventoryError(err.message || 'Could not load pantry')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, recipe, shopping, busy])

  async function handleSend(event) {
    event?.preventDefault?.()
    const text = draft.trim()
    if (!text || busy) return

    const nextMessages = [
      ...messages,
      { id: `u-${Date.now()}`, role: 'user', content: text },
    ]
    setMessages(nextMessages)
    setDraft('')
    setBusy(true)
    setError('')

    try {
      const payload = await sendAiChat(
        nextMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map(({ role, content }) => ({ role, content })),
      )

      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: payload.assistantMessage,
        },
      ])
      setRecipe(payload.recipe ?? null)
      setShopping(payload.shoppingSuggestions ?? null)
    } catch (err) {
      setError(err.message || 'AI chef is unavailable')
    } finally {
      setBusy(false)
    }
  }

  function askFromPantry() {
    setDraft('What can I cook with what I have right now?')
  }

  return (
    <PhoneShell>
      <main className="screen ai-screen">
        <header className="screen-header">
          <div className="screen-header__identity">
            <button
              type="button"
              className="avatar-button"
              onClick={onOpenProfile}
              aria-label="Open profile"
            >
              {user?.avatarUrl ? (
                <img className="avatar avatar--image" src={user.avatarUrl} alt="" />
              ) : (
                <div className="avatar" aria-hidden="true">
                  <span>{initials || 'ZP'}</span>
                </div>
              )}
            </button>
            <div className="screen-header__copy">
              <h1 className="brand">Zesty Chef</h1>
              <p className="screen-header__user">AI sous-chef</p>
            </div>
          </div>
          <div className="screen-header__stats">
            <div className="chip chip--xp-outline">
              <StarIcon size={16} />
              <span>{user?.xp ?? 0} XP</span>
            </div>
          </div>
        </header>

        <section className="inventory-panel">
          <button
            type="button"
            className="inventory-panel__toggle"
            aria-expanded={inventoryOpen}
            onClick={() => setInventoryOpen((open) => !open)}
          >
            <span>
              Your pantry
              <small>{items.length} ingredients</small>
            </span>
            <span className="inventory-panel__chevron" aria-hidden="true">
              {inventoryOpen ? '▾' : '▸'}
            </span>
          </button>

          {inventoryOpen && (
            <div className="inventory-panel__body">
              {inventoryError && <p className="ai-error">{inventoryError}</p>}
              {!inventoryError && items.length === 0 && (
                <p className="inventory-empty">No ingredients yet.</p>
              )}
              <ul className="inventory-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <span className="inventory-list__name">{item.name}</span>
                    <span className="inventory-list__meta">
                      {item.quantity != null ? `${item.quantity}` : ''}
                      {item.unit ? ` ${item.unit}` : ''}
                      {item.category ? ` · ${item.category}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn--ghost inventory-cta" onClick={askFromPantry}>
                Suggest from pantry
              </button>
            </div>
          )}
        </section>

        <div className="ai-thread" ref={listRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`ai-bubble ai-bubble--${message.role}`}
            >
              {message.role === 'assistant' && (
                <span className="ai-bubble__bot" aria-hidden="true">
                  <ChefBotIcon size={18} />
                </span>
              )}
              <p>{message.content}</p>
            </div>
          ))}

          {busy && <p className="ai-typing">Zesty is thinking…</p>}

          {shopping?.length > 0 && !recipe && (
            <div className="shopping-card card">
              <h2>Buy these next</h2>
              <ul>
                {shopping.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {recipe && (
            <article className="recipe-card-ai card">
              <p className="recipe-card-ai__eyebrow">Quick recipe card</p>
              <h2>{recipe.title}</h2>
              <div className="recipe-card-ai__meta">
                <span>{recipe.time}</span>
                <span>{recipe.difficulty}</span>
                <span>{recipe.servings}</span>
              </div>
              {recipe.ingredients?.length > 0 && (
                <>
                  <h3>Ingredients</h3>
                  <ul>
                    {recipe.ingredients.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
              {recipe.steps?.length > 0 && (
                <>
                  <h3>Steps</h3>
                  <ol>
                    {recipe.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </>
              )}
              <button type="button" className="btn btn--primary">
                Start Cooking
              </button>
            </article>
          )}

          {error && <p className="ai-error">{error}</p>}
        </div>

        <form className="ai-composer" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the Chef..."
            aria-label="Message the AI chef"
            disabled={busy}
          />
          <button type="submit" className="ai-composer__send" disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
      </main>

      <BottomNav active={activeTab} onChange={onTabChange} />
    </PhoneShell>
  )
}
