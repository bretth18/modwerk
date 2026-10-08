import {writeFile,lstat} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fetchReleaseApproval} from './release-approval.mjs'
const destination=process.argv[2]&&resolve(process.argv[2])
if(!destination)throw new Error('Usage: node scripts/verify-merge-approval.mjs new-approval-file')
if(await lstat(destination).catch(()=>null))throw new Error('Approval output already exists.')
const approval=await fetchReleaseApproval(process.env.GITHUB_REPOSITORY??'',process.env.GITHUB_SHA??'',Number(process.env.OCTAMOD_APPROVER_ID),process.env.GITHUB_TOKEN??'')
await writeFile(destination,JSON.stringify(approval,null,2)+'\n',{flag:'wx'})
console.log('GitHub release authorization verified for PR #'+approval.pullRequest+' at '+approval.sourceCommit+'.')
