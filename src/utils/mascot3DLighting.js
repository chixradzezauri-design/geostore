// Fixed, bounded lighting presets; no arbitrary shaders or user-provided code.
export const MASCOT_LIGHTING=Object.freeze({
 studio:Object.freeze({key:[1,.94,.85],fill:[.72,.83,1],rim:[1,.84,.62],strength:[.62,.29,.20],ambient:.34}),
 daylight:Object.freeze({key:[1,.98,.93],fill:[.84,.93,1],rim:[.78,.90,1],strength:[.56,.33,.16],ambient:.38}),
 cinematic:Object.freeze({key:[1,.79,.56],fill:[.55,.70,1],rim:[.76,.88,1],strength:[.70,.24,.27],ambient:.29})
});
export function mascotLighting(mode){return Object.hasOwn(MASCOT_LIGHTING,mode)?MASCOT_LIGHTING[mode]:MASCOT_LIGHTING.studio;}
