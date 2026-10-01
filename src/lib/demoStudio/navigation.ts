/** New targets use stable IDs; older shared demos retain numeric destinations. */
export function resolveDemoTarget(target:string|null|undefined,steps:Array<{id:string}>):number {
  const byId=steps.findIndex(step=>step.id===target);
  if(byId>=0)return byId;
  if(!target || !/^\d+$/.test(target))return -1;
  const index=Number(target);return Number.isSafeInteger(index) && index<steps.length?index:-1;
}
