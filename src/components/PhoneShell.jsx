export default function PhoneShell({ children }) {
  return (
    <div className="phone-shell">
      <div className="phone-shell__notch" aria-hidden="true" />
      {children}
    </div>
  )
}
