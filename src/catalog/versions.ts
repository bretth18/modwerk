// SPDX-License-Identifier: GPL-3.0-or-later OR Elastic-2.0
// Copyright (c) 2026 Jannik Aßfalg (repeat98)
// Semantic ordering used by source-change validation; build metadata is disallowed.
export function compareModuleVersions(next: string, previous: string): number {
  const parse=(value:string)=>{const match=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value);if(!match)throw new Error('Invalid module semantic version: '+value);const numbers=match.slice(1,4).map(Number);if(numbers.some(v=>!Number.isSafeInteger(v)))throw new Error('Module version number is too large');const pre=match[4]?.split('.')??[];if(pre.some(v=>/^\d+$/.test(v)&&v.length>1&&v.startsWith('0')))throw new Error('Numeric prerelease identifiers cannot have leading zeros');return {numbers,pre}}
  const a=parse(next),b=parse(previous)
  for(let i=0;i<3;i++)if(a.numbers[i]!==b.numbers[i])return Math.sign(a.numbers[i]-b.numbers[i])
  if(!a.pre.length||!b.pre.length)return !a.pre.length?(!b.pre.length?0:1):-1
  for(let i=0;i<Math.max(a.pre.length,b.pre.length);i++){
    if(a.pre[i]===undefined)return -1;if(b.pre[i]===undefined)return 1
    const x=a.pre[i],y=b.pre[i];if(x===y)continue
    const xn=/^\d+$/.test(x),yn=/^\d+$/.test(y)
    if(xn&&yn){const aa=BigInt(x),bb=BigInt(y);return aa>bb?1:-1}
    if(xn!==yn)return xn?-1:1
    return x>y?1:-1
  }
  return 0
}
