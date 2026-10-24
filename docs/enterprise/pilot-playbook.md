# 30-Day Founder Validation Pilot: team playbook

For the Creatives Takeover team running a pilot. It covers what the software doesn't yet do on its own: reminders, the weekly summary and the final report. Written 2026-10-23 alongside the pilot readiness audit.

What the product does for the pilot (from migration `20261023120000_cohort_pilot_readiness`):
- **Program dashboard** (`/admin/cohorts/:id` for us, `/dashboard` for program staff). Interviews, evidence and experiments count only what each founder did **since joining**. "Verified" means the platform observed it, or a customer action or payment backs it. Founder reports and imported rows are never counted as verified.
- **Founders' plan for the pilot.** Set "Founders' plan" on the cohort (Rising by default). Founders get it from the start date to the end date, then return to their own plan automatically. Rising opens First Customer Proof, the demand test. **It does not add credits.**
- **Leaving.** A founder can leave the cohort from their dashboard, which stops sharing at once.

---

## 1. Dry run (one week before kickoff)

Do this with test accounts **in production**, since cohort mode has never run there. Delete the test cohort afterwards.

1. `/admin/cohorts`: create "Dry run", 30 days, founders' plan Rising.
2. Open the founder link in a private window and sign up as test founder A. Confirm the consent text, then join.
3. As founder A: check the cohort view shows "Your program gives you the Rising plan until …". Open First Customer Proof and confirm it isn't locked. Tick a task, log a PMF Lab interview, start one market experiment, send the week check-in.
4. Repeat with founder B, but don't do anything after joining.
5. Open the staff link as a third test account. The program dashboard should show A with 1 interview and 1 experiment, and B with no activity.
6. Export the CSV. Check the "Stage at join", "Experiments run" and "Check-ins" columns.
7. As founder B: "Leave cohort". Reload the staff dashboard; B should be gone.
8. Fill the final report template (section 4) from the CSV to time it.
9. Mark the cohort completed, then click "New links" so the test links stop working.

If any step fails, fix it before kickoff.

## 2. Kickoff (day 1)

- [ ] Create the cohort: program name, cohort name, dates, check-in day, founders' plan.
- [ ] Send the **founder link** to the program contact for their founders. Send the **staff link** only to the program contact.
- [ ] Ask the program for their funder's or university's report template, if they have one.
- [ ] Kickoff call: each founder joins in the call, sets up one project (combined numbers if they use two), and starts the ICP Builder.
- [ ] **Plan summary consent.** The program doesn't see plan contents in the product. Ask each founder in writing whether we may include their validation plan summary (ideal customer, problem, assumptions, demand test) in the program's report. Record yes or no per founder.
- [ ] Note each founder's stage and credit balance at kickoff.

## 3. Every week

**On the check-in day, morning:** remind founders without a check-in. The program dashboard shows a "–" in the Week column.

> Subject: Your week {N} check-in for {Program}
>
> Hi {first name},
>
> It's check-in day. Two minutes on your dashboard: what you finished, what's blocking you, your goals for next week and anything you need help with. {Program} reads these, so the more specific, the more useful.
>
> Open your dashboard: https://creatives-takeover.com/dashboard
>
> If you spoke to customers this week, log each conversation in PMF Lab so it counts.
>
> {Your name}

**Two days later:** message or call anyone still missing. Use the attention flags (quiet for 7 days, missed check-in, blocker, asked for help, no customer profile, no interview by week 2, no experiment by week 3).

**End of the week:** send the program contact the weekly summary.

> Subject: {Program} pilot, week {N}: summary
>
> Hi {contact},
>
> Week {N} of {total}. {checked in}/{founders} startups checked in.
>
> - **Customer profiles ready:** {x}/{founders}
> - **Interviews logged this pilot:** median {x} per startup ({verified} verified)
> - **Experiments run:** {x}
> - **Decisions reached:** {x}
>
> **Needs your attention**
> - {Startup}: {reason, e.g. blocked on access to bank partners. Could you intro someone?}
>
> **Highlights**
> - {Startup}: {one concrete finding from their check-in}
>
> The live dashboard and CSV: {staff link}
>
> {Your name}

Also check credit balances. The pilot plan doesn't add credits, so top up anyone about to run out.

## 4. Final report (day 30)

One document per cohort. Numbers come from the CSV export; findings and next steps come from check-ins and the final call. Follow the program's template if they gave one.

1. **Cohort summary.** Founders who took part; check-in rate; customer profiles ready; interviews (verified / total); experiments run; decisions reached. Stage at join compared with stage now.
2. **One page per startup.**
   - Stage at join, then stage now
   - Validation plan summary (only with the founder's written yes)
   - Interviews and evidence (verified / total), experiments run, decisions
   - Key finding (one or two sentences, from their check-ins)
   - Decision: Build, Narrow, Pivot or Stop, and the reason
   - Recommended next step
3. **Method.** How numbers were counted (since joining; verified vs founder reported). Include: *"Thirty days won't prove product-market fit, guarantee paying customers or make a startup investment-ready. They give every founder a disciplined process and documented evidence."*
4. **Appendix.** The CSV.

Never present founder-reported numbers as verified. Never imply investment or funding outcomes.

## 5. After the pilot

- [ ] Mark the cohort completed in `/admin/cohorts`, then click **New links**.
- [ ] Founders return to their own plan automatically after the end date. Email them: they keep their account, their work and the free plan.
- [ ] Ask the program contact about extending to the full cohort.
