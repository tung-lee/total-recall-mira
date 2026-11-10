import { Blob, Heart, Sparkle } from '../ui/Art'
import './landing.css'

const CONVO: Array<{ me: boolean; text: string }> = [
  { me: true, text: 'should i buy the $48 serum?' },
  { me: false, text: "it's $41 at Shelf. but you skipped a $40 beauty buy last week, so i flag those now 🤔" },
  { me: true, text: 'skip it, move $41 to tokyo' },
  { me: false, text: 'done ✅ $41 is in tokyo now: $141 of $1,200' },
]

const LINES = [
  'BUDGET · monthly · about $400',
  'GOAL · trip · about $1,200 · by 2027-03',
  'CAP · eating out · about $60 a week',
  'RULE · coffee → eating out',
  'NUDGE · beauty · about $40 · skipped',
  'HABIT · eating out · about $60 a week · fri sat',
  'MONTH · 2026-11 · spent about $250',
]

export default function Landing() {
  return (
    <div className="landing">
      <nav className="nav">
        <a href="#/" className="logo"><Blob size={28} mood="happy" color="#9BE15D" /> mira</a>
        <a href="#/chat" className="nav-cta">Text Mira</a>
      </nav>

      <section className="hero">
        <div className="hero-blob pink"><Blob size={130} mood="happy" color="#9BE15D" /><Heart style={{ position: 'absolute', right: -18, top: -24 }} size={40} color="#F59AC9" /></div>
        <div className="hero-blob green"><Blob size={130} mood="squint" color="#F59AC9" /><Sparkle style={{ position: 'absolute', right: -12, top: -30 }} size={38} /></div>
        <h1>Meet Mira</h1>
        <p className="sub">The money friend you text before you buy</p>
        <a href="#/chat" className="cta">Text Mira</a>

        <div className="convo" aria-label="A conversation with Mira">
          {CONVO.map((b) => <div key={b.text} className={`cb ${b.me ? 'me' : 'mira'}`}>{b.text}</div>)}
        </div>
      </section>

      <section className="statement">
        <p>
          Text Mira what you spend <span className="emo">☕</span>. She keeps your budget, guards your goal <span className="emo">✈️</span> and learns which buys you'd rather skip <span className="emo">🧠</span>, then moves that money where it matters.
        </p>
      </section>

      <section className="compare-sec">
        <h2>Money, before and after Mira</h2>
        <div className="vs">
          <div className="col without">
            <h3>Without Mira</h3>
            <ul>
              <li>A budgeting app you stop opening in week two</li>
              <li>Categorising every coffee by hand</li>
              <li>Finding out you overspent at the end of the month</li>
              <li>"Saving" for a trip in the same account you spend from</li>
              <li>An assistant that forgets you on a new phone</li>
            </ul>
          </div>
          <div className="col with">
            <h3>With Mira</h3>
            <ul>
              <li><b>One text per spend</b>, filed for you</li>
              <li><b>Corrected once</b>, right forever</li>
              <li><b>Asked before</b> you buy, with reasons</li>
              <li><b>Skip and save</b>: one tap into your goal</li>
              <li><b>Remembers you</b> on any device</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="where">
        <h2>Feels like texting. Runs on real rails.</h2>
        <div className="where-grid">
          <div className="wcard">
            <div className="wmini">
              <div className="b me">coffee 5.5</div>
              <div className="b mira">☕ treats · $342 left this month</div>
            </div>
            <h3>Just text</h3>
            <p>No forms, no categories, no app to learn. Mira reads “coffee 5.5” and “dinner 84 split 3 ways”.</p>
          </div>
          <div className="wcard">
            <div className="wmini center"><Blob size={70} mood="wink" color="#9BE15D" /></div>
            <h3>Walrus Memory</h3>
            <p>What Mira learns is written as short, rounded lines to Walrus Memory. No names, no exact amounts. Your ledger stays on your phone.</p>
          </div>
          <div className="wcard">
            <div className="wmini"><div className="b mira">✓ Moved $41 to Tokyo</div></div>
            <h3>Pockets on Sui</h3>
            <p>Spending and goal pockets settle on Sui testnet through Tatum’s gRPC gateway. Gas is covered; you never see a wallet.</p>
          </div>
        </div>
      </section>

      <section className="learns">
        <h2>Learns how you spend.</h2>
        <p className="lead">Every correction, cap and skipped buy becomes one line Mira acts on next time.</p>
        <div className="cloud">
          {LINES.map((t, i) => <span key={t} className={`ctag c${i % 4} mono`}>{t}</span>)}
        </div>
      </section>

      <section className="final">
        <Blob size={90} mood="happy" color="#9BE15D" />
        <h2>Ask Mira first.</h2>
        <a href="#/chat" className="cta">Text Mira</a>
      </section>

      <footer className="foot">
        <span>Built for Walrus × Tatum: Total Recall, Track 3 (Consumer Finance)</span>
        <span>Test money on Sui testnet · memory on Walrus mainnet</span>
      </footer>
    </div>
  )
}
