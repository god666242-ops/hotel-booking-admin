// Logo files live in /public:
//   /purebook-logo.svg        (colour, for light backgrounds)
//   /purebook-logo-white.svg  (white wordmark, for dark backgrounds)
export default function Logo({ light = false, className = 'h-9' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={light ? '/purebook-logo-white.svg' : '/purebook-logo.svg'}
      alt="PureBook"
      width={303}
      height={64}
      className={`${className} w-auto select-none`}
      draggable={false}
    />
  );
}
