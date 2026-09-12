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

  // answers[i] = архетип, выбранный на вопросе i. Длина массива = сколько вопросов пройдено.
  const [answers, setAnswers] = useState([])

  const step = answers.length // индекс текущего вопроса (0..questions.length)
  const isFinished = step >= questions.length

  const resultKey = useMemo(() => {
    if (!isFinished) return null
    const scores = { star: 0, expert: 0, blogger: 0, eminence: 0 }
    answers.forEach((a) => { scores[a] += 1 })
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
  }, [isFinished, answers])

  // Как только у нас есть результат — отправляем его на бэкенд для сохранения в БД
  useEffect(() => {
    if (!resultKey) return
    const initData = window.Telegram?.WebApp?.initData
    if (!initData) return // открыто не из Telegram — сохранять некуда, просто показываем результат

    fetch('/api/save-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, archetype: resultKey }),
    }).catch((err) => console.error('Не удалось сохранить результат:', err))
  }, [resultKey])

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
        <img className="bg-blur" src={result.image} alt="" aria-hidden="true" />
        <div className="blur-tint" />
        <div className="result-content">
          <div className="result-image-frame">
            <img className="result-image" src={result.image} alt={result.title} />
          </div>
          <div className="result-text-panel">
            <h1 className="result-title">{result.title}</h1>
            <p className="result-text">{result.text}</p>
          </div>
          <button className="restart-btn" onClick={handleRestart}>
            Пройти ещё раз
          </button>
        </div>
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
