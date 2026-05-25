// app/utils/text-normalization.ts

export function normalizeSentence(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase();

  // 1. 常见缩写还原 (处理带撇号和不带撇号的常见误打)
  const contractions: Record<string, string> = {
    "i'm": "i am", "im": "i am",
    "i'll": "i will", "ill": "i will", // 注意 ill 可能会和生病混淆，但精听上下文通常是 i will
    "don't": "do not", "dont": "do not",
    "can't": "cannot", "cant": "cannot",
    "won't": "will not", "wont": "will not",
    "it's": "it is", "its": "it is",
    "that's": "that is", "thats": "that is",
    "we're": "we are", "were": "we are",
    "you're": "you are", "youre": "you are",
    "they're": "they are", "theyre": "they are",
    "isn't": "is not", "isnt": "is not",
    "aren't": "are not", "arent": "are not",
    "didn't": "did not", "didnt": "did not",
    "doesn't": "does not", "doesnt": "does not",
    "haven't": "have not", "havent": "have not",
    "hasn't": "has not", "hasnt": "has not",
    "i've": "i have", "ive": "i have",
  };

  for (const [contract, expanded] of Object.entries(contractions)) {
    const regex = new RegExp(`\\b${contract}\\b`, 'g');
    s = s.replace(regex, expanded);
  }

  // 2. 数字映射到英文单词
  const numberWords: Record<string, string> = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten'
  };
  for (const [num, word] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${num}\\b`, 'g');
    s = s.replace(regex, word);
  }

  // 3. 剥离所有非常规标点符号（仅保留字母、数字和空格）
  s = s.replace(/[^a-z0-9\s]/g, '');

  // 4. 清理多余空格
  return s.replace(/\s+/g, ' ').trim();
}