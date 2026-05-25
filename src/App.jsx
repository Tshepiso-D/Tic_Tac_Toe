import { useReducer, useEffect, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

// ─── Game Logic Helpers ───────────────────────────────────────────────────────

function computeWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function isDraw(board) {
  return board.every(Boolean) && !computeWinner(board);
}

// Minimax AI
function minimax(board, isMaximizing, depth = 0) {
  const result = computeWinner(board);
  if (result) return result.winner === "O" ? 10 - depth : depth - 10;
  if (board.every(Boolean)) return 0;

  const moves = board.map((v, i) => (!v ? i : null)).filter((i) => i !== null);

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of moves) {
      const next = [...board];
      next[i] = "O";
      best = Math.max(best, minimax(next, false, depth + 1));
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of moves) {
      const next = [...board];
      next[i] = "X";
      best = Math.min(best, minimax(next, true, depth + 1));
    }
    return best;
  }
}

function getBestMove(board) {
  const moves = board.map((v, i) => (!v ? i : null)).filter((i) => i !== null);
  let bestScore = -Infinity;
  let bestMove = moves[0];
  for (const i of moves) {
    const next = [...board];
    next[i] = "O";
    const score = minimax(next, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  board: Array(9).fill(null),
  currentPlayer: "X",
  winner: null,
  winLine: null,
  isDraw: false,
  scores: { X: 0, O: 0, draws: 0 },
  vsComputer: false,
  history: [Array(9).fill(null)],
  stepNumber: 0,
};

function gameReducer(state, action) {
  switch (action.type) {
    case "MAKE_MOVE": {
      const { index } = action;
      if (state.board[index] || state.winner || state.isDraw) return state;
      if (state.vsComputer && state.currentPlayer === "O") return state;

      const newBoard = [...state.board];
      newBoard[index] = state.currentPlayer;

      const result = computeWinner(newBoard);
      const draw = !result && isDraw(newBoard);

      const newHistory = state.history.slice(0, state.stepNumber + 1);
      newHistory.push(newBoard);

      const newScores = { ...state.scores };
      if (result) newScores[result.winner] += 1;
      if (draw) newScores.draws += 1;

      return {
        ...state,
        board: newBoard,
        currentPlayer: state.currentPlayer === "X" ? "O" : "X",
        winner: result ? result.winner : null,
        winLine: result ? result.line : null,
        isDraw: draw,
        scores: newScores,
        history: newHistory,
        stepNumber: newHistory.length - 1,
      };
    }

    case "COMPUTER_MOVE": {
      if (state.winner || state.isDraw) return state;
      if (state.currentPlayer !== "O" || !state.vsComputer) return state;

      const move = getBestMove(state.board);
      const newBoard = [...state.board];
      newBoard[move] = "O";

      const result = computeWinner(newBoard);
      const draw = !result && isDraw(newBoard);

      const newHistory = state.history.slice(0, state.stepNumber + 1);
      newHistory.push(newBoard);

      const newScores = { ...state.scores };
      if (result) newScores[result.winner] += 1;
      if (draw) newScores.draws += 1;

      return {
        ...state,
        board: newBoard,
        currentPlayer: "X",
        winner: result ? result.winner : null,
        winLine: result ? result.line : null,
        isDraw: draw,
        scores: newScores,
        history: newHistory,
        stepNumber: newHistory.length - 1,
      };
    }

    case "RESET": {
      return {
        ...INITIAL_STATE,
        scores: state.scores,
        vsComputer: state.vsComputer,
        history: [Array(9).fill(null)],
        stepNumber: 0,
      };
    }

    case "TOGGLE_VS_COMPUTER": {
      return {
        ...INITIAL_STATE,
        vsComputer: !state.vsComputer,
        scores: { X: 0, O: 0, draws: 0 },
      };
    }

    case "JUMP_TO": {
      const { step } = action;
      const board = state.history[step];
      const result = computeWinner(board);
      const draw = !result && isDraw(board);
      const xMoves = board.filter((v) => v === "X").length;
      const oMoves = board.filter((v) => v === "O").length;
      return {
        ...state,
        board,
        stepNumber: step,
        currentPlayer: xMoves > oMoves ? "O" : "X",
        winner: result ? result.winner : null,
        winLine: result ? result.line : null,
        isDraw: draw,
      };
    }

    default:
      return state;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Square({ value, index, isWinning, isDisabled, onClick }) {
  const base = {
    width: "100%",
    aspectRatio: "1",
    border: "none",
    background: "none",
    cursor: isDisabled || value ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "clamp(1.8rem, 6vw, 2.6rem)",
    fontWeight: 700,
    fontFamily: "'Georgia', serif",
    letterSpacing: "-1px",
    transition: "background 0.15s, transform 0.1s",
    borderRadius: 8,
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  };

  return (
    <button
      style={{
        ...base,
        color: value === "X" ? "#1a1a2e" : "#9b2226",
        background: isWinning ? "rgba(155,34,38,0.08)" : "transparent",
        transform: isWinning ? "scale(1.08)" : "scale(1)",
      }}
      className={!value && !isDisabled ? "sq-hover" : ""}
      onClick={onClick}
      aria-label={value ? `${value} at square ${index + 1}` : `Square ${index + 1}, empty`}
      disabled={isDisabled || !!value}
    >
      {value}
    </button>
  );
}

function Scoreboard({ scores, vsComputer }) {
  const item = (label, val, accent) => (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif", color: accent }}>
        {val}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e8e0d4", paddingBottom: 16 }}>
      {item("You (X)", scores.X, "#1a1a2e")}
      <div style={{ width: 1, background: "#e8e0d4" }} />
      {item("Draws", scores.draws, "#888")}
      <div style={{ width: 1, background: "#e8e0d4" }} />
      {item(vsComputer ? "Computer" : "O", scores.O, "#9b2226")}
    </div>
  );
}

function MoveHistory({ history, stepNumber, dispatch }) {
  if (history.length <= 1) return null;
  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #e8e0d4", paddingTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 10 }}>
        Move History
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {history.map((_, step) => (
          <button
            key={step}
            className="history-btn"
            style={{
              padding: "3px 10px",
              fontSize: 12,
              border: "1px solid",
              borderColor: step === stepNumber ? "#1a1a2e" : "#d0c8bc",
              borderRadius: 4,
              background: step === stepNumber ? "#1a1a2e" : "transparent",
              color: step === stepNumber ? "#fff" : "#666",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
            onClick={() => dispatch({ type: "JUMP_TO", step })}
          >
            {step === 0 ? "Start" : `#${step}`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function TicTacToe() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const { board, currentPlayer, winner, winLine, isDraw: draw, scores, vsComputer, history, stepNumber } = state;

  // Trigger computer move after player's move
  useEffect(() => {
    if (!vsComputer || currentPlayer !== "O" || winner || draw) return;
    const timer = setTimeout(() => dispatch({ type: "COMPUTER_MOVE" }), 420);
    return () => clearTimeout(timer);
  }, [vsComputer, currentPlayer, winner, draw, board]);

  const handleSquareClick = useCallback(
    (i) => dispatch({ type: "MAKE_MOVE", index: i }),
    []
  );

  const statusText = winner
    ? `${winner === "X" ? (vsComputer ? "You win!" : "X wins!") : vsComputer ? "Computer wins!" : "O wins!"}`
    : draw
    ? "It's a draw!"
    : vsComputer && currentPlayer === "O"
    ? "Computer is thinking…"
    : `Next: ${currentPlayer}`;

  const isThinking = vsComputer && currentPlayer === "O" && !winner && !draw;
  const gameOver = !!winner || draw;

  return (
    <>
      <style>{`
        .sq-hover:hover { background: rgba(0,0,0,0.04) !important; }
        .reset-btn:hover { background: #1a1a2e !important; color: #fff !important; }
        .mode-btn:hover { opacity: 0.75; }
        body { background: #faf7f2; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#faf7f2",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              letterSpacing: "-0.5px",
              color: "#1a1a2e",
              margin: 0,
            }}
          >
            Tic-Tac-Toe
          </h1>
          <p style={{ fontSize: 13, color: "#aaa", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            classic · clean · competitive
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 2px 24px rgba(0,0,0,0.07)",
            padding: "clamp(20px, 5vw, 36px)",
            width: "100%",
            maxWidth: 420,
          }}
        >
          <Scoreboard scores={scores} vsComputer={vsComputer} />

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["2 Players", "vs Computer"].map((label, i) => {
              const active = i === 1 ? vsComputer : !vsComputer;
              return (
                <button
                  key={label}
                  className="mode-btn"
                  onClick={() => { if (!active) dispatch({ type: "TOGGLE_VS_COMPUTER" }); }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    fontSize: 13,
                    border: "1px solid",
                    borderColor: active ? "#1a1a2e" : "#d0c8bc",
                    borderRadius: 8,
                    background: active ? "#1a1a2e" : "transparent",
                    color: active ? "#fff" : "#888",
                    cursor: active ? "default" : "pointer",
                    fontWeight: active ? 500 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Status */}
          <div
            style={{
              textAlign: "center",
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: "clamp(1rem, 3.5vw, 1.15rem)",
                fontFamily: "Georgia, serif",
                color: winner ? "#9b2226" : draw ? "#888" : "#1a1a2e",
                fontWeight: winner || draw ? 600 : 400,
                fontStyle: isThinking ? "italic" : "normal",
              }}
            >
              {statusText}
            </span>
          </div>

          {/* Board */}
          <div
            role="grid"
            aria-label="TicTacToe board"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
              border: "2px solid #1a1a2e",
              borderRadius: 12,
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            {board.map((value, i) => {
              const row = Math.floor(i / 3);
              const col = i % 3;
              return (
                <div
                  key={i}
                  role="gridcell"
                  style={{
                    borderRight: col < 2 ? "1.5px solid #1a1a2e" : "none",
                    borderBottom: row < 2 ? "1.5px solid #1a1a2e" : "none",
                    display: "flex",
                  }}
                >
                  <Square
                    value={value}
                    index={i}
                    isWinning={winLine?.includes(i)}
                    isDisabled={gameOver || isThinking}
                    onClick={() => handleSquareClick(i)}
                  />
                </div>
              );
            })}
          </div>

          {/* Restart */}
          <button
            className="reset-btn"
            onClick={() => dispatch({ type: "RESET" })}
            style={{
              width: "100%",
              padding: "11px 0",
              fontSize: 14,
              border: "1.5px solid #1a1a2e",
              borderRadius: 8,
              background: "transparent",
              color: "#1a1a2e",
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.04em",
              transition: "all 0.15s",
            }}
          >
            New Game
          </button>

          <MoveHistory history={history} stepNumber={stepNumber} dispatch={dispatch} />
        </div>

        <p style={{ fontSize: 12, color: "#ccc", marginTop: 20 }}>
          Computer uses minimax — good luck!
        </p>
      </div>
    </>
  );
}
