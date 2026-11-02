# Private file access: incident assessment record

**Status:** Open for Javier's decision. This record separates known facts from
unverified access and must be stored with restricted incident evidence.

## Known from the 1 November 2026 repository tracker

- The audit found a Storage read policy that allowed a signed-in member to
  list and download other members' files, including CVs, pitch decks, and
  journey evidence. The tracker counts 44 CVs; verify the current affected
  object and user counts from production.
- `20261102100000_security_lockdown.sql` contains the proposed policy fix.
  Its application to production was still listed as pending at commit
  `bc4ff91`. Production status must be checked in the migration ledger.
- The tracker says available Storage logs covered about one day and could not
  establish whether earlier unauthorized reads occurred.

## Evidence and decision to complete

| Item | Record |
|---|---|
| First awareness time, in UTC and source | Pending |
| Start and end of exposure | Pending |
| Production policy and migration evidence | Pending |
| Files and people potentially affected, by category | Pending |
| Storage/API/auth log preservation and review | Pending |
| Evidence of access or absence of evidence; confidence limits | Pending |
| Likely risk to individuals and reasons | Pending |
| ICO notification decision, decision-maker, time, reference | Javier: pending |
| Individual notification decision, decision-maker, time | Javier: pending |
| Containment and validation evidence | Pending |
| Follow-up actions and owner | Pending |

Assess promptly: if a personal-data breach is likely to risk individuals'
rights and freedoms, the ICO requires notification without undue delay and,
where feasible, within 72 hours of awareness. A high risk also requires
notifying affected individuals without undue delay. Record the assessment
even if the decision is not to notify. Seek UK privacy counsel when the
threshold is uncertain.

Reference: https://ico.org.uk/pdb
