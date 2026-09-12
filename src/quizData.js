// Порядок вариантов в каждом вопросе всегда одинаковый:
// 1 -> star (Звезда), 2 -> expert (Эксперт), 3 -> blogger (Блогер), 4 -> eminence (Серый кардинал)

export const questions = [
  {
    text: 'что тебе ближе по духу?',
    options: [
      { text: 'выйти на сцену и собрать зал', archetype: 'star' },
      { text: 'выдать пост с кейсом и цифрами, который продаст сам', archetype: 'expert' },
      { text: 'снять сторис, как будто просто живешь', archetype: 'blogger' },
      { text: 'решить всё в личке, без лишнего шума', archetype: 'eminence' },
    ],
  },
  {
    text: 'как к тебе приходят клиенты?',
    options: [
      { text: 'через хайп и инфоповод', archetype: 'star' },
      { text: 'через кейсы и экспертный контент', archetype: 'expert' },
      { text: 'через доверие и то, что тебя знают', archetype: 'blogger' },
      { text: 'через рекомендации в узком кругу', archetype: 'eminence' },
    ],
  },
  {
    text: 'что бесит сильнее всего?',
    options: [
      { text: 'когда тебя не замечают', archetype: 'star' },
      { text: 'когда ты крутой профи, а не покупают', archetype: 'expert' },
      { text: 'когда аудитория молчит и не пишет', archetype: 'blogger' },
      { text: 'когда лезут в твою жизнь и просят "на камеру"', archetype: 'eminence' },
    ],
  },
  {
    text: 'твой идеальный контент-день',
    options: [
      { text: 'сцена, зал, все смотрят на тебя', archetype: 'star' },
      { text: 'рилс с разбором и цифрами', archetype: 'expert' },
      { text: 'обычный день, эмоции, жизнь на камеру', archetype: 'blogger' },
      { text: 'ни одной съемки, но сделка закрыта в переписке', archetype: 'eminence' },
    ],
  },
  {
    text: 'как хочешь, чтобы о тебе говорили?',
    options: [
      { text: '"он/она звезда, у нее свои правила"', archetype: 'star' },
      { text: '"он/она реально шарит, к ней идут за результатом"', archetype: 'expert' },
      { text: '"он/она свой/своя, ему/ей доверяю"', archetype: 'blogger' },
      { text: '"просто так к ней не попадешь, но если попал, всё решится"', archetype: 'eminence' },
    ],
  },
]

export const results = {
  star: {
    title: 'Звезда',
    image: '/images/star.png',
  },
  expert: {
    title: 'Эксперт',
    image: '/images/expert.png',
  },
  blogger: {
    title: 'Блогер',
    image: '/images/blogger.png',
  },
  eminence: {
    title: 'Серый кардинал',
    image: '/images/eminence.png',
  },
}
