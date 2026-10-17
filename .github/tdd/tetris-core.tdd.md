# TDD evidence: Tetris core refactor

## Source plan

Journeys and acceptance criteria were derived from the existing gameplay code and the reported bugs. No external plan file was used.

## User journeys

- As a player, I want pieces to stop at walls and the floor so the board cannot be corrupted.
- As a player, I want completed rows to disappear together so consecutive lines are scored correctly.
- As a player, I want rotation and hold to work with independent piece state so gameplay is predictable.
- As a player, I want a game-over state to reset cleanly so a new game starts from an empty board.

## RED evidence

- Command: `npm test`
- Result: failed with `ERR_MODULE_NOT_FOUND` for the not-yet-created `src/js/game/board.js` module.
- Interpretation: the regression suite was executed before the engine implementation and failed at the intended missing implementation boundary.
- Checkpoint: `a4f7266 test: add regression coverage for core gameplay`.

## GREEN evidence

- Command: `npm test`
- Result: 10 tests passed, 0 failed.
- Command: `npm run lint`
- Result: StandardJS completed with no findings.
- Command: `npm test -- --experimental-test-coverage`
- Result: 95.60% line coverage, 84.42% branch coverage, 100% function coverage.
- Command: `npm audit`
- Result: 0 vulnerabilities after updating the development bundler to Vite 8.3.4.

## Test specification

| # | Guarantee | Test | Result |
|---|---|---|---|
| 1 | Board dimensions and empty cells are stable | `empty board has the configured dimensions` | PASS |
| 2 | Above-board cells are allowed while walls and floor collide | `collision ignores cells above the board but rejects walls and floor` | PASS |
| 3 | Adjacent completed rows are removed together | `completed adjacent rows are all removed...` | PASS |
| 4 | Merge writes occupied cells without changing board dimensions | `mergePiece writes only occupied cells...` | PASS |
| 5 | Piece clones do not share mutable state | `piece clones do not share mutable shape...` | PASS |
| 6 | Rotation is clockwise and non-mutating | `rotation returns a clockwise matrix...` | PASS |
| 7 | Invalid rotation is rejected | `rotation is rejected when it would overlap...` | PASS |
| 8 | Hold accepts equal shapes and is limited to once per turn | `holding the same shaped piece...` | PASS |
| 9 | Locking advances the queue safely | `moving down locks a piece...` | PASS |
| 10 | Reset clears score, hold, board and game-over state | `resetGame returns a fresh game...` | PASS |

## Known gaps

- Browser smoke test: `http://127.0.0.1:5173/` loaded at the available 606x613 viewport, exposed all three canvas labels, exercised left, rotate and hold controls, and reported no console errors or warnings. The layout fit without vertical overflow (`bodyScrollHeight = bodyClientHeight = 613`).
- No committed screenshot baseline existed before this task, and the browser harness did not expose alternate viewport controls, so a three-breakpoint visual comparison is reported as inconclusive rather than as a pass.
- The current gameplay intentionally preserves the existing board dimensions and scoring table.
