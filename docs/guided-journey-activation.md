# Production activation correction

Supersedes the PostHog activation instructions in founder-guide-release.md.
The owner requested Guided Journey live for signed-in users. It is enabled by
default after authentication resolves, independently of analytics consent or
availability. Marketing, onboarding and route exclusions are unchanged.

Rollback: set VITE_GUIDED_JOURNEY_ENABLED=false and redeploy, or restore frontend
commit 83728f13784b19595203a541ef7296f939f59d88. No database rollback is needed.
Both Pulse migrations and chatbot-streaming v1136 have been verified deployed.
Authenticated chat, isolation and billing acceptance remain separate checks.
