// Fixed, bounded lighting presets; no arbitrary shaders or user-provided code.
export const MASCOT_LIGHTING=Object.freeze({
 studio:Object.freeze({key:[1,.94,.85],fill:[.72,.83,1],rim:[1,.84,.62],strength:[.64,.23,.19],ambient:.31}),
 daylight:Object.freeze({key:[1,.98,.93],fill:[.84,.93,1],rim:[.78,.90,1],strength:[.58,.29,.14],ambient:.38}),
 cinematic:Object.freeze({key:[1,.79,.56],fill:[.55,.70,1],rim:[.76,.88,1],strength:[.76,.19,.29],ambient:.23})
});
export function mascotLighting(mode){return Object.hasOwn(MASCOT_LIGHTING,mode)?MASCOT_LIGHTING[mode]:MASCOT_LIGHTING.studio;}
