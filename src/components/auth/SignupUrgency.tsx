// The note under the sign-up buttons (approved option A, 2026-11-07): every
// new account gets a Founder ID card with its own permanent founder number
// (20261022220000_permanent_founder_numbers.sql), free with sign-up.

export default function SignupUrgency() {
  return (
    <div className="signup-urgency">
      <span className="signup-urgency__card" aria-hidden="true">
        <span className="signup-urgency__card-label">Founder Nº</span>
        <span className="signup-urgency__card-number">··· ···</span>
      </span>
      <div>
        <p className="signup-urgency__title">Your Founder ID comes free with sign-up</p>
        <p className="signup-urgency__body">Every new account gets its own Founder ID card and a founder number, chosen randomly.</p>
      </div>
    </div>
  );
}
