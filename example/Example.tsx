import { Audiogram, type Threshold } from '../src'

/**
 * Two exams from the same worker, two years apart.
 *
 * The baseline is within normal limits. The follow-up shows the notch at
 * 4 kHz that recovers at 8 kHz — the pattern noise-induced hearing loss
 * leaves behind, and the reason occupational screening tests those
 * frequencies at all.
 */

const baselineRight: Threshold[] = [
  { frequency: 250, db: 10 },
  { frequency: 500, db: 10 },
  { frequency: 1000, db: 5 },
  { frequency: 2000, db: 5 },
  { frequency: 3000, db: 10 },
  { frequency: 4000, db: 15 },
  { frequency: 6000, db: 15 },
  { frequency: 8000, db: 10 },
]

const baselineLeft: Threshold[] = [
  { frequency: 250, db: 10 },
  { frequency: 500, db: 10 },
  { frequency: 1000, db: 5 },
  { frequency: 2000, db: 10 },
  { frequency: 3000, db: 10 },
  { frequency: 4000, db: 15 },
  { frequency: 6000, db: 15 },
  { frequency: 8000, db: 10 },
]

const currentRight: Threshold[] = [
  { frequency: 250, db: 10 },
  { frequency: 500, db: 10 },
  { frequency: 1000, db: 10 },
  { frequency: 2000, db: 15 },
  { frequency: 3000, db: 25 },
  { frequency: 4000, db: 35 },
  { frequency: 6000, db: 30 },
  { frequency: 8000, db: 20 },
]

const currentLeft: Threshold[] = [
  { frequency: 250, db: 10 },
  { frequency: 500, db: 15 },
  { frequency: 1000, db: 10 },
  { frequency: 2000, db: 20 },
  { frequency: 3000, db: 30 },
  { frequency: 4000, db: 40 },
  { frequency: 6000, db: 35 },
  { frequency: 8000, db: 20 },
]

export function Example() {
  return (
    <div style={{ display: 'grid', gap: 48, maxWidth: 680, margin: '0 auto' }}>
      <section>
        <h2>Current exam</h2>
        <Audiogram right={currentRight} left={currentLeft} />
      </section>

      <section>
        <h2>Compared against the baseline</h2>
        <Audiogram
          right={currentRight}
          left={currentLeft}
          compareTo={{
            right: baselineRight,
            left: baselineLeft,
            label: 'baseline, 2024',
          }}
        />
      </section>

      <section>
        <h2>One ear at a time</h2>
        <p>
          Four curves in one plot get hard to read. Narrowing to a single ear
          isolates the shift.
        </p>
        <Audiogram
          right={currentRight}
          left={currentLeft}
          ears={['left']}
          compareTo={{
            right: baselineRight,
            left: baselineLeft,
            label: 'baseline, 2024',
          }}
        />
      </section>

      <section>
        <h2>Partial test</h2>
        <p>
          Frequencies that were not tested leave a gap. The line is not drawn
          through them, because that would show a reading nobody took.
        </p>
        <Audiogram
          right={[
            { frequency: 250, db: 15 },
            { frequency: 500, db: 20 },
            { frequency: 4000, db: 45 },
            { frequency: 6000, db: 40 },
          ]}
        />
      </section>
    </div>
  )
}
