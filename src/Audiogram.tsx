/**
 * A pure-tone audiogram, drawn to clinical convention.
 *
 * No dependencies beyond React, no CSS framework, no global styles. Everything
 * is inline SVG so it renders the same in a web app, a print stylesheet or a
 * PDF export.
 */

export type Ear = 'right' | 'left'

/** One measured threshold: the quietest level the patient reported hearing. */
export type Threshold = {
  /** Test tone in hertz. */
  frequency: number
  /** Hearing level in decibels (dB HL). Higher is worse. */
  db: number
}

export type AudiogramSeries = {
  right?: Threshold[]
  left?: Threshold[]
}

export type AudiogramProps = AudiogramSeries & {
  /**
   * A second set of thresholds, drawn faded behind the main one. This is how
   * a change over time is normally read: two audiograms superimposed rather
   * than side by side.
   */
  compareTo?: AudiogramSeries & { label?: string }
  /** Which ears to draw. Defaults to both. */
  ears?: Ear[]
  /** Frequencies along the x-axis, in hertz. */
  frequencies?: number[]
  /** Print each threshold next to its marker. Defaults to true. */
  showValues?: boolean
  /** Draw the legend below the plot. Defaults to true. */
  showLegend?: boolean
  /**
   * Colour the page is drawn on. Value labels are haloed with it so they stay
   * readable where they cross a gridline or the other ear's curve.
   */
  background?: string
  /** Describes the chart to assistive technology. */
  label?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Right ear red, left ear blue: the universal audiometric convention.
 *
 * Colour is never the only channel. The right ear is drawn with circles and a
 * solid line, the left with crosses and a dashed one — red and green/blue pairs
 * are exactly what the common colour vision deficiencies collapse.
 */
export const EAR_COLOURS: Record<Ear, string> = {
  right: '#c62828',
  left: '#1565c0',
}

const DEFAULT_FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000]

/** The decibel axis runs downward: better hearing sits at the top. */
const DB_MIN = -10
const DB_MAX = 120
const DB_GRIDLINES = [0, 20, 40, 60, 80, 100, 120]

const WIDTH = 580
const HEIGHT = 330
/** Top and bottom leave room for the value labels that sit beside each point. */
const MARGIN = { top: 34, right: 16, bottom: 26, left: 42 }

const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

const AXIS_COLOUR = '#7a7a7d'
const GRID_MAJOR = '#d4d4d7'
const GRID_MINOR = '#e7e7ea'

type Point = { index: number; db: number; cx: number; cy: number }

/**
 * Frequencies are spaced evenly rather than logarithmically. Clinical
 * audiograms are read against a table of the same columns, and even spacing
 * keeps the two aligned.
 */
function scaleX(index: number, count: number): number {
  if (count <= 1) return MARGIN.left
  return MARGIN.left + (index * PLOT_WIDTH) / (count - 1)
}

function scaleY(db: number): number {
  return MARGIN.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * PLOT_HEIGHT
}

function toPoints(thresholds: Threshold[] | undefined, frequencies: number[]): Point[] {
  if (!thresholds?.length) return []

  const byFrequency = new Map(thresholds.map((t) => [t.frequency, t.db]))

  return frequencies
    .map((frequency, index) => {
      const db = byFrequency.get(frequency)
      // A frequency that was not tested is absent, not zero: 0 dB HL is a
      // perfectly good threshold, so the two must not be confused.
      if (db === undefined || !Number.isFinite(db)) return null
      return { index, db, cx: scaleX(index, frequencies.length), cy: scaleY(db) }
    })
    .filter((p): p is Point => p !== null)
}

/**
 * Joins consecutive points only. A frequency that was skipped leaves a gap
 * instead of a straight line drawn through it, which would invent a reading
 * that was never taken.
 */
function polylines(points: Point[]): string[] {
  const lines: string[] = []
  let current: string[] = []

  points.forEach((point, i) => {
    const previous = points[i - 1]
    if (previous && point.index !== previous.index + 1) {
      if (current.length > 1) lines.push(current.join(' '))
      current = []
    }
    current.push(`${point.cx},${point.cy}`)
  })
  if (current.length > 1) lines.push(current.join(' '))

  return lines
}

// ── Value labels ───────────────────────────────────────────────────────────

type Label = { key: number; x: number; y: number; text: number }

const OFFSET = { above: -11, below: 17 }

function placeLabel(point: Point, side: 'above' | 'below'): Label {
  // Near the ceiling (thresholds of −10 dB) a label placed above would collide
  // with the frequency row. It flips below and shifts left so it does not land
  // on whatever is already there.
  const tight = side === 'above' && point.cy + OFFSET.above < MARGIN.top
  if (tight) {
    return { key: point.index, x: point.cx - 14, y: point.cy + OFFSET.below, text: point.db }
  }
  return { key: point.index, x: point.cx, y: point.cy + OFFSET[side], text: point.db }
}

/**
 * Distributes the labels of a series and its comparison so they never overlap.
 *
 * Where both exist at the same frequency, whichever sits higher on screen takes
 * the upper label and the other takes the lower one, so the two numbers bracket
 * the gap the reader is trying to measure.
 */
function distributeLabels(
  main: Point[],
  reference: Point[],
  fallbackSide: 'above' | 'below',
): { main: Label[]; reference: Label[] } {
  const referenceByIndex = new Map(reference.map((p) => [p.index, p]))
  const paired = new Set<number>()

  const mainLabels: Label[] = []
  const referenceLabels: Label[] = []

  for (const point of main) {
    const ref = referenceByIndex.get(point.index)
    if (!ref) {
      mainLabels.push(placeLabel(point, fallbackSide))
      continue
    }

    paired.add(point.index)
    if (point.cy <= ref.cy) {
      mainLabels.push(placeLabel(point, 'above'))
      referenceLabels.push(placeLabel(ref, 'below'))
    } else {
      mainLabels.push(placeLabel(point, 'below'))
      referenceLabels.push(placeLabel(ref, 'above'))
    }
  }

  // Frequencies only the comparison has: the current exam skipped them.
  for (const ref of reference) {
    if (!paired.has(ref.index)) referenceLabels.push(placeLabel(ref, fallbackSide))
  }

  return { main: mainLabels, reference: referenceLabels }
}

function Labels({
  labels,
  colour,
  background,
  faded,
}: {
  labels: Label[]
  colour: string
  background: string
  faded?: boolean
}) {
  return (
    <>
      {labels.map((label) => (
        <text
          key={label.key}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fontSize={faded ? 9.5 : 10.5}
          fontWeight="500"
          fill={colour}
          opacity={faded ? 0.6 : 1}
          // A halo in the page colour keeps the number readable where it
          // crosses a gridline or the other ear's curve.
          stroke={background}
          strokeWidth="3"
          paintOrder="stroke"
        >
          {label.text}
        </text>
      ))}
    </>
  )
}

// ── Markers and series ─────────────────────────────────────────────────────

function Marker({ ear, cx, cy, colour }: { ear: Ear; cx: number; cy: number; colour: string }) {
  if (ear === 'right') {
    return <circle cx={cx} cy={cy} r="5" fill="none" stroke={colour} strokeWidth="1.5" />
  }
  return (
    <path
      d={`M${cx - 4.5} ${cy - 4.5} L${cx + 4.5} ${cy + 4.5} M${cx + 4.5} ${cy - 4.5} L${cx - 4.5} ${cy + 4.5}`}
      stroke={colour}
      strokeWidth="1.5"
      fill="none"
    />
  )
}

function Series({ points, ear, faded }: { points: Point[]; ear: Ear; faded?: boolean }) {
  const colour = EAR_COLOURS[ear]

  return (
    <g opacity={faded ? 0.4 : 1}>
      {polylines(points).map((pts, i) => (
        <polyline
          key={i}
          points={pts}
          fill="none"
          stroke={colour}
          strokeWidth={faded ? 1.2 : 1.5}
          strokeDasharray={ear === 'left' ? '4 3' : undefined}
        />
      ))}
      {points.map((p) => (
        <Marker key={p.index} ear={ear} cx={p.cx} cy={p.cy} colour={colour} />
      ))}
    </g>
  )
}

function LegendSymbol({ ear }: { ear: Ear }) {
  const colour = EAR_COLOURS[ear]
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {ear === 'right' ? (
        <circle cx="7" cy="7" r="5" fill="none" stroke={colour} strokeWidth="1.5" />
      ) : (
        <path d="M3 3 L11 11 M11 3 L3 11" stroke={colour} strokeWidth="1.5" fill="none" />
      )}
    </svg>
  )
}

const EAR_NAMES: Record<Ear, string> = {
  right: 'Right ear',
  left: 'Left ear',
}

// ── Component ──────────────────────────────────────────────────────────────

export function Audiogram({
  right,
  left,
  compareTo,
  ears = ['right', 'left'],
  frequencies = DEFAULT_FREQUENCIES,
  showValues = true,
  showLegend = true,
  background = '#ffffff',
  label = 'Pure-tone audiogram',
  className,
  style,
}: AudiogramProps) {
  const visible = (ear: Ear) => ears.includes(ear)

  const series: Record<Ear, Point[]> = {
    right: visible('right') ? toPoints(right, frequencies) : [],
    left: visible('left') ? toPoints(left, frequencies) : [],
  }

  const comparison: Record<Ear, Point[]> = {
    right: compareTo && visible('right') ? toPoints(compareTo.right, frequencies) : [],
    left: compareTo && visible('left') ? toPoints(compareTo.left, frequencies) : [],
  }

  // Right labels default above and left below, so the two never collide when
  // both ears share a threshold — which is what a healthy audiogram looks like.
  const labels = {
    right: distributeLabels(series.right, comparison.right, 'above'),
    left: distributeLabels(series.left, comparison.left, 'below'),
  }

  return (
    <figure className={className} style={{ margin: 0, ...style }}>
      <svg
        // Redundant inside HTML, but it makes the markup valid on its own —
        // so serialising the chart to a standalone .svg file just works.
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={label}
      >
        {DB_GRIDLINES.map((db) => (
          <g key={db}>
            <line
              x1={MARGIN.left}
              y1={scaleY(db)}
              x2={WIDTH - MARGIN.right}
              y2={scaleY(db)}
              stroke={GRID_MAJOR}
              strokeWidth="1"
            />
            <text
              x={MARGIN.left - 8}
              y={scaleY(db) + 4}
              textAnchor="end"
              fontSize="11"
              fill={AXIS_COLOUR}
            >
              {db}
            </text>
          </g>
        ))}

        {frequencies.map((frequency, index) => (
          <g key={frequency}>
            <line
              x1={scaleX(index, frequencies.length)}
              y1={MARGIN.top}
              x2={scaleX(index, frequencies.length)}
              y2={HEIGHT - MARGIN.bottom}
              stroke={GRID_MINOR}
              strokeWidth="1"
            />
            <text
              x={scaleX(index, frequencies.length)}
              y={MARGIN.top - 16}
              textAnchor="middle"
              fontSize="11"
              fill={AXIS_COLOUR}
            >
              {frequency >= 1000 ? `${frequency / 1000}k` : frequency}
            </text>
          </g>
        ))}

        {/* The comparison is drawn first so it sits behind the current exam. */}
        {compareTo ? (
          <>
            <Series points={comparison.right} ear="right" faded />
            <Series points={comparison.left} ear="left" faded />
          </>
        ) : null}

        <Series points={series.right} ear="right" />
        <Series points={series.left} ear="left" />

        {showValues ? (
          <>
            <Labels
              labels={labels.right.reference}
              colour={EAR_COLOURS.right}
              background={background}
              faded
            />
            <Labels
              labels={labels.left.reference}
              colour={EAR_COLOURS.left}
              background={background}
              faded
            />
            <Labels
              labels={labels.right.main}
              colour={EAR_COLOURS.right}
              background={background}
            />
            <Labels
              labels={labels.left.main}
              colour={EAR_COLOURS.left}
              background={background}
            />
          </>
        ) : null}
      </svg>

      {showLegend ? (
        <figcaption
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 24px',
            marginTop: 10,
            fontSize: 13,
          }}
        >
          {ears.map((ear) => (
            <span
              key={ear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 500,
                color: EAR_COLOURS[ear],
              }}
            >
              <LegendSymbol ear={ear} />
              {EAR_NAMES[ear]}
            </span>
          ))}
          {compareTo?.label ? (
            <span style={{ color: AXIS_COLOUR }}>Faded: {compareTo.label}</span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
