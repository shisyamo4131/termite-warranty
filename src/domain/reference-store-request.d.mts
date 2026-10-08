export class ReferenceScopeChangedError extends Error {}
export function createReferenceRequestGuard(): {
 capture():number;isCurrent(token:number):boolean;assertCurrent(token:number):void;invalidate():void;
 run<T>(invoke:()=>Promise<T>):Promise<T>
}
