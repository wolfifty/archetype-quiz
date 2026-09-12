import { useState, useMemo, useEffect } from 'react'
import { questions, results } from './quizData'

export default function App() {
  // Инициализация Telegram Mini App SDK (если открыто внутри Telegram)
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [])

  // answers[i] = archetype, выбранный на вопросе i. Длина массива = сколько вопросов пройдено.
  const [answers, setAnswers] = useState([])

  const step = answers.length // индекс текущего вопроса (0..questions.length)
  const isFinished = step >= questions.length

  const resultKey = useMemo(() => {
    if (!isFinished) return null
    const scores = { star: 0, expert: 0, blogger: 0, eminence: 0 }
    answers.forEach((a) => { scores[a] += 1 })
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
  }, [isFinished, answers])

  function handleChoose(archetype) {
    setAnswers((prev) => [...prev, archetype])
  }

  function handleBack() {
    setAnswers((prev) => prev.slice(0, -1))
  }

  function handleRestart() {
    setAnswers([])
  }

  if (isFinished) {
    const result = results[resultKey]
    return (
      <div className="screen result-screen">
        <img className="bg-image" src={result.image} alt={result.title} />
        <button className="restart-btn" onClick={handleRestart}>
          Пройти ещё раз
        </button>
      </div>
    )
  }

  const question = questions[step]

  return (
    <div className="screen">
      <img className="bg-image" src="/images/bg.png" alt="" />
      <div className="overlay">
        <div className="top-row">
          {step > 0 ? (
            <button className="back-btn" onClick={handleBack} aria-label="Назад">
              ←
            </button>
          ) : (
            <span />
          )}
          <span className="progress">вопрос {step + 1}/{questions.length}</span>
        </div>

        <div className="question-block">
          <h1 className="question-text">{question.text}</h1>
          <div className="options">
            {question.options.map((opt, i) => (
              <button
                key={i}
                className="option-btn"
                onClick={() => handleChoose(opt.archetype)}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
