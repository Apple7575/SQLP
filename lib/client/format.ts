// Put each multiple-choice option (①②③④…) on its own line for readability.
export function formatChoices(text: string): string {
  return text.replace(/\s*([①-⑳])/g, '\n$1').replace(/^\n+/, '').trim()
}
