/** Forum links are explicit web URLs; executable, local and credential-bearing URLs stay text. */
export function forumLink(value: string): string | undefined {
  if (Array.from(value).some(character=>character.charCodeAt(0)<=32||character.charCodeAt(0)===127)) return undefined
  try {
    const url = new URL(value)
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}