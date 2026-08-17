import PhoneShell from '../components/PhoneShell'
import BottomNav from '../components/BottomNav'
import {
  CrownIcon,
  FlameIcon,
  LockIcon,
  PlayIcon,
  StarIcon,
} from '../components/Icons'
import './PathScreen.css'

const PATH_NODES = [
  {
    id: 'knife',
    title: 'Knife Skills',
    status: 'complete',
  },
  {
    id: 'saute',
    title: 'Sautéing Basics',
    status: 'current',
    progress: 75,
    tip: "Ready to turn up the heat? Let's master the sauté",
  },
  {
    id: 'simmer',
    title: 'The Art of Simmering',
    status: 'locked',
  },
]

function NodeIcon({ status }) {
  if (status === 'complete') return <CrownIcon size={30} />
  if (status === 'current') return <FlameIcon size={28} />
  return <LockIcon size={26} />
}

export default function PathScreen({ activeTab, onTabChange }) {
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

        <ol className="skill-path" aria-label="Cooking skill path">
          {PATH_NODES.map((node, index) => {
            const next = PATH_NODES[index + 1]
            const connectorClass =
              node.status === 'complete'
                ? 'skill-path__connector is-complete'
                : 'skill-path__connector is-locked'

            return (
              <li key={node.id} className={`skill-node skill-node--${node.status}`}>
                <div className="skill-node__rail">
                  <button
                    type="button"
                    className="skill-node__bubble"
                    aria-current={node.status === 'current' ? 'step' : undefined}
                    aria-label={`${node.title}, ${node.status}`}
                    disabled={node.status === 'locked'}
                  >
                    <span className="skill-node__icon">
                      <NodeIcon status={node.status} />
                    </span>
                    {node.status === 'current' && (
                      <span className="skill-node__pulse" aria-hidden="true" />
                    )}
                  </button>

                  {next && <div className={connectorClass} aria-hidden="true" />}
                </div>

                <div className="skill-node__content">
                  {node.tip && (
                    <div className="speech-bubble" role="note">
                      <p>{node.tip}</p>
                    </div>
                  )}

                  <h2 className="skill-node__title">{node.title}</h2>

                  {typeof node.progress === 'number' && (
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

        <div className="path-screen__cta">
          <button type="button" className="btn btn--primary btn--continue">
            Continue Path
            <PlayIcon />
          </button>
        </div>
      </main>

      <BottomNav active={activeTab} onChange={onTabChange} />
    </PhoneShell>
  )
}
