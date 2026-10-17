import { useId } from 'react'

function CoffeePourImage() {
  return (
    <svg
      width="1670"
      height="612"
      viewBox="4 20 2180 744"
      preserveAspectRatio="none"
    >
      <image
        href="/assets/saved-solutions-coffee-pour.png"
        width="2184"
        height="778"
      />
    </svg>
  )
}

export function CoffeePourLoader() {
  const id = useId()
  const cupClip = `${id}-cup`
  const pourClip = `${id}-pour`

  return (
    <svg
      className="coffee-pour-loader"
      viewBox="0 0 1670 612"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={cupClip}>
          <path d="M0 0H630V382H770V612H0Z" />
        </clipPath>
        <clipPath id={pourClip}>
          <path d="M670 0H1670V612H780V395L690 332L714 317L722 305L718 296L670 280Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cupClip})`}>
        <CoffeePourImage />
      </g>
      <path
        className="coffee-pour-stream"
        d="M704 337C688 342 691 364 690 388"
        fill="none"
        stroke="#111111"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <g className="coffee-pour-hand">
        <g clipPath={`url(#${pourClip})`}>
          <CoffeePourImage />
        </g>
      </g>
    </svg>
  )
}
