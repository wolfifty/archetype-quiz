// Serverless-функция на Vercel: /api/webhook
// Принимает обновления от Telegram (через setWebhook) и отвечает на /start.
//
// Обязательные переменные окружения (задаются в Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
//   SITE_URL           — публичный адрес этого же сайта, например https://archetype-quiz.vercel.app
//                        (без слэша на конце)

const START_TEXT = `стоп! прежде чем говорить о деньгах, узнай, кто ты❤️‍🔥

у большинства людей нет проблем с контентом, у них проблема в том, что они играют не свою роль.

4 архетипа. 5 вопросов. 2 минуты. жми, и разберемся, через что ты продаешь — звездность, статус, мозг или жизнь?`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).send('ok')
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const siteUrl = process.env.SITE_URL

  if (!token || !siteUrl) {
    console.error('Не заданы TELEGRAM_BOT_TOKEN или SITE_URL')
    res.status(200).send('ok') // Telegram всё равно ждёт 200, иначе будет долбить повторами
    return
  }

  const update = req.body
  const message = update?.message

  try {
    if (message?.text === '/start') {
      const chatId = message.chat.id

      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: `${siteUrl}/images/bg.png`,
          caption: START_TEXT,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Пройти тест',
                  web_app: { url: siteUrl },
                },
              ],
            ],
          },
        }),
      })
    }
  } catch (err) {
    console.error('Ошибка обработки апдейта:', err)
  }

  res.status(200).send('ok')
}
