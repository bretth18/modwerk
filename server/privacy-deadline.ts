/** GDPR Article 12: one calendar month, clamped to the last day of a shorter month. */
export function privacyDeadline(created:string){
  const date=new Date(created.includes('T')?created:created.replace(' ','T')+'Z')
  if(!Number.isFinite(date.getTime()))throw new Error('Invalid privacy request date.')
  const day=date.getUTCDate()
  date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+1)
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
  date.setUTCDate(Math.min(day,last))
  return date.toISOString()
}
export function withPrivacyDeadline<T extends {created_at:string;status?:string}>(request:T){
  const responseDueAt=privacyDeadline(request.created_at)
  return {...request,responseDueAt,responseOverdue:!!request.status&&['requested','reviewing'].includes(request.status)&&Date.parse(responseDueAt)<Date.now()}
}
