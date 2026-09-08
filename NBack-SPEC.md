Number N-Back — Working Memory and Attention — Specification

1. Background: what an n-back task actually is

The n-back task is a continuous working-memory task. A sequence of stimuli is presented one item at a time and the player decides whether the current item matches the item shown N positions earlier.

This version uses numbers only.

Example for a 2-back round:

4  7  4  2  9  2
      ↑        ↑
    match    match

The comparison is always against the item exactly N positions back, not simply whether a number appeared earlier.

The task primarily exercises working-memory updating, sustained attention, and response control.

Design decision this implies for the app

The app presents each number as a flipping playing card, laid out in a row alongside the trailing
N cards from earlier in the sequence — so the player can see exactly how many steps back N is.
Only the current card (the one being answered) is face-up; the N history cards sit face-down,
their content already hidden again, so recalling what's under them — not re-checking by eye — is
still the actual task. The row is a spatial memory aid for *how far back* to think, not a way to
skip remembering *what* was there.

For each scored stimulus the player answers:





MATCH when the current number equals the number N positions earlier



NO MATCH when it does not

The first N stimuli cannot be targets because there is not yet enough history for comparison. They are presented normally but do not require an answer.



2. Difficulty

Difficulty is defined primarily by N.







Difficulty



Task



Meaning





Medium / Classic



2-back



Compare with two numbers earlier





Hard



3-back



Compare with three numbers earlier





Very Hard



4-back



Compare with four numbers earlier

2-back is the reference / Classic mode.

The number pool for v1 is:

1 2 3 4 5 6 7 8 9

All difficulties use the same pool. Difficulty comes from working-memory load rather than larger numbers.



3. Round design







Difficulty



N



Scored trials





Medium / Classic



2



40





Hard



3



50





Very Hard



4



60

The initial N setup stimuli are additional and unscored.

total stimuli = N + scored trials

A round is not time-limited. It ends after all scored stimuli have been answered.

Use a 3-2-1 countdown before starting.



4. Target generation

Approximately 30% of scored trials are true n-back matches.

Targets are deliberately generated instead of relying on a completely random sequence. This keeps the number of targets stable between rounds.

Generation:





Calculate the target count from the scored-trial count.



Randomly distribute target positions.



At a target, copy the number from N positions earlier.



At a non-target, explicitly select a number different from the number N positions earlier.



Avoid obvious long repetitive patterns where practical.

Example:

40 scored trials × 30% = 12 targets

The generated sequence must be validated before play so accidental matches cannot change the intended target ratio.



5. Interaction

Each scored stimulus requires exactly one response:

MATCH
NO MATCH

Mobile layout:

        7

   NO MATCH     MATCH

Desktop may additionally support:

← / N / 1   = No Match
→ / M / 2   = Match

Button positions remain fixed throughout every round.

Once answered:





record the response and reaction time



show brief feedback



wait for the inter-stimulus gap



show the next number

Answers cannot be changed. Multiple taps/clicks must not submit multiple responses.



6. Timing

The stimulus remains visible until the player responds. V1 is therefore self-paced.

Reaction time begins when the stimulus appears and ends when the response is registered.

After an answer, use approximately:

300 ms

of blank inter-stimulus time.

Use performance.now() rather than Date.now() and store durations internally in milliseconds.

Self-paced presentation keeps N as the main difficulty variable. Fixed-rate presentation can be added later.



7. Response classification







Actual



Player response



Classification





Match



Match



Hit





Match



No Match



Miss





Non-match



Match



False Alarm





Non-match



No Match



Correct Rejection

Store this classification for every scored trial.



8. Metrics

Per scored trial log:





stimulus index



current number



number N positions earlier



actual match / non-match



player response



hit / miss / false alarm / correct rejection



correct / incorrect



reaction time in ms

End-of-round summary:





Accuracy



Correct answers



Wrong answers



Hits



Misses



False alarms



Correct rejections



Average response time



Median response time



Best score for this difficulty

accuracy = correct responses / scored trials × 100

Primary average and median RT statistics use correct responses only. Very fast incorrect guesses should not make performance appear faster.



9. Score

Keep cognitive measurements separate from the game score.

Primary measurements are:

Accuracy
Hits
Misses
False alarms
Median correct RT

Simple game score:

score =
  hits × 100
  + correct_rejections × 25
  - misses × 50
  - false_alarms × 75

False alarms receive a slightly larger penalty to discourage repeatedly pressing MATCH.

Reaction time does not affect the v1 score.

Results should visually separate Performance from N-Back Metrics.



10. Personal best

Best results are tracked separately for each N.

Primary personal best = highest score.

Tie-breakers:





higher accuracy



lower median correct RT

Do not compare scores across different N levels.



11. Persistence

Use browser localStorage.

nback:best:1
nback:best:2
nback:best:3
nback:best:4

nback:history:<n>

Best/history entries store:

{
  score,
  accuracy,
  hits,
  misses,
  falseAlarms,
  correctRejections,
  avgRT,
  medianRT,
  date
}

Keep the last 20 completed rounds per N level.

No backend/database is required.



12. Architecture

Keep the architecture consistent with the Stroop and Schulte projects:





Vue 3 Composition API



Vite



Single-page application



browser localStorage



mobile-first



no backend/API



single Docker Compose development service



node:20-alpine



Vite port 5173



bind-mounted source with hot reload



${DOCKER_UID:-1000}:${DOCKER_GID:-1000} container user

Suggested structure:

NBack/
├── SPEC.md
├── docker-compose.yml
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.js
    ├── App.vue
    ├── components/
    │   ├── MainMenu.vue
    │   ├── AboutPage.vue
    │   ├── HistoryPage.vue
    │   ├── GameScreen.vue
    │   ├── ResultsScreen.vue
    │   └── ResponseButtons.vue
    ├── composables/
    │   ├── useNBackGame.js
    │   ├── useBestScores.js
    │   └── useScoreHistory.js
    └── constants/
        └── difficulties.js

useNBackGame.js owns sequence generation, target placement, stimulus progression, timing, validation, classification, and scoring.



13. Mobile-first UX

During play keep the interface deliberately minimal:

2-BACK                         18 / 40

                7

        NO MATCH      MATCH

Requirements:





large centered number



large thumb-friendly buttons



no scrolling



no decorative stimulus animations



fixed button positions



disable accidental text selection



avoid double-tap zoom where practical



progress indicator is secondary



reaction-time timer is not shown live



desktop supports mouse and keyboard

The hidden live RT avoids distracting the player or encouraging speed at the expense of memory accuracy.



14. Feedback

After a response show brief feedback:

✓

or

✕

Do not explain the mistake during the sequence because that interrupts working-memory continuity.

Detailed information belongs on Results.



15. About / How to Play

Explain the task using a 2-back example:

4   7   4   2   9   2
        ↑           ↑
      MATCH       MATCH



In 2-back, compare the current number with the number shown two positions earlier. Press MATCH only when they are the same.

Include untimed practice examples for 2-back, 3-back, and 4-back.

Practice results are never stored.



16. History

History is separated by N level.

Show:





personal best score



latest score



accuracy



median correct RT



hits / misses



false alarms



last 20 rounds



score trend



accuracy trend

Long-term comparisons should be made within the same N level.

2-back is the Classic/default longitudinal reference.



17. Sequence reproducibility and validation

Normal rounds generate new sequences.

Internally the generator should support a deterministic seed:

seed + difficulty → same sequence

This is useful for debugging and automated tests even though seeds are not exposed in the normal UI.

Validate before play:





correct sequence length



exact target count



every target is a real n-back match



every non-target is not an accidental match



first N positions are unscored setup stimuli



18. Future changes

Not part of v1:





fixed-rate presentation



response deadlines



adaptive n-back



5-back+



letters



shapes



colors



spatial n-back



audio n-back



dual n-back



adjustable target ratio



lure trials



CSV/JSON export



detailed RT distributions



signal-detection metrics such as d-prime



server-side persistence/sync



dark mode



i18n

Dual n-back should remain a separate future mode, not be mixed into the simple number-only v1.



19. Decisions for v1





Numbers 1–9 only.



Difficulty = 2-back, 3-back, 4-back.



2-back is Classic.



Approximately 30% targets, with stable target counts.



Generate targets deliberately and prevent accidental matches.



Every scored stimulus requires MATCH or NO MATCH.



Self-paced presentation.



300 ms inter-stimulus gap.



Use performance.now().



Track hits, misses, false alarms, and correct rejections.



Primary RT metrics use correct responses only.



Show average and median correct RT.



RT does not affect v1 score.



Response-button positions remain fixed.



Keep the last 20 rounds per N level.



Browser localStorage.



Mobile-first.



No backend/database.



Single Vite development container.



Deterministic seeded generation supported internally for testing.



