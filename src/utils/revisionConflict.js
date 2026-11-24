// Distinguish an explicit optimistic revision rejection from ambiguous transport errors.
export async function isRevisionConflict(response){
 if(response.status!==409)return false;
 try{return (await response.json())?.code==='PT409';}catch{return false;}
}
export const REVISION_CONFLICT='PT409';
export function revisionConflictError(message){return Object.assign(new Error(message),{code:REVISION_CONFLICT});}
