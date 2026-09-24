import {
  forwardRef,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MutableRefObject,
} from 'react'

type ClearableInputProps = InputHTMLAttributes<HTMLInputElement>

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 5.08A10.94 10.94 0 0 1 12 5c7 0 10.5 7 10.5 7a13.7 13.7 0 0 1-3.15 4.06M6.6 6.62C3.68 8.5 1.5 12 1.5 12S5 19 12 19a10.6 10.6 0 0 0 4.24-.86" />
      <path d="M9.9 9.9a3 3 0 0 0 4.24 4.24" />
    </svg>
  )
}

export const ClearableInput = forwardRef<HTMLInputElement, ClearableInputProps>(
  function ClearableInput(
    { type = 'text', onChange, className, ...props },
    forwardedRef,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [hasValue, setHasValue] = useState(
      Boolean(props.defaultValue ?? props.value),
    )
    const [isVisible, setIsVisible] = useState(false)
    const isPassword = type === 'password'

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(forwardedRef as MutableRefObject<HTMLInputElement | null>).current =
          node
      }
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      setHasValue(event.target.value.length > 0)
      onChange?.(event)
    }

    const handleClear = () => {
      const input = inputRef.current
      if (!input) return
      input.value = ''
      input.focus()
      setHasValue(false)
      onChange?.({ target: input } as ChangeEvent<HTMLInputElement>)
    }

    const wrapperClassName = isPassword
      ? 'clearable-input clearable-input-password'
      : 'clearable-input'

    return (
      <span className={wrapperClassName}>
        <input
          {...props}
          ref={setRefs}
          type={isPassword && isVisible ? 'text' : type}
          onChange={handleChange}
          className={className}
        />
        {(hasValue || isPassword) && (
          <span className="clearable-input-actions">
            {hasValue && (
              <button
                type="button"
                className="clearable-input-clear"
                aria-label="입력값 지우기"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleClear}
              >
                <XIcon />
              </button>
            )}
            {isPassword && (
              <button
                type="button"
                className="clearable-input-toggle"
                aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 표시'}
                aria-pressed={isVisible}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsVisible((prev) => !prev)}
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            )}
          </span>
        )}
      </span>
    )
  },
)
