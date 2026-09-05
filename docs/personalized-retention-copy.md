# Personalized retention copy

Generated from the production template catalog by `node scripts/preview-roadmap-retention.mjs`.

Each segment has four subjects and three bodies. Variants are alternatives for testing, not a twelve message sequence. One primary CTA is followed by preference and unsubscribe links.

## Dynamic fields

| Token | Verified source |
| --- | --- |
| `{signal}` | Quiz goal, industry or idea stage; recorded tool step; or completed roadmap stage |
| `{tool}` | Canonical name of the available next tool |
| `{topic}` | Next stage label or tool name |
| `{action}` | Canonical purpose of that tool |
| `{days}` | Whole days since actual authenticated activity |

Tool visits do not imply saved work. Saved destinations require an ownership and existence check. When no verified signal or next action exists, no email is sent.

## Quiz completed, no tool opened

Required fields: completed quiz, a quiz answer, complete tool history with zero activity.

Sample signal: Your quiz goal is validate a food delivery idea.

CTA: **Open ICP Builder**

Destination: `/icp-builder` through authenticated login.

### Subject alternatives

1. Your quiz goal, starting with {tool}
2. {tool} is your first roadmap step
3. Start your customer work in {tool}
4. One question to take into {tool}

### Body alternatives

**Body 1**

{signal} {tool} is the first tool on your roadmap. {action} Start with what you know now and use the prompts to work through the details. The link takes you straight to the tool when you sign in.

**Body 2**

{signal} Your next step is in {tool}. {action} Bring the idea you described in the quiz and work through the first prompt. You can focus on that one question before deciding what needs more thought.

**Body 3**

{signal} Open {tool} to put that context to work. {action} Use your current idea as the starting point, even if some details are still undecided. Begin with the first prompt and answer from what you already know.

## Unfinished tool

Required fields: latest unfinished tool activity, status, and timestamp; step and saved destination when verified.

Sample signal: You reached customer definition in ICP Builder.

CTA: **Continue ICP Builder**

Destination: `/icp-builder` through authenticated login.

### Subject alternatives

1. Your next step in {tool}
2. Continue the work you opened in {tool}
3. A question to revisit in {tool}
4. {tool}: pick up your next decision

### Body alternatives

**Body 1**

{signal} {action} Open the tool and work through the next question using what you know about your idea today. If something has changed since your last visit, start with that detail before moving further through the work.

**Body 2**

{signal} The next useful action is in {tool}. {action} Take one section at a time and focus on the part you can answer now. Use the link to open the tool and decide what needs your attention first.

**Body 3**

{signal} Return to {tool} with one decision you want to make. {action} Work through the relevant prompt, then check whether your answer still fits the idea you are building. That gives your next session a specific place to start.

## Completed stage

Required fields: verified stage completion and no activity in the next stage.

Sample signal: You completed Stage I. Stage II is next on your roadmap.

CTA: **Open Demo Studio**

Destination: `/demo-studio` through authenticated login.

### Subject alternatives

1. {topic} starts with {tool}
2. After your last stage: {tool}
3. Your next roadmap tool is {tool}
4. The first question in {topic}

### Body alternatives

**Body 1**

{signal} Open {tool} for the next piece of work. {action} Bring the decisions from your completed stage into the first prompt, then focus on what you need to establish next. The link opens the tool directly after sign in.

**Body 2**

{signal} Your next tool is {tool}. {action} Start with the information you already worked through and check what this stage asks you to add. You can begin with one question and use that answer to guide the rest.

**Body 3**

{signal} The next action is in {tool}. {action} Use your earlier work as context for the first prompt. Look for the decision that needs new information, then make that the focus of your next session in the tool.

## Dormant for 30 days or more

Required fields: at least 30 days without activity and verified unfinished tool, roadmap, or quiz context.

Sample signal: You reached customer definition in ICP Builder.

CTA: **Continue ICP Builder**

Destination: `/icp-builder` through authenticated login.

### Subject alternatives

1. Your roadmap still points to {tool}
2. {tool} after {days} days away
3. A specific place to restart: {tool}
4. Revisit {topic} in your roadmap

### Body alternatives

**Body 1**

{signal} It has been {days} days since your last activity. Open {tool} and check whether this is still the work you want to pursue. {action} Start with anything that has changed about your idea since you last used the platform.

**Body 2**

{signal} Your last activity was {days} days ago. The link opens {tool}, where you can revisit this part of your roadmap. {action} Take your current plans into the first question and decide what is still relevant before continuing.

**Body 3**

{signal} After {days} days away, use {tool} to review where this work stands. {action} Check the details against what you know now, then choose the next question worth answering. You can start from your current thinking about the idea.
