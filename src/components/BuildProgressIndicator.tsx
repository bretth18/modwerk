import type { BuildProgress } from '../engine/protocol'
import { Icon } from './Icon'

const steps: { phase: BuildProgress; label: string }[] = [
  { phase: 'composing', label: 'Build modules' },
  { phase: 'packing', label: 'Prepare file' },
  { phase: 'verifying', label: 'Verify file' },
]

export function BuildProgressIndicator({ phase = 'composing', finished }: { phase?: BuildProgress; finished: boolean }) {
  const currentStep = steps.findIndex(step => step.phase === phase)
  const completedSteps = finished ? steps.length : currentStep
  const status = finished ? 'All 3 steps complete' : `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].label}`

  return <div className="build-progress" role="progressbar" aria-label="Firmware build progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completedSteps} aria-valuetext={status}>
    <p className="build-progress-caption" aria-hidden="true">{finished ? 'Build complete' : `Step ${currentStep + 1} of ${steps.length}`}</p>
    <ol className="build-progress-steps" aria-hidden="true">
      {steps.map((step, index) => {
        const complete = index < completedSteps
        const active = !finished && index === currentStep
        return <li key={step.phase} className={complete ? 'is-complete' : active ? 'is-active' : undefined}>
          <span className="build-progress-track" />
          <span className="build-progress-label"><span className="build-progress-marker">{complete ? <Icon name="check" size={14} /> : index + 1}</span><span>{step.label}</span></span>
        </li>
      })}
    </ol>
  </div>
}
