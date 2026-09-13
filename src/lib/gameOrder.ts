import type { GameWord } from './words'
/** 같은 낱말은 한 번만 남기고, 매 게임 시작마다 무작위 순서로 섞습니다. */
export function shuffleUniqueWords(words: GameWord[]) {
  const uniqueWords = Array.from(
    new Map(words.map(word => [word.word.trim(), word])).values(),
  )
  for (let index = uniqueWords.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[uniqueWords[index], uniqueWords[randomIndex]] = [uniqueWords[randomIndex], uniqueWords[index]]
  }
  return uniqueWords
}
